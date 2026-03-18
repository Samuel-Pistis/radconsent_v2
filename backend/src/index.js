'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRouter     = require('./routes/auth');
const consentsRouter = require('./routes/consents');
const usersRouter    = require('./routes/users');
const auditRouter    = require('./routes/audit');
const settingsRouter = require('./routes/settings');

const PORT = process.env.PORT || 4000;

const app = express();

// ── CORS ─────────────────────────────────────────────────────
// Restrict to localhost and LAN origins only.
// For clinic LAN deployment, all traffic comes from the same
// local network — no need to accept cross-origin requests from
// arbitrary external domains.
const ALLOWED_ORIGINS = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (same-origin, mobile apps, Postman)
    if (!origin || ALLOWED_ORIGINS.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin not allowed — ${origin}`));
  },
  credentials: true,
}));

// ── Body parser ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── CSP ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
    ].join('; ')
  );
  next();
});

// ── API routes ──────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/consents', consentsRouter);
app.use('/api/users',    usersRouter);
app.use('/api/audit',    auditRouter);
app.use('/api/settings', settingsRouter);

// ── Serve frontend ──────────────────────────────────────────
const FRONTEND = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(FRONTEND));

// Catch-all: return index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`RadConsent running at http://localhost:${PORT}`);
});
