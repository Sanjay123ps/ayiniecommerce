const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { get, run } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = get(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const hash = user.password_hash;

    const match = await bcrypt.compare(password, hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;

    res.json({ token, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existing = get(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email.toLowerCase(), hash]
    );

    res.json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;