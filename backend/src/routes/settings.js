'use strict';

const express  = require('express');
const router   = express.Router();
const { pool } = require('../db/db-setup');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const ALLOWED_KEYS = new Set(['center_logo', 'center_name', 'center_address']);

// GET /api/settings/:key
// Requires authentication so we can scope to clinicId
router.get('/:key', verifyToken, async (req, res) => {
  if (!ALLOWED_KEYS.has(req.params.key))
    return res.status(400).json({ error: 'Unknown setting key.' });
  try {
    const result = await pool.query(
      `SELECT value FROM settings WHERE "clinicId" = $1 AND key = $2`,
      [req.user.clinicId, req.params.key]
    );
    if (!result.rows[0]) return res.json({ value: null });
    res.json({ value: result.rows[0].value });
  } catch (err) {
    console.error('Fetch setting error:', err);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key
// Admin only
router.put('/:key', verifyToken, requireRole('admin'), async (req, res) => {
  if (!ALLOWED_KEYS.has(req.params.key))
    return res.status(400).json({ error: 'Unknown setting key.' });
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({ error: 'Value is required' });

  try {
    await pool.query(
      `INSERT INTO settings ("clinicId", key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT ("clinicId", key) DO UPDATE SET value = EXCLUDED.value`,
      [req.user.clinicId, req.params.key, value]
    );
    await logAction(req, 'SETTING_UPDATED', 'setting', req.params.key);
    res.json({ ok: true });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

module.exports = router;
