'use strict';

const { pool } = require('../db/db-setup');

/**
 * Log an action to the audit trail
 * @param {Object} req - Express request object (used to extract IP and User)
 * @param {string} action - Action identifier (e.g., 'LOGIN_SUCCESS', 'CONSENT_CREATED')
 * @param {string} resourceType - Type of resource affected (e.g., 'consent', 'user')
 * @param {string} resourceId - ID of the resource affected
 * @param {Object|string} details - Additional contextual details
 */
async function logAction(req, action, resourceType = null, resourceId = null, details = null) {
  try {
    const userId   = req?.user?.id || req?.body?.email || 'system';
    const clinicId = req?.user?.clinicId || null;

    // Attempt to get the real IP if behind a proxy
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown';

    const timestamp  = new Date().toISOString();
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    await pool.query(
      `INSERT INTO audit_logs (timestamp, "clinicId", "userId", action, "resourceType", "resourceId", details, "ipAddress")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [timestamp, clinicId, userId, action, resourceType, resourceId, detailsStr, ipAddress]
    );
  } catch (err) {
    console.error('[Audit Logger Error]: Failed to write log', err);
  }
}

module.exports = { logAction };
