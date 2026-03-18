'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/db-setup');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

// GET /api/settings/:key
// Public endpoint
router.get('/:key', (req, res) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    if (!setting) return res.json({ value: null });
    res.json({ value: setting.value });
  } catch (err) {
    console.error('Fetch setting error:', err);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key
// Admin only
router.put('/:key', verifyToken, requireRole('admin'), (req, res) => {
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({ error: 'Value is required' });

  try {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    
    stmt.run(req.params.key, value);
    logAction(req, 'SETTING_UPDATED', 'setting', req.params.key);
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

module.exports = router;
