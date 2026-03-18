'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'database.sqlite');
const LEGACY_JSON = path.join(__dirname, 'data.json');

// Connect to SQLite
const db = new Database(DB_FILE, { verbose: null }); // Set to console.log for debugging

// ═══════════════════════════════════════════════════════════════
//  Schema Setup
// ═══════════════════════════════════════════════════════════════
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      modality TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      consentMode TEXT,              -- Stored as string
      bodyPart TEXT,                 -- Stored as string
      patient TEXT NOT NULL,         -- Stored as JSON string
      tierFlags TEXT NOT NULL,       -- Stored as JSON string
      stage1 TEXT,                   -- Stored as JSON string
      stage2 TEXT,                   -- Stored as JSON string
      stage3 TEXT,                   -- Stored as JSON string
      radiologistReview TEXT,        -- Stored as JSON string
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      closedAt TEXT
    );
  `);
}

// ═══════════════════════════════════════════════════════════════
//  Data Migration (JSON -> SQLite)
// ═══════════════════════════════════════════════════════════════
function migrateFromJSON() {
  if (!fs.existsSync(LEGACY_JSON)) return;

  console.log('[DB] Found legacy data.json, migrating to SQLite...');
  const data = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'));

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password, role, name, createdAt, updatedAt)
    VALUES (@id, @email, @password, @role, @name, @createdAt, @updatedAt)
  `);

  const insertConsent = db.prepare(`
    INSERT OR IGNORE INTO consents (
      id, status, modality, language, patient, tierFlags, stage1, stage2, stage3, radiologistReview, createdAt, updatedAt, closedAt
    ) VALUES (
      @id, @status, @modality, @language, @patient, @tierFlags, @stage1, @stage2, @stage3, @radiologistReview, @createdAt, @updatedAt, @closedAt
    )
  `);

  const transaction = db.transaction((users, consents) => {
    for (const u of users || []) {
      insertUser.run(u);
    }
    for (const c of consents || []) {
      insertConsent.run({
        ...c,
        patient: JSON.stringify(c.patient || {}),
        tierFlags: JSON.stringify(c.tierFlags || {}),
        stage1: c.stage1 ? JSON.stringify(c.stage1) : null,
        stage2: c.stage2 ? JSON.stringify(c.stage2) : null,
        stage3: c.stage3 ? JSON.stringify(c.stage3) : null,
        radiologistReview: c.radiologistReview ? JSON.stringify(c.radiologistReview) : null
      });
    }
  });

  transaction(data.users, data.consents);
  console.log('[DB] Migration complete. Renaming legacy data.json to data.json.bak');
  fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.bak');
}

initSchema();

// ═══════════════════════════════════════════════════════════════
//  Schema Migrations
// ═══════════════════════════════════════════════════════════════
function runMigrations() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN failedAttempts INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN lockedUntil TEXT DEFAULT NULL`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      userId TEXT,
      action TEXT NOT NULL,
      resourceType TEXT,
      resourceId TEXT,
      details TEXT,
      ipAddress TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}
runMigrations();
migrateFromJSON();

module.exports = db;
