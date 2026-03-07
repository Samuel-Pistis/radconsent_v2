'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRouter     = require('./routes/auth');
const consentsRouter = require('./routes/consents');

const PORT = process.env.PORT || 3000;

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── CSP ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
    ].join('; ')
  );
  next();
});

// ── API routes ──────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/consents', consentsRouter);

// ── Serve frontend ──────────────────────────────────────────
const FRONTEND = path.join(__dirname, '..', '..', 'frontend-dist');
app.use(express.static(FRONTEND));

// Catch-all: return index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`RadConsent running at http://localhost:${PORT}`);
});
