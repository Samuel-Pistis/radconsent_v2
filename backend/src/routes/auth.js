'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const { pool } = require('../db/db-setup');
const db       = require('../db/database');
const { signToken, verifyToken } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
//  IP-based rate limiting (in-memory)
// ═══════════════════════════════════════════════════════════════
const RATE_LIMIT_WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX        = 5;               // max attempts per window

const ipAttempts = new Map(); // ip → { count, firstAttemptAt }

function checkIpRateLimit(ip) {
  const entry = ipAttempts.get(ip);
  if (!entry) return true;

  // Window expired — reset
  if (Date.now() - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    ipAttempts.delete(ip);
    return true;
  }
  return entry.count < RATE_LIMIT_MAX;
}

function recordIpFailure(ip) {
  const entry = ipAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, firstAttemptAt: Date.now() });
  } else {
    entry.count++;
  }
}

function clearIpAttempts(ip) {
  ipAttempts.delete(ip);
}

// Periodic cleanup (every 30 min) to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipAttempts) {
    if (now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) ipAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
//  Account lockout constants
// ═══════════════════════════════════════════════════════════════
const ACCOUNT_LOCK_THRESHOLD = 5;              // consecutive failures
const ACCOUNT_LOCK_DURATION  = 30 * 60 * 1000; // 30 minutes

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/login
// ═══════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  const { email, password, clinicSlug } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!clinicSlug) {
    return res.status(400).json({ error: 'Clinic identifier is required.' });
  }

  // ── IP rate-limit check ──────────────────────────────────
  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many login attempts. Please wait 15 minutes and try again.',
    });
  }

  // ── Resolve clinic by slug ───────────────────────────────
  let clinic;
  try {
    const clinicResult = await pool.query(
      `SELECT * FROM clinics WHERE slug = $1 AND "isActive" = TRUE`,
      [clinicSlug.toLowerCase().trim()]
    );
    clinic = clinicResult.rows[0] || null;
  } catch (err) {
    console.error('[Auth] Clinic lookup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  if (!clinic) {
    recordIpFailure(ip);
    return res.status(401).json({ error: 'Invalid clinic or credentials.' });
  }

  const clinicId = clinic.id;

  // ── Find user scoped to clinic ───────────────────────────
  let user;
  try {
    user = await db.findOne('users', { email: email.toLowerCase().trim() }, clinicId);
  } catch (err) {
    console.error('[Auth] User lookup error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  if (!user) {
    recordIpFailure(ip);
    // Attach a synthetic clinicId so logAction can record it
    req.user = { clinicId };
    await logAction(req, 'LOGIN_FAILED', 'user', null, { reason: 'invalid_credentials', email });
    req.user = null;
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Attach partial user for logging purposes (clinicId available)
  req.user = { id: user.id, clinicId };

  // ── Account lockout check ────────────────────────────────
  if (user.lockedUntil) {
    const lockExpiry = new Date(user.lockedUntil).getTime();
    if (Date.now() < lockExpiry) {
      const minsLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account is temporarily locked. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`,
      });
    }
    // Lock expired — reset
    await db.update('users', user.id, { failedAttempts: 0, lockedUntil: null }, clinicId);
    user.failedAttempts = 0;
    user.lockedUntil = null;
  }

  // ── Password check ──────────────────────────────────────
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    recordIpFailure(ip);

    const attempts = (user.failedAttempts || 0) + 1;
    const updates  = { failedAttempts: attempts };

    if (attempts >= ACCOUNT_LOCK_THRESHOLD) {
      updates.lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION).toISOString();
      await db.update('users', user.id, updates, clinicId);
      await logAction(req, 'ACCOUNT_LOCKED', 'user', user.id, { reason: 'too_many_failures' });
      return res.status(423).json({
        error: 'Account locked due to too many failed attempts. Try again in 30 minutes.',
      });
    }

    await db.update('users', user.id, updates, clinicId);
    const remaining = ACCOUNT_LOCK_THRESHOLD - attempts;
    await logAction(req, 'LOGIN_FAILED', 'user', user.id, { reason: 'invalid_password' });
    return res.status(401).json({
      error: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock.`,
    });
  }

  // ── Success — reset counters & issue token ──────────────
  clearIpAttempts(ip);
  if (user.failedAttempts > 0 || user.lockedUntil) {
    await db.update('users', user.id, { failedAttempts: 0, lockedUntil: null }, clinicId);
  }

  const payload = { id: user.id, email: user.email, role: user.role, name: user.name, clinicId };
  const token   = signToken(payload);

  // req.user already set above; update to full payload for logging
  req.user = payload;
  await logAction(req, 'LOGIN_SUCCESS', 'user', user.id);
  return res.json({ token, user: payload });
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/auth/me — validate session & return current user
// ═══════════════════════════════════════════════════════════════
router.get('/me', verifyToken, async (req, res) => {
  const user = await db.findOne('users', { id: req.user.id }, req.user.clinicId);
  if (!user) {
    return res.status(401).json({ error: 'Account no longer exists.' });
  }

  // Check if account is locked
  if (user.lockedUntil && Date.now() < new Date(user.lockedUntil).getTime()) {
    return res.status(423).json({ error: 'Account is currently locked.' });
  }

  return res.json({
    id      : user.id,
    email   : user.email,
    name    : user.name,
    role    : user.role,
    clinicId: user.clinicId,
  });
});

module.exports = router;
