const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const db = require('../db');
const config = require('../config');

/**
 * Creates a Zip archive instance compatible with both Archiver v8+ (ZipArchive) and v5-v7 (archiver('zip'))
 */
function createZipArchive(options = {}) {
  const archiverModule = require('archiver');
  if (archiverModule.ZipArchive) {
    return new archiverModule.ZipArchive(options);
  }
  if (typeof archiverModule === 'function') {
    return archiverModule('zip', options);
  }
  if (archiverModule.default && typeof archiverModule.default === 'function') {
    return archiverModule.default('zip', options);
  }
  throw new Error('Unable to initialize zip archive stream');
}

// In-memory atomic state
let isGenerating = false;
let activeBackup = null;
let cleanupTimeout = null;

/**
 * Calculates SHA-256 hash of a file on disk
 */
function getFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Ensures a directory exists with restricted access
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
}

/**
 * Clean up all files inside a directory and remove it
 */
function removeDirSync(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Directory cleanup error:', err.message);
  }
}

/**
 * Generate a complete, transactionally consistent live backup
 */
async function generateLiveBackup() {
  if (isGenerating) {
    const err = new Error('A backup generation is already in progress.');
    err.code = 'BACKUP_IN_PROGRESS';
    throw err;
  }

  isGenerating = true;

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const tempRunId = `backup_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const tempDir = path.join(config.BACKUP_TEMP_DIR, tempRunId);
  const tempDbPath = path.join(tempDir, 'codecivic.db');
  const zipFileName = `codecivic_live_backup_${timestampStr}.zip`;
  const zipFilePath = path.join(config.BACKUP_TEMP_DIR, zipFileName);

  try {
    ensureDir(config.BACKUP_TEMP_DIR);
    ensureDir(tempDir);

    // 1. Transactionally consistent SQLite online backup via better-sqlite3 API
    // This safely copies active WAL pages without locking out regular citizen traffic.
    await db.backup(tempDbPath);

    if (!fs.existsSync(tempDbPath)) {
      throw new Error('SQLite online backup failed to produce database replica.');
    }

    // 2. Verify database integrity and foreign keys on the replica
    const backupDb = new Database(tempDbPath, { readonly: true });
    let integrityResult = 'unknown';
    let fkResult = 'ok';
    let tableStats = {};
    let totalDbRecords = 0;

    try {
      const integrityRows = backupDb.prepare('PRAGMA integrity_check').all();
      integrityResult = integrityRows.length === 1 && integrityRows[0].integrity_check === 'ok'
        ? 'ok'
        : JSON.stringify(integrityRows);

      const fkRows = backupDb.prepare('PRAGMA foreign_key_check').all();
      if (fkRows.length > 0) {
        fkResult = `violation_count_${fkRows.length}`;
      }

      // Discover all user/application tables dynamically
      const tables = backupDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC
      `).all();

      for (const t of tables) {
        try {
          const count = backupDb.prepare(`SELECT COUNT(*) AS count FROM "${t.name}"`).get().count;
          tableStats[t.name] = count;
          totalDbRecords += count;
        } catch {
          tableStats[t.name] = -1;
        }
      }
    } finally {
      backupDb.close();
    }

    if (integrityResult !== 'ok') {
      throw new Error(`Database integrity check failed: ${integrityResult}`);
    }

    const dbStats = fs.statSync(tempDbPath);
    const dbSha256 = await getFileSha256(tempDbPath);

    // 3. Scan and checksum all uploaded files
    const uploadFiles = [];
    let totalUploadsSize = 0;

    if (fs.existsSync(config.UPLOAD_DIR)) {
      const dirEntries = fs.readdirSync(config.UPLOAD_DIR, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (entry.isFile()) {
          const filePath = path.join(config.UPLOAD_DIR, entry.name);
          const fStats = fs.statSync(filePath);
          const fHash = await getFileSha256(filePath);
          uploadFiles.push({
            filename: entry.name,
            size_bytes: fStats.size,
            sha256: fHash,
          });
          totalUploadsSize += fStats.size;
        }
      }
    }

    // Check DB references against present files
    let referencedFilesCount = 0;
    const missingReferences = [];
    try {
      const imageRows = db.prepare('SELECT file_url FROM complaint_images WHERE file_url IS NOT NULL').all();
      const evidenceRows = db.prepare('SELECT evidence_image_url FROM resolution_evidence WHERE evidence_image_url IS NOT NULL').all();

      const allUrls = [
        ...imageRows.map((r) => r.file_url),
        ...evidenceRows.map((r) => r.evidence_image_url),
      ];

      for (const url of allUrls) {
        if (url && url.startsWith('/uploads/')) {
          referencedFilesCount++;
          const base = path.basename(url);
          const exists = uploadFiles.some((f) => f.filename === base);
          if (!exists) {
            missingReferences.push(url);
          }
        }
      }
    } catch (refErr) {
      console.warn('Reference audit notice:', refErr.message);
    }

    // 4. Construct Manifest
    let gitCommit = null;
    try {
      const { execSync } = require('child_process');
      gitCommit = execSync('git rev-parse --short HEAD', { timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      gitCommit = null;
    }

    let appVersion = '1.0.0';
    try {
      appVersion = require('../../../package.json').version || '1.0.0';
    } catch {
      try {
        appVersion = require('../../package.json').version || '1.0.0';
      } catch {}
    }

    const manifest = {
      project: 'CodeCivic',
      tagline: 'One Nation. One Civic Platform. Better Communities.',
      backup_timestamp_utc: now.toISOString(),
      app_version: appVersion,
      git_commit: gitCommit,
      database: {
        file: 'database/codecivic.db',
        size_bytes: dbStats.size,
        sha256: dbSha256,
        integrity_check: integrityResult,
        foreign_key_check: fkResult,
        total_records: totalDbRecords,
        table_counts: tableStats,
      },
      uploads: {
        total_files: uploadFiles.length,
        total_size_bytes: totalUploadsSize,
        referenced_in_db: referencedFilesCount,
        missing_file_references: missingReferences,
        files: uploadFiles,
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        sqlite_version: db.prepare('SELECT sqlite_version() AS v').get().v,
      },
    };

    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');

    // 5. Build ZIP Package using archiver
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = createZipArchive({
        zlib: { level: 9 }, // Maximum compression
      });

      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);

      // Append database
      archive.file(tempDbPath, { name: 'database/codecivic.db' });

      // Append manifest
      archive.append(manifestBuffer, { name: 'metadata/backup_manifest.json' });

      // Append uploads
      if (fs.existsSync(config.UPLOAD_DIR)) {
        for (const file of uploadFiles) {
          const filePath = path.join(config.UPLOAD_DIR, file.filename);
          archive.file(filePath, { name: `uploads/${file.filename}` });
        }
      }

      archive.finalize();
    });

    // Verify zip output
    const zipStats = fs.statSync(zipFilePath);
    const maxAllowedBytes = config.MAX_BACKUP_SIZE_MB * 1024 * 1024;
    if (zipStats.size > maxAllowedBytes) {
      fs.unlinkSync(zipFilePath);
      throw new Error(`Generated backup exceeds maximum permitted size of ${config.MAX_BACKUP_SIZE_MB}MB.`);
    }

    const zipSha256 = await getFileSha256(zipFilePath);

    // 6. Generate Single-Use, Short-Lived Download Token
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresInSeconds = config.BACKUP_EXPIRY_SECONDS;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Clear previous timeout if any
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout);
      cleanupTimeout = null;
    }

    // Clean up temporary db copy now that it is zipped
    removeDirSync(tempDir);

    // Set active backup state
    activeBackup = {
      token: downloadToken,
      filePath: zipFilePath,
      fileName: zipFileName,
      sizeBytes: zipStats.size,
      sha256: zipSha256,
      createdAt: now,
      expiresAt,
      downloaded: false,
      manifestSummary: {
        totalTables: Object.keys(tableStats).length,
        totalRecords: totalDbRecords,
        totalUploads: uploadFiles.length,
        dbSha256,
      },
    };

    // Schedule automatic deletion upon expiration
    cleanupTimeout = setTimeout(() => {
      cleanupActiveBackup('EXPIRED');
    }, expiresInSeconds * 1000);

    return {
      downloadToken,
      downloadUrl: `/api/owner/backup/download?token=${downloadToken}`,
      expiresInSeconds,
      archiveName: zipFileName,
      archiveSizeBytes: zipStats.size,
      sha256: zipSha256,
      manifestSummary: activeBackup.manifestSummary,
    };
  } catch (err) {
    // Cleanup temporary files on failure
    removeDirSync(tempDir);
    if (fs.existsSync(zipFilePath)) {
      try {
        fs.unlinkSync(zipFilePath);
      } catch {}
    }
    throw err;
  } finally {
    isGenerating = false;
  }
}

/**
 * Validates download token and prepares file stream
 */
function getBackupForDownload(providedToken) {
  if (!activeBackup) {
    return { error: 'NO_ACTIVE_BACKUP', message: 'No backup is currently pending download.' };
  }

  if (activeBackup.downloaded) {
    return { error: 'ALREADY_DOWNLOADED', message: 'This backup token has already been consumed.' };
  }

  if (new Date() > activeBackup.expiresAt) {
    cleanupActiveBackup('EXPIRED');
    return { error: 'EXPIRED', message: 'The backup download window has expired.' };
  }

  // Constant-time token verification
  const providedBuffer = Buffer.from(providedToken || '');
  const activeBuffer = Buffer.from(activeBackup.token);

  if (providedBuffer.length !== activeBuffer.length || !crypto.timingSafeEqual(providedBuffer, activeBuffer)) {
    return { error: 'INVALID_TOKEN', message: 'Invalid or unauthorized backup download token.' };
  }

  if (!fs.existsSync(activeBackup.filePath)) {
    return { error: 'FILE_NOT_FOUND', message: 'Backup file is missing from temporary storage.' };
  }

  return { backup: activeBackup };
}

/**
 * Consumes the backup after successful stream completion
 */
function finalizeDownload() {
  if (!activeBackup) return;
  activeBackup.downloaded = true;
  cleanupActiveBackup('DOWNLOADED');
}

/**
 * Internal cleanup of temporary backup files
 */
function cleanupActiveBackup(reason = 'MANUAL') {
  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout);
    cleanupTimeout = null;
  }

  if (activeBackup && activeBackup.filePath && fs.existsSync(activeBackup.filePath)) {
    try {
      fs.unlinkSync(activeBackup.filePath);
    } catch (e) {
      console.error('Failed to unlink backup zip:', e.message);
    }
  }

  activeBackup = null;
}

module.exports = {
  generateLiveBackup,
  getBackupForDownload,
  finalizeDownload,
  cleanupActiveBackup,
  isBackupActive: () => Boolean(activeBackup && !activeBackup.downloaded && new Date() <= activeBackup.expiresAt),
};
