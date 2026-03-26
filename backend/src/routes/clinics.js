'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/db-setup');
const { signSuperToken, verifySuperToken } = require('../middleware/auth');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
//  POST /api/super/login — super-admin authentication
// ═══════════════════════════════════════════════════════════════
router.post('/super/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const result = await pool.query(
      `SELECT * FROM super_admins WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const admin = result.rows[0] || null;

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = { id: admin.id, email: admin.email, role: 'super_admin', name: admin.name };
    const token   = signSuperToken(payload);

    return res.json({ token, user: payload });
  } catch (err) {
    console.error('[Super Login] Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/clinics — create a new clinic + initial admin user
// ═══════════════════════════════════════════════════════════════
router.post('/clinics', verifySuperToken, async (req, res) => {
  const { name, slug, adminName, adminEmail, adminPassword } = req.body || {};

  if (!name?.trim())          return res.status(400).json({ error: 'Clinic name is required.' });
  if (!slug?.trim())          return res.status(400).json({ error: 'Clinic slug is required.' });
  if (!adminName?.trim())     return res.status(400).json({ error: 'Admin name is required.' });
  if (!adminEmail?.trim())    return res.status(400).json({ error: 'Admin email is required.' });
  if (!adminPassword)         return res.status(400).json({ error: 'Admin password is required.' });
  if (adminPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const normalSlug  = slug.toLowerCase().trim().replace(/\s+/g, '-');
  const normalEmail = adminEmail.toLowerCase().trim();

  try {
    // Check slug uniqueness
    const slugCheck = await pool.query(
      `SELECT id FROM clinics WHERE slug = $1`,
      [normalSlug]
    );
    if (slugCheck.rows.length > 0)
      return res.status(409).json({ error: 'A clinic with that slug already exists.' });

    const now      = new Date().toISOString();
    const clinicId = uuidv4();
    const userId   = uuidv4();

    // Create clinic
    await pool.query(
      `INSERT INTO clinics (id, name, slug, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, TRUE, $4, $5)`,
      [clinicId, name.trim(), normalSlug, now, now]
    );

    // Create initial admin user for the clinic
    const hashed = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (id, "clinicId", name, email, role, password, "failedAttempts", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'admin', $5, 0, $6, $7)`,
      [userId, clinicId, adminName.trim(), normalEmail, hashed, now, now]
    );

    console.log(`[Clinics] Created clinic "${name}" (${normalSlug}) with admin ${normalEmail}`);
    return res.status(201).json({
      clinic: { id: clinicId, name: name.trim(), slug: normalSlug, isActive: true, createdAt: now },
      admin:  { id: userId, email: normalEmail, name: adminName.trim(), role: 'admin' },
    });
  } catch (err) {
    console.error('[Clinics] Create error:', err);
    return res.status(500).json({ error: 'Failed to create clinic.' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/clinics — list all clinics
// ═══════════════════════════════════════════════════════════════
router.get('/clinics', verifySuperToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, "isActive", "createdAt", "updatedAt" FROM clinics ORDER BY "createdAt" DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[Clinics] List error:', err);
    return res.status(500).json({ error: 'Failed to fetch clinics.' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/clinics/:id — update clinic name or isActive status
// ═══════════════════════════════════════════════════════════════
router.patch('/clinics/:id', verifySuperToken, async (req, res) => {
  const { name, isActive } = req.body || {};
  const updates = [];
  const values  = [];
  let   idx     = 1;

  if (name?.trim())          { updates.push(`name = $${idx++}`);       values.push(name.trim()); }
  if (isActive !== undefined) { updates.push(`"isActive" = $${idx++}`); values.push(!!isActive);  }

  if (updates.length === 0)
    return res.status(400).json({ error: 'No valid fields to update.' });

  updates.push(`"updatedAt" = $${idx++}`);
  values.push(new Date().toISOString());
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE clinics SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Clinic not found.' });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[Clinics] Update error:', err);
    return res.status(500).json({ error: 'Failed to update clinic.' });
  }
});

module.exports = router;
