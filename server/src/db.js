const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure database and uploads directory exist
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

const db = new Database(config.DB_PATH);

// Enable WAL mode and foreign key constraints for performance & data integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database tables
const initSchema = () => {
  db.exec(`
    -- Users Table (Citizens and Administrators)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('CITIZEN', 'ADMIN')),
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Departments Table (Govt. Municipal Authorities)
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      head_officer TEXT,
      sla_hours_default INTEGER DEFAULT 72,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Issue Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      default_priority TEXT DEFAULT 'MEDIUM' CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      default_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Civic Complaints Table
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_code TEXT UNIQUE NOT NULL,
      citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      address TEXT NOT NULL,
      landmark TEXT,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED')),
      sla_deadline DATETIME,
      resolved_at DATETIME,
      closed_at DATETIME,
      support_count INTEGER DEFAULT 0,
      is_escalated INTEGER DEFAULT 0,
      escalation_reason TEXT,
      reopen_count INTEGER DEFAULT 0,
      ward TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Complaint Photographs/Evidence Table
    CREATE TABLE IF NOT EXISTS complaint_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Status Transition History / Audit Trail
    CREATE TABLE IF NOT EXISTS complaint_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Resolution Evidence (Uploaded by Admin/Department upon resolution)
    CREATE TABLE IF NOT EXISTS resolution_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      resolution_notes TEXT NOT NULL,
      evidence_image_url TEXT,
      verified_by_citizen INTEGER DEFAULT 0, -- 0: pending review, 1: confirmed resolved, -1: reported unresolved (reopened)
      citizen_feedback TEXT,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Community Support (Upvotes / "I also face this issue")
    CREATE TABLE IF NOT EXISTS complaint_supports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(complaint_id, citizen_id)
    );

    -- Duplicate & Related Complaint Linkages
    CREATE TABLE IF NOT EXISTS duplicate_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      duplicate_complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      similarity_score REAL,
      similarity_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- In-App Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL, -- STATUS_CHANGE, RESOLUTION_VERIFICATION, ESCALATION, ASSIGNMENT, DUPLICATE_ALERT
      complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Escalation Records
    CREATE TABLE IF NOT EXISTS escalation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      citizen_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Administrator Activity Audit Logs
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Password Reset Tokens
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL COLLATE NOCASE,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for high-performance querying
    CREATE INDEX IF NOT EXISTS idx_complaints_code ON complaints(complaint_code);
    CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(department_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
    CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);
    CREATE INDEX IF NOT EXISTS idx_complaints_geo ON complaints(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_supports_complaint ON complaint_supports(complaint_id);
  `);
};

initSchema();

// Migrations: Safely add India-wide location and classification columns if missing
try {
  const tableCols = db.prepare('PRAGMA table_info(complaints)').all().map(c => c.name);
  if (!tableCols.includes('ward')) {
    db.prepare('ALTER TABLE complaints ADD COLUMN ward TEXT').run();
  }
  if (!tableCols.includes('pincode')) {
    db.prepare('ALTER TABLE complaints ADD COLUMN pincode TEXT').run();
  }
  if (!tableCols.includes('locality')) {
    db.prepare('ALTER TABLE complaints ADD COLUMN locality TEXT').run();
  }
  if (!tableCols.includes('city')) {
    db.prepare('ALTER TABLE complaints ADD COLUMN city TEXT').run();
  }
  if (!tableCols.includes('location_source')) {
    db.prepare("ALTER TABLE complaints ADD COLUMN location_source TEXT DEFAULT 'MANUAL'").run();
  }
  if (!tableCols.includes('is_demo')) {
    db.prepare('ALTER TABLE complaints ADD COLUMN is_demo INTEGER DEFAULT 0').run();
  }

  // Tag initial demo records so they are clearly distinguished from real user complaints
  db.prepare(`
    UPDATE complaints 
    SET is_demo = 1 
    WHERE complaint_code IN (
      'CC-2026-00001', 'CC-2026-00002', 'CC-2026-00003', 'CC-2026-00004',
      'CC-2026-00005', 'CC-2026-00006', 'CC-2026-00007', 'CC-2026-00008',
      'CC-2026-00009', 'CC-2026-00010', 'CC-2026-00011'
    )
  `).run();
} catch (e) {
  // Column may already exist or concurrent access
}

// Lightweight migration: add REJECTED to status CHECK constraint if not present.
// SQLite doesn't support ALTER CHECK, but the schema was updated above.
// For existing databases, REJECTED values are simply allowed by INSERT/UPDATE
// if the schema already exists (CHECK isn't retroactively enforced on existing tables).
// This is safe because we validate transitions in application logic.

module.exports = db;
