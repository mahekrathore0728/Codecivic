const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../config');

/**
 * Validates file magic bytes against known image signatures.
 * This prevents MIME spoofing attacks where a malicious file is renamed to .jpg.
 */
const IMAGE_MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [Buffer.from('RIFF')], // WebP starts with RIFF....WEBP
};

function validateMagicBytes(filePath, declaredMimeType) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // Check JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // Check PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // Check WebP: RIFF....WEBP
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;

    return false;
  } catch {
    return false;
  }
}

// Storage configuration with secure random filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Sanitize extension — only allow known safe image extensions
    const ext = path.extname(file.originalname).toLowerCase();
    if (!config.ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return cb(new Error(`File extension "${ext}" is not permitted. Allowed: ${config.ALLOWED_IMAGE_EXTENSIONS.join(', ')}`));
    }
    // Generate cryptographically random filename to prevent path traversal
    const safeName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

// MIME type filter (first pass — header-based)
const fileFilter = (req, file, cb) => {
  if (config.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type "${file.mimetype}". Only JPEG, PNG, and WebP images are permitted for civic evidence.`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5,
  },
  fileFilter,
});

/**
 * Post-upload middleware to validate magic bytes of uploaded files.
 * Deletes files that fail validation.
 */
function validateUploadedFiles(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  for (const file of files) {
    if (!validateMagicBytes(file.path, file.mimetype)) {
      // Delete the suspicious file immediately
      try { fs.unlinkSync(file.path); } catch { /* ignore cleanup errors */ }
      return res.status(400).json({
        success: false,
        message: `File "${file.originalname}" failed content verification. The file does not appear to be a valid image. Only genuine JPEG, PNG, and WebP files are accepted.`,
      });
    }
  }
  next();
}

module.exports = upload;
module.exports.validateUploadedFiles = validateUploadedFiles;
