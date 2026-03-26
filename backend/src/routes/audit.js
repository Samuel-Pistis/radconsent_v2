'use strict';

const express = require('express');
const router  = express.Router();
const { pool } = require('../db/db-setup');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/audit?page=1
// Fetch audit logs with pagination, 100 per page (Admin only)
const PAGE_SIZE = 100;

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const clinicId = req.user.clinicId;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS n FROM audit_logs WHERE "clinicId" = $1`,
      [clinicId]
    );
    const total = parseInt(countResult.rows[0].n);

    const logsResult = await pool.query(
      `SELECT * FROM audit_logs WHERE "clinicId" = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3`,
      [clinicId, PAGE_SIZE, offset]
    );

    // Parse JSON details if present
    const parsedLogs = logsResult.rows.map(log => {
      if (log.details && typeof log.details === 'string' && log.details.startsWith('{')) {
        try { log.details = JSON.parse(log.details); } catch (e) {}
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
