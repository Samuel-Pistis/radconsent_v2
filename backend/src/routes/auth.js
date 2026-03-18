'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
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
  const { email, password } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // ── IP rate-limit check ──────────────────────────────────
  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many login attempts. Please wait 15 minutes and try again.',
    });
  }

  const user = db.findOne('users', { email: email.toLowerCase().trim() });
  if (!user) {
    recordIpFailure(ip);
    logAction(req, 'LOGIN_FAILED', 'user', null, { reason: 'invalid_credentials', email: email });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

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
    db.update('users', user.id, { failedAttempts: 0, lockedUntil: null });
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
      db.update('users', user.id, updates);
      logAction(req, 'ACCOUNT_LOCKED', 'user', user.id, { reason: 'too_many_failures' });
      return res.status(423).json({
        error: 'Account locked due to too many failed attempts. Try again in 30 minutes.',
      });
    }

    db.update('users', user.id, updates);
    const remaining = ACCOUNT_LOCK_THRESHOLD - attempts;
    logAction(req, 'LOGIN_FAILED', 'user', user.id, { reason: 'invalid_password' });
    return res.status(401).json({
      error: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock.`,
    });
  }

  // ── Success — reset counters & issue token ──────────────
  clearIpAttempts(ip);
  if (user.failedAttempts > 0 || user.lockedUntil) {
    db.update('users', user.id, { failedAttempts: 0, lockedUntil: null });
  }

  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const token   = signToken(payload);

  logAction(req, 'LOGIN_SUCCESS', 'user', user.id);
  return res.json({ token, user: payload });
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/auth/me — validate session & return current user
// ═══════════════════════════════════════════════════════════════
router.get('/me', verifyToken, (req, res) => {
  const user = db.findOne('users', { id: req.user.id });
  if (!user) {
    return res.status(401).json({ error: 'Account no longer exists.' });
  }

  // Check if account is locked
  if (user.lockedUntil && Date.now() < new Date(user.lockedUntil).getTime()) {
    return res.status(423).json({ error: 'Account is currently locked.' });
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

module.exports = router;
