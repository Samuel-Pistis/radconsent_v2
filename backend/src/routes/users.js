'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db       = require('../db/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const VALID_ROLES = ['radiographer', 'nurse', 'radiologist', 'admin'];

// All user routes require authentication
router.use(verifyToken);

// GET /api/users — list all users (admin only)
router.get('/', (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can view staff accounts.' });

  const users = db.all('users').map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.role,
    createdAt: u.createdAt, updatedAt: u.updatedAt,
  }));
  return res.json(users);
});

// POST /api/users — create a new staff account (admin only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can create staff accounts.' });

  const { name, email, role, password } = req.body || {};

  if (!name?.trim())    return res.status(400).json({ error: 'Name is required.' });
  if (!email?.trim())   return res.status(400).json({ error: 'Email is required.' });
  if (!role)            return res.status(400).json({ error: 'Role is required.' });
  if (!password)        return res.status(400).json({ error: 'Initial password is required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });

  const normalEmail = email.toLowerCase().trim();
  const existing = db.findOne('users', { email: normalEmail });
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const hashed = await bcrypt.hash(password, 10);
  const user = db.insert('users', {
    name : name.trim(),
    email: normalEmail,
    role,
    password: hashed,
  });

  return res.status(201).json({
    id: user.id, name: user.name, email: user.email,
    role: user.role, createdAt: user.createdAt,
  });
});

// PUT /api/users/:id — update name / email / role (admin only)
router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can edit staff accounts.' });

  const { name, email, role } = req.body || {};
  const existing = db.findOne('users', { id: req.params.id });
  if (!existing) return res.status(404).json({ error: 'User not found.' });

  const updates = {};
  if (name?.trim())  updates.name  = name.trim();
  if (role) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    updates.role = role;
  }
  if (email?.trim()) {
    const normalEmail = email.toLowerCase().trim();
    const conflict = db.findOne('users', { email: normalEmail });
    if (conflict && conflict.id !== req.params.id)
      return res.status(409).json({ error: 'That email is already in use by another account.' });
    updates.email = normalEmail;
  }

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'No valid fields to update.' });

  const updated = db.update('users', req.params.id, updates);
  return res.json({
    id: updated.id, name: updated.name, email: updated.email,
    role: updated.role, updatedAt: updated.updatedAt,
  });
});

// PUT /api/users/:id/password — change a user's password
//   Admin can reset any account's password.
//   Any user can change their own password (must supply currentPassword).
router.put('/:id/password', async (req, res) => {
  const isSelf  = req.user.id === req.params.id;
  const isAdmin = req.user.role === 'admin';

  if (!isSelf && !isAdmin)
    return res.status(403).json({ error: 'You can only change your own password.' });

  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword) return res.status(400).json({ error: 'New password is required.' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const user = db.findOne('users', { id: req.params.id });
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Non-admin changing own password must verify current password
  if (isSelf && !isAdmin) {
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required.' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  db.update('users', req.params.id, { password: hashed });
  return res.json({ ok: true });
});

// DELETE /api/users/:id — delete a staff account (admin only, cannot delete own)
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can delete staff accounts.' });
  if (req.user.id === req.params.id)
    return res.status(400).json({ error: 'You cannot delete your own account.' });

  const ok = db.remove('users', req.params.id);
  if (!ok) return res.status(404).json({ error: 'User not found.' });
  return res.json({ ok: true });
});

module.exports = router;
