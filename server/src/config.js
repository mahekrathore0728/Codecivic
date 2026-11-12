const path = require('path');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// In production, JWT_SECRET must be explicitly set via environment variable.
// A hardcoded fallback in production would be a critical security vulnerability.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is required in production. Server will not start.');
    process.exit(1);
  } else {
    // Development-only fallback — explicitly not safe for production
    console.warn('[DEV WARNING] JWT_SECRET not set. Using development-only fallback. Never deploy without a real secret.');
  }
}

// Allowed frontend origins (comma-separated in env or defaults for dev)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5000', 'http://localhost:5173', 'http://127.0.0.1:5173'];

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV,
  isProduction,
  JWT_SECRET: JWT_SECRET || 'codecivic-dev-only-jwt-secret-not-for-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'codecivic.db'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  // Allowed MIME types for uploaded civic evidence images
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  // Allowed file extensions (must match MIME types above)
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  ALLOWED_ORIGINS,

  // Default SLA hours mapped by priority
  DEFAULT_SLA_HOURS: {
    CRITICAL: 24,
    HIGH: 48,
    MEDIUM: 72,
    LOW: 120,
  },

  // Hackathon demo & evaluator settings
  ENABLE_DEMO_CREDENTIALS: process.env.ENABLE_DEMO_CREDENTIALS === 'true' || !isProduction,
  EVALUATOR_KEY: process.env.EVALUATOR_KEY || (isProduction ? null : 'codecivic-evaluator-2026'),
  SMTP_CONFIGURED: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),

  // Rate limiting config
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  API_RATE_LIMIT_MAX: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 300,

  // Temporary live backup system configuration (disabled by default)
  BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
  BACKUP_SECRET: process.env.BACKUP_SECRET || null,
  BACKUP_TEMP_DIR: process.env.BACKUP_TEMP_DIR || path.join(__dirname, '..', 'backups_temp'),
  MAX_BACKUP_SIZE_MB: parseInt(process.env.MAX_BACKUP_SIZE_MB, 10) || 200,
  BACKUP_EXPIRY_SECONDS: parseInt(process.env.BACKUP_EXPIRY_SECONDS, 10) || 600,
};
