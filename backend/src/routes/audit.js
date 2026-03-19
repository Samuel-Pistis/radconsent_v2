'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/db-setup');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/audit?page=1
// Fetch audit logs with pagination, 100 per page (Admin only)
const PAGE_SIZE = 100;
router.get('/', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const total  = db.prepare('SELECT COUNT(*) as n FROM audit_logs').get().n;
    const logs   = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(PAGE_SIZE, offset);

    // Parse JSON details if present
    const parsedLogs = logs.map(log => {
      if (log.details && log.details.startsWith('{')) {
        try { log.details = JSON.parse(log.details); } catch(e) {}
      }
      return log;
    });

    res.json({ logs: parsedLogs, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
