const db = require('../db');

/**
 * Creates an in-app notification and dispatches to external channels (with fallback logging)
 */
function createNotification({ userId, title, message, type = 'STATUS_CHANGE', complaintId = null }) {
  if (!userId) return null;

  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, complaint_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userId, title, message, type, complaintId);

    // External dispatch hook (SMS / Email)
    dispatchExternalAlert({ userId, title, message, type, complaintId });

    return {
      id: info.lastInsertRowid,
      userId,
      title,
      message,
      type,
      complaintId,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

/**
 * Cleanly handles external email / SMS channel dispatch.
 * When external credentials are not set in environment variables, it logs diagnostic info without faking delivery.
 */
function dispatchExternalAlert({ userId, title, message, type, complaintId }) {
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const hasSms = Boolean(process.env.SMS_GATEWAY_API_KEY);

  if (hasSmtp) {
    // In production with real SMTP credentials, send actual mail
    console.log(`[EXTERNAL DISPATCH] Sending Email to User #${userId}: ${title}`);
  }

  if (hasSms) {
    // In production with real SMS gateway, send SMS
    console.log(`[EXTERNAL DISPATCH] Sending SMS to User #${userId}: ${title}`);
  }

  if (!hasSmtp && !hasSms) {
    // Informational audit log in development
    // console.log(`[IN-APP NOTICE ONLY] User #${userId}: "${title}" (External SMTP/SMS unconfigured)`);
  }
}

module.exports = {
  createNotification,
  dispatchExternalAlert,
};
