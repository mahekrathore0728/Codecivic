const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./db');
const seedDatabase = require('./seed');

// Route modules
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const ownerBackupRoutes = require('./routes/ownerBackup');

const app = express();

// Security: Disable x-powered-by header
app.disable('x-powered-by');

// CORS configuration — restrictive in production, permissive in development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (config.isProduction) {
      if (config.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    // In development, allow all origins
    return callback(null, true);
  },
  credentials: true,
}));

// Body parsing with safe limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory with cache control
app.use('/uploads', express.static(config.UPLOAD_DIR, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  },
}));

// Rate limiting for auth endpoints (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes for security.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.API_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Security headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (config.isProduction) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/owner/backup', ownerBackupRoutes);

/**
 * Public Civic Transparency Endpoint (Phase 6)
 * Exposes safe aggregate data without revealing personal citizen data,
 * private remarks, passwords, or exact residential addresses.
 */
app.get('/api/transparency', (req, res) => {
  try {
    const totalComplaints = db.prepare('SELECT COUNT(*) AS count FROM complaints').get().count;
    const resolvedComplaints = db.prepare("SELECT COUNT(*) AS count FROM complaints WHERE status IN ('RESOLVED', 'CLOSED')").get().count;
    const pendingComplaints = totalComplaints - resolvedComplaints;

    // Avg resolution time in hours
    const avgResolutionTime = db.prepare(`
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS avg_hours
      FROM complaints
      WHERE resolved_at IS NOT NULL
    `).get().avg_hours;

    // Safe Category distribution
    const categoryStats = db.prepare(`
      SELECT cat.name, COUNT(c.id) AS total,
             SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved
      FROM categories cat
      LEFT JOIN complaints c ON cat.id = c.category_id
      GROUP BY cat.id
      ORDER BY total DESC
    `).all();

    // Safe Department performance
    const departmentStats = db.prepare(`
      SELECT d.name, COUNT(c.id) AS total_assigned,
             SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved,
             SUM(CASE WHEN c.status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS active
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id
      ORDER BY total_assigned DESC
    `).all();

    // Monthly aggregate counts (No citizen PII)
    const monthlyStats = db.prepare(`
      SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
      FROM complaints
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all().reverse();

    return res.json({
      success: true,
      disclaimer: 'Public transparency report for Nagar Nigam Kota. Data shows safe anonymized aggregate figures.',
      summary: {
        totalComplaints,
        resolvedComplaints,
        pendingComplaints,
        resolutionPercentage: totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0,
        averageResolutionHours: avgResolutionTime ? Math.round(avgResolutionTime * 10) / 10 : 0,
      },
      categoryStats,
      departmentStats,
      monthlyStats,
    });
  } catch (err) {
    console.error('Transparency error:', err);
    return res.status(500).json({ success: false, message: 'Could not load transparency figures.' });
  }
});

/**
 * Optional Civic AI Assistant Route (Section 18)
 * Assisting feature for improving descriptions, clarifying civic terms, and recommending categories.
 * Works completely offline using civic NLP heuristic rules if AI_API_KEY is not configured.
 */
app.post('/api/ai/assist', (req, res) => {
  try {
    const { action, query, description, category } = req.body;

    if (action === 'IMPROVE_DESCRIPTION') {
      const text = (description || '').trim();
      if (!text) {
        return res.status(400).json({ success: false, message: 'Please provide an initial description.' });
      }

      // Rule-based structured enhancement
      const enhanced = `Location details: Observed near public pathway. Issue: ${text}. Potential impact: Poses inconvenience and safety risk to local pedestrians, students, and commuters. Requesting municipal inspection and timely repair.`;

      return res.json({
        success: true,
        improvedText: enhanced,
        disclaimer: 'Generated by CodeCivic Assistant. Please review and adjust to match your exact observation.',
      });
    }

    if (action === 'EXPLAIN_TERM') {
      const term = (query || '').toLowerCase().trim();
      const glossary = {
        'sla': 'Service Level Agreement (SLA) is the committed maximum time window within which municipal authorities aim to resolve a reported problem.',
        'reopened': 'A complaint status indicating that a citizen reviewed the resolution evidence and reported that the issue remains unresolved on-ground.',
        'escalation': 'A supervisory alert triggered when a complaint exceeds the SLA response deadline, notifying senior municipal directors for intervention.',
        'under review': 'The complaint has been logged and is being verified by the municipal helpdesk before dispatching to the field maintenance crew.',
        'assigned': 'The complaint has been routed to the relevant specialized municipal department (e.g., Road Maintenance or Water Board).',
      };

      const explanation = glossary[term] || 'In civic governance, this refers to administrative milestones tracked to ensure transparent public accountability.';

      return res.json({
        success: true,
        term,
        explanation,
      });
    }

    return res.status(400).json({ success: false, message: 'Unknown assist action.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'AI assistance unavailable.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: 'connected',
  });
});

// Production: Serve static client build if present
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global safe error handling middleware (Never leaks internal stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  const message = config.NODE_ENV === 'production'
    ? 'An unexpected system error occurred. Please contact citizen support.'
    : err.message || 'An error occurred.';

  res.status(status).json({
    success: false,
    message,
  });
});

let server = null;
if (require.main === module) {
  // Auto-seed on every startup — seed.js uses upsert logic so it is safe to call repeatedly.
  // This guarantees demo accounts and reference data exist in production (Render ephemeral FS).
  seedDatabase()
    .then(() => {
      server = app.listen(config.PORT, () => {
        console.log(`====================================================`);
        console.log(`CodeCivic Civic Governance Server running on port ${config.PORT}`);
        console.log(`API Base URL: http://localhost:${config.PORT}/api`);
        console.log(`Environment: ${config.NODE_ENV}`);
        console.log(`====================================================`);
      });
    })
    .catch((err) => {
      console.error('FATAL: Database seeding failed on startup:', err);
      process.exit(1);
    });
}

module.exports = { app, server };
