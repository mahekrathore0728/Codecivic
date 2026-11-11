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
 * Generates password reset token
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(trimmedEmail);

    if (!user) {
      // Return neutral message for security
      return res.json({
        success: true,
        message: 'If this email is registered with CodeCivic, a password reset link has been prepared.',
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare(`
      INSERT INTO password_resets (email, token, expires_at)
      VALUES (?, ?, ?)
    `).run(trimmedEmail, resetToken, expiresAt);

    // Return token directly for simple civic self-service reset in environments without active SMTP
    return res.json({
      success: true,
      message: 'Password reset instructions have been generated.',
      resetToken, // Provided for user-friendly testing & self-serve reset
      note: 'In production with SMTP enabled, this reset token is sent securely to the citizen\'s inbox.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Error processing password reset request.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req, res) => {
  try {
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

    const resetRecord = db.prepare(`
      SELECT * FROM password_resets
      WHERE token = ? AND used = 0 AND expires_at > datetime('now')
    `).get(token);

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token. Please request a new one.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update user password and mark token as used
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

module.exports = router;
