'use strict';

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Pool ──────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Schema ────────────────────────────────────────────────────
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinics (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT UNIQUE NOT NULL,
      logo        TEXT,
      "isActive"  BOOLEAN DEFAULT TRUE,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS super_admins (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      name        TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id                TEXT PRIMARY KEY,
      "clinicId"        TEXT REFERENCES clinics(id) ON DELETE CASCADE,
      email             TEXT NOT NULL,
      password          TEXT NOT NULL,
      role              TEXT NOT NULL,
      name              TEXT NOT NULL,
      "failedAttempts"  INTEGER DEFAULT 0,
      "lockedUntil"     TEXT,
      "createdAt"       TEXT NOT NULL,
      "updatedAt"       TEXT NOT NULL,
      UNIQUE("clinicId", email)
    );

    CREATE TABLE IF NOT EXISTS consents (
      id                   TEXT PRIMARY KEY,
      "clinicId"           TEXT REFERENCES clinics(id) ON DELETE CASCADE,
      status               TEXT NOT NULL,
      modality             TEXT NOT NULL,
      language             TEXT DEFAULT 'en',
      "consentMode"        TEXT,
      "bodyPart"           TEXT,
      patient              JSONB,
      "tierFlags"          JSONB,
      stage1               JSONB,
      stage2               JSONB,
      stage3               JSONB,
      "radiologistReview"  JSONB,
      "createdAt"          TEXT NOT NULL,
      "updatedAt"          TEXT NOT NULL,
      "closedAt"           TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id               SERIAL PRIMARY KEY,
      "clinicId"       TEXT,
      timestamp        TEXT NOT NULL,
      "userId"         TEXT,
      action           TEXT NOT NULL,
      "resourceType"   TEXT,
      "resourceId"     TEXT,
      details          TEXT,
      "ipAddress"      TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      "clinicId"  TEXT REFERENCES clinics(id) ON DELETE CASCADE,
      key         TEXT NOT NULL,
      value       TEXT,
      PRIMARY KEY ("clinicId", key)
    );
  `);
  console.log('[DB] Schema ready');
}

// ── Seed default super-admin ──────────────────────────────────
async function seedSuperAdmin() {
  const res = await pool.query('SELECT COUNT(*) AS n FROM super_admins');
  if (parseInt(res.rows[0].n) > 0) return;

  const now  = new Date().toISOString();
  const hash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'superadmin1234', 10);
  await pool.query(
    `INSERT INTO super_admins (id, email, password, name, "createdAt") VALUES ($1,$2,$3,$4,$5)`,
    [uuidv4(), process.env.SUPER_ADMIN_EMAIL || 'super@radconsent.io', hash, 'Super Admin', now]
  );
  console.log('[DB] Super-admin seeded: ' + (process.env.SUPER_ADMIN_EMAIL || 'super@radconsent.io'));
}

// ── Bootstrap ─────────────────────────────────────────────────
async function setup() {
  const client = await pool.connect();
  client.release();
  console.log('[DB] Connected to PostgreSQL');
  await initSchema();
  await seedSuperAdmin();
}

module.exports = { pool, setup };
