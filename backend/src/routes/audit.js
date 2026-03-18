'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/db-setup');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/audit
// Fetch latest 500 audit logs (Admin only)
router.get('/', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 500
    `).all();

    // Parse JSON details if present
    const parsedLogs = logs.map(log => {
      if (log.details && log.details.startsWith('{')) {
        try { log.details = JSON.parse(log.details); } catch(e) {}
      }
      return log;
    });

    res.json(parsedLogs);
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
