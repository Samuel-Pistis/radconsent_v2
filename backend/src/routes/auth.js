'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const db       = require('../db/database');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.findOne('users', { email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const token   = signToken(payload);

  return res.json({ token, user: payload });
});

module.exports = router;
