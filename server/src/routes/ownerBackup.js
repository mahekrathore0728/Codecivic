const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const {
  generateLiveBackup,
  getBackupForDownload,
  finalizeDownload,
  isBackupActive,
} = require('../services/backupService');

// Strict rate limiting specifically for backup endpoints
// Only apply in production — tests run with NODE_ENV=development or test
const isNonProduction = process.env.NODE_ENV !== 'production';
const backupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isNonProduction ? 1000 : 5,
  skip: () => isNonProduction,
  message: {
    success: false,
    message: 'Too many backup operations attempted. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(backupLimiter);

/**
 * Timing-safe secret comparison
 */
function verifySecret(provided, configured) {
  if (!provided || typeof provided !== 'string') return false;
  if (!configured || typeof configured !== 'string') return false;

  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);

  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, configuredBuffer);
}

/**
 * Gatekeeper middleware: ensures backup service is enabled, configured, and HTTPS-enforced
 */
function requireBackupEnabled(req, res, next) {
  if (!config.BACKUP_ENABLED) {
    return res.status(403).json({
      success: false,
      message: 'Live backup service is disabled.',
    });
  }

  if (!config.BACKUP_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Backup service is not configured with BACKUP_SECRET.',
    });
  }

  // Enforce HTTPS in production
  if (config.isProduction) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isHttps) {
      return res.status(403).json({
        success: false,
        message: 'HTTPS is strictly required for backup operations.',
      });
    }
  }

  next();
}

/**
 * Secret verification middleware
 */
function requireBackupSecret(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-backup-secret'];

  let candidateSecret = customHeader;
  if (!candidateSecret && authHeader && authHeader.startsWith('Bearer ')) {
    candidateSecret = authHeader.split(' ')[1];
  }

  if (!candidateSecret) {
    return res.status(400).json({
      success: false,
      message: 'Backup authorization header (X-Backup-Secret or Authorization: Bearer <secret>) is required.',
    });
  }

  if (!verifySecret(candidateSecret, config.BACKUP_SECRET)) {
    // Record failed attempt without logging the provided credential
    console.warn(`[SECURITY WARNING] Unauthorized backup attempt from IP ${req.ip} at ${new Date().toISOString()}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or unauthorized backup secret.',
    });
  }

  next();
}

/**
 * POST /api/owner/backup
 * Generates an online, consistent SQLite replica, archives uploaded evidence files,
 * builds metadata manifest, and returns a short-lived download token.
 */
router.post('/', requireBackupEnabled, requireBackupSecret, async (req, res) => {
  try {
    if (isBackupActive()) {
      return res.status(409).json({
        success: false,
        message: 'A live backup is already pending download. Please download or wait for expiration.',
      });
    }

    console.log(`[BACKUP AUDIT] Live backup initiated by authorized operator from IP ${req.ip} at ${new Date().toISOString()}`);

    const result = await generateLiveBackup();

    console.log(`[BACKUP AUDIT] Live backup generated: ${result.archiveName} (${result.archiveSizeBytes} bytes, SHA-256: ${result.sha256})`);

    return res.json({
      success: true,
      message: 'Live backup archive generated successfully. Download token is valid for 10 minutes.',
      downloadToken: result.downloadToken,
      downloadUrl: result.downloadUrl,
      expiresInSeconds: result.expiresInSeconds,
      archiveName: result.archiveName,
      archiveSizeBytes: result.archiveSizeBytes,
      sha256: result.sha256,
      manifestSummary: result.manifestSummary,
    });
  } catch (err) {
    if (err.code === 'BACKUP_IN_PROGRESS') {
      return res.status(409).json({
        success: false,
        message: 'A backup generation process is already active. Please wait.',
      });
    }

    console.error('Backup generation error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Backup generation failed. Please consult server diagnostics.',
    });
  }
});

/**
 * GET /api/owner/backup/download
 * Secure, single-use, time-limited download endpoint for the generated backup package.
 * Automatically deletes the temporary archive from server disk upon stream completion.
 */
router.get('/download', requireBackupEnabled, (req, res) => {
  try {
    const token = req.query.token || req.headers['x-download-token'];

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Download token is required (?token=... or X-Download-Token header).',
      });
    }

    const { error, message, backup } = getBackupForDownload(token);

    if (error) {
      const statusMap = {
        NO_ACTIVE_BACKUP: 404,
        ALREADY_DOWNLOADED: 410,
        EXPIRED: 410,
        INVALID_TOKEN: 401,
        FILE_NOT_FOUND: 404,
      };
      return res.status(statusMap[error] || 400).json({
        success: false,
        error,
        message,
      });
    }

    // Set headers preventing caching and specifying download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
    res.setHeader('Content-Length', backup.sizeBytes);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Backup-Checksum-SHA256', backup.sha256);

    const stream = fs.createReadStream(backup.filePath);

    stream.on('error', (streamErr) => {
      console.error('Backup stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Stream failed during download.' });
      }
    });

    stream.pipe(res);

    // Atomically invalidate and clean up upon successful delivery
    res.on('finish', () => {
      finalizeDownload();
      console.log(`[BACKUP AUDIT] Backup ${backup.fileName} successfully delivered and temporary files purged at ${new Date().toISOString()}`);
    });
  } catch (err) {
    console.error('Backup download error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Could not process backup download.',
    });
  }
});

module.exports = router;
