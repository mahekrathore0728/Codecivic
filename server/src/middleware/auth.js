const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

const ADMIN_ROLES = [
  'ADMIN',
  'NATIONAL_SUPER_ADMIN',
  'STATE_ADMIN',
  'DISTRICT_ADMIN',
  'LOCAL_BODY_ADMIN',
  'DEPARTMENT_ADMIN',
  'FIELD_OFFICER',
];

/**
 * Middleware: Verify JWT and attach full user profile
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access this resource.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.prepare(`
      SELECT id, name, email, mobile, role, state, district,
             assigned_state, assigned_district, assigned_local_body,
             assigned_local_body_id, assigned_department_id, is_active,
             local_body_type, ward_village, address
      FROM users WHERE id = ?
    `).get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or session has expired.',
      });
    }

    if (user.is_active === 0) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact your administrative authority.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or malformed authentication token.',
    });
  }
}

/**
 * Middleware: Optional authentication (attaches user if present, proceeds either way)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.prepare(`
      SELECT id, name, email, mobile, role, state, district,
             assigned_state, assigned_district, assigned_local_body,
             assigned_local_body_id, assigned_department_id, is_active,
             local_body_type, ward_village, address
      FROM users WHERE id = ?
    `).get(decoded.id);
    req.user = user && user.is_active !== 0 ? user : null;
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Middleware: Role-Based Access Control
 * Supports single or multiple roles, with 'ADMIN' covering any administrative tier.
 * @param {string|string[]} roles Allowed roles, e.g. 'ADMIN' or ['ADMIN', 'CITIZEN']
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = req.user.role;

    // Direct match
    if (roles.includes(userRole)) {
      return next();
    }

    // If 'ADMIN' is among required roles, any administrative tier qualifies
    if (roles.includes('ADMIN') && ADMIN_ROLES.includes(userRole)) {
      return next();
    }

    // National Super Admin has universal access to all admin functions
    if (userRole === 'NATIONAL_SUPER_ADMIN' || userRole === 'ADMIN') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: You do not have permission to perform this administrative action.',
    });
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  ADMIN_ROLES,
};
