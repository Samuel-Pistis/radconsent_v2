'use strict';

const jwt    = require('jsonwebtoken');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ── JWT Secret bootstrap ─────────────────────────────────────
// If JWT_SECRET env var is set, use it directly.
// Otherwise, auto-generate a strong random secret on first run
// and persist it to backend/.env so it survives restarts.
function loadOrGenerateSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const envPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^JWT_SECRET=(.+)$/);
      if (m) return m[1].trim();
    }
  }

  // Generate a fresh 64-byte hex secret
  const secret = crypto.randomBytes(64).toString('hex');
  const entry  = `JWT_SECRET=${secret}\n`;
  fs.appendFileSync(envPath, entry, 'utf8');
  console.log('[Auth] Generated new JWT_SECRET and saved to backend/.env');
  return secret;
}

const JWT_SECRET     = loadOrGenerateSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ═══════════════════════════════════════════════════════════════
//  Token utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Sign a JWT with the given payload.
 * Payload should include: { id, email, role, name, clinicId }
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Sign a super-admin JWT.
 * Payload should include: { id, email, role: 'super_admin' }
 */
function signSuperToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ═══════════════════════════════════════════════════════════════
//  Middleware: verifyToken
// ═══════════════════════════════════════════════════════════════

/**
 * Express middleware. Extracts and verifies the Bearer token from the
 * Authorization header. On success, attaches the decoded payload to
 * req.user and calls next(). On failure, returns 401.
 *
 * Usage:
 *   router.get('/protected', verifyToken, handler)
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, name, clinicId, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  Middleware: verifySuperToken
// ═══════════════════════════════════════════════════════════════

/**
 * Express middleware for super-admin routes.
 * Verifies the Bearer token and enforces role === 'super_admin'.
 *
 * Usage:
 *   router.get('/clinics', verifySuperToken, handler)
 */
function verifySuperToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super-admin access required.' });
    }
    req.user = decoded; // { id, email, role: 'super_admin', iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  Middleware factory: requireRole
// ═══════════════════════════════════════════════════════════════

/**
 * Returns Express middleware that restricts access to users whose role
 * is in the provided list. Must be placed after verifyToken in the chain.
 *
 * Valid roles: 'radiographer' | 'nurse' | 'radiologist' | 'admin'
 *
 * Usage:
 *   router.post('/sign-off', verifyToken, requireRole('radiologist', 'admin'), handler)
 *
 * @param {...string} roles - One or more allowed roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

// ═══════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  signToken,
  signSuperToken,
  verifyToken,
  verifySuperToken,
  requireRole,
};
