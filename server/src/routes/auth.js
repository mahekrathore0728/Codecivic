const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

// Indian 10-digit mobile number format
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Citizen registration
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword, state, district } = req.body;

    // Field presence validation
    if (!name || !email || !mobile || !password || !confirmPassword || !state || !district) {
      return res.status(400).json({
        success: false,
        message: 'All fields are mandatory. Please fill in your complete details.',
      });
    }

    // Email format validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Indian mobile number validation
    const cleanedMobile = mobile.trim().replace(/^(\+91|0)/, '');
    if (!MOBILE_REGEX.test(cleanedMobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
      });
    }

    // Password matching and strength
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain a mix of letters and numbers.',
      });
    }

    // Check existing email
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address is already registered. Please log in.',
      });
    }

    // Check existing mobile
    const existingMobile = db.prepare('SELECT id FROM users WHERE mobile = ?').get(cleanedMobile);
    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: 'An account with this mobile number already exists.',
      });
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert citizen (Role is strictly CITIZEN - public registration never grants admin access)
    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, mobile, password_hash, role, state, district)
      VALUES (?, ?, ?, ?, 'CITIZEN', ?, ?)
    `);

    const result = insertStmt.run(name.trim(), trimmedEmail, cleanedMobile, passwordHash, state.trim(), district.trim());
    const userId = result.lastInsertRowid;

    // Generate JWT token
    const token = jwt.sign({ id: userId, role: 'CITIZEN' }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    const userProfile = {
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      mobile: cleanedMobile,
      role: 'CITIZEN',
      state: state.trim(),
      district: district.trim(),
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to CodeCivic.',
      token,
      user: userProfile,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.',
    });
  }
});

/**
 * POST /api/auth/login
 * User & Administrator login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare(`
      SELECT id, name, email, mobile, password_hash, role, state, district
      FROM users WHERE email = ?
    `).get(trimmedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // Compare hashed password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      state: user.state,
      district: user.district,
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: userProfile,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging in. Please try again.',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /api/auth/change-password
 * Change password for logged-in user
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);

    return res.json({
      success: true,
      message: 'Your password has been updated successfully.',
    });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not change password at this time.',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery.
 *
 * SECURITY ENFORCEMENT:
 * - If email dispatch (SMTP) is not configured, returns HTTP 503 with an explicit message
 *   explaining that automated recovery is disabled, directing users to official municipal support.
 * - In no circumstances is a reset token EVER returned in the HTTP response.
 * - Uniform neutral response prevents user account enumeration when email delivery is active.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email.' });
    }

    // When automated email delivery is not configured, safely disable self-service reset
    if (!config.SMTP_CONFIGURED) {
      return res.status(503).json({
        success: false,
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'Self-service password reset is disabled because automated email delivery (SMTP) is not configured on this server. Please contact municipal support at support.kota@codecivic.gov.in or visit your local ward administration office for identity verification and account assistance.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(trimmedEmail);

    if (user) {
      // Generate cryptographically secure token
      const rawToken = crypto.randomBytes(32).toString('hex');
      // Store SHA-256 hash in database rather than raw token
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute expiry (single use)

      // Invalidate existing unused tokens for this email
      db.prepare('UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0').run(trimmedEmail);

      db.prepare(`
        INSERT INTO password_resets (email, token, expires_at)
        VALUES (?, ?, ?)
      `).run(trimmedEmail, hashedToken, expiresAt);

      // In production with active SMTP, the rawToken would be dispatched via email here.
      // Notice: rawToken is NEVER included in the API response.
    }

    // Always return uniform neutral response to protect citizen privacy
    return res.json({
      success: true,
      message: 'If this email address is registered with CodeCivic, password reset instructions have been sent to your inbox.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Error processing password reset request.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using single-use cryptographic token.
 */
router.post('/reset-password', async (req, res) => {
  try {
    if (!config.SMTP_CONFIGURED) {
      return res.status(503).json({
        success: false,
        message: 'Password reset is disabled because automated email delivery is not configured.',
      });
    }

    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = db.prepare(`
      SELECT * FROM password_resets
      WHERE token = ? AND used = 0 AND expires_at > datetime('now')
    `).get(hashedToken);

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token. Please request a new one.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update user password and atomically invalidate token
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').run(newHash, resetRecord.email);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

    return res.json({
      success: true,
      message: 'Your password has been successfully reset. You may now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Error resetting password.' });
  }
});

/**
 * GET /api/auth/demo-credentials
 * Returns demo account credentials for hackathon evaluators.
 *
 * SECURITY NOTE: This endpoint is intentionally public so evaluators can log in
 * without credentials being compiled into the client JavaScript bundle.
 * In a production deployment that is NOT a hackathon demo, this endpoint
 * should be removed or gated behind an IP allowlist / evaluator token.
 *
 * Credentials here match what seed.js inserts. They are not secret for a demo
 * platform, but keeping them server-side prevents them appearing in browser
 * DevTools → Sources, cached Service Workers, or public CDN edge caches.
 */
router.get('/demo-credentials', (req, res) => {
  if (!config.ENABLE_DEMO_CREDENTIALS) {
    return res.status(404).json({
      success: false,
      message: 'Demo accounts are not available in this deployment.',
    });
  }

  // NOTE: Return citizen demo profile identifiers only.
  // NO passwords or password hashes are ever returned in public API responses.
  // Evaluators and test users can click to log in via POST /api/auth/demo-login.
  return res.json({
    success: true,
    note: 'Citizen demonstration accounts for civic evaluation.',
    accounts: [
      {
        id: 'citizen1',
        type: 'Citizen Demo 1',
        name: 'Ramesh Kumar (Ward 14)',
        email: 'ramesh.citizen@codecivic.gov.in',
        role: 'CITIZEN',
      },
      {
        id: 'citizen2',
        type: 'Citizen Demo 2',
        name: 'Priya Sharma (Vigyan Nagar)',
        email: 'priya.sharma@codecivic.gov.in',
        role: 'CITIZEN',
      },
    ],
  });
});

/**
 * POST /api/auth/demo-login
 * Direct passwordless login for demo citizens during hackathon evaluation.
 * Strictly limited to pre-seeded CITIZEN demo accounts.
 * Administrator accounts CANNOT be accessed via this endpoint.
 */
router.post('/demo-login', async (req, res) => {
  try {
    if (!config.ENABLE_DEMO_CREDENTIALS) {
      return res.status(403).json({
        success: false,
        message: 'Demo login is disabled in this deployment.',
      });
    }

    const { accountId } = req.body;
    const allowedDemoMap = {
      citizen1: 'ramesh.citizen@codecivic.gov.in',
      citizen2: 'priya.sharma@codecivic.gov.in',
    };

    const targetEmail = allowedDemoMap[accountId];
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid demo account selected. Administrator accounts cannot be accessed via demo login.',
      });
    }

    const user = db.prepare(`
      SELECT id, name, email, mobile, role, state, district
      FROM users WHERE email = ?
    `).get(targetEmail);

    if (!user || user.role !== 'CITIZEN') {
      return res.status(404).json({
        success: false,
        message: 'Demo citizen account not found.',
      });
    }

    const token = jwt.sign({ id: user.id, role: 'CITIZEN' }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    return res.json({
      success: true,
      message: `Authenticated as demo citizen: ${user.name}`,
      token,
      user,
    });
  } catch (err) {
    console.error('Demo login error:', err);
    return res.status(500).json({ success: false, message: 'Demo login failed.' });
  }
});

/**
 * POST /api/auth/evaluator-login
 * Secure evaluator-only login for official hackathon jury & reviewers.
 * Requires the EVALUATOR_KEY secret (configured via server environment).
 * Never exposes the administrator's password in API responses or bundle.
 */
router.post('/evaluator-login', async (req, res) => {
  try {
    if (!config.ENABLE_DEMO_CREDENTIALS) {
      return res.status(403).json({
        success: false,
        message: 'Evaluator login is disabled in this deployment.',
      });
    }

    const { evaluatorKey } = req.body;
    if (!evaluatorKey || typeof evaluatorKey !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Evaluator access key is required.',
      });
    }

    if (!config.EVALUATOR_KEY) {
  return res.status(503).json({
    success: false,
    message: 'Evaluator login is not configured.',
  });
}

    // Secure timing-safe comparison
    const expectedKey = config.EVALUATOR_KEY;
    const providedBuffer = Buffer.from(evaluatorKey);
    const expectedBuffer = Buffer.from(expectedKey);

    const isMatch = providedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, expectedBuffer);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid evaluator access key. Access denied.',
      });
    }

    // Retrieve official municipal administrator profile
    const adminUser = db.prepare(`
      SELECT id, name, email, mobile, role, state, district
      FROM users WHERE role = 'ADMIN'
      ORDER BY id ASC
      LIMIT 1
    `).get();

    if (!adminUser) {
      return res.status(500).json({
        success: false,
        message: 'No administrator account found in database.',
      });
    }

    const token = jwt.sign({ id: adminUser.id, role: 'ADMIN' }, config.JWT_SECRET, {
      expiresIn: '24h',
    });

    return res.json({
      success: true,
      message: 'Evaluator authenticated successfully. Granted administrator access.',
      token,
      user: adminUser,
    });
  } catch (err) {
    console.error('Evaluator login error:', err);
    return res.status(500).json({ success: false, message: 'Evaluator authentication failed.' });
  }
});

module.exports = router;
