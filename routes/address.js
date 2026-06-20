const express = require('express');
const router  = express.Router();
const { run, get, all, runInsert } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/addresses
router.get('/', authenticate, (req, res) => {
  const addrs = all(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
    [req.user.id]
  );
  res.json(addrs);
});

// POST /api/addresses
router.post('/', authenticate, (req, res) => {
  try {
    const { name, phone, line1, line2, city, state, pincode, is_default } = req.body;
    if (!name || !phone || !line1 || !city || !state || !pincode)
      return res.status(400).json({ error: 'All required address fields must be filled.' });
    if (!/^[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
    if (!/^\d{6}$/.test(pincode))
      return res.status(400).json({ error: 'Enter a valid 6-digit pincode.' });
    if (is_default) {
      run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }
    const hasAny = get('SELECT id FROM addresses WHERE user_id = ?', [req.user.id]);
    const setDefault = is_default || !hasAny ? 1 : 0;
    const id = runInsert(
      'INSERT INTO addresses (user_id, name, phone, line1, line2, city, state, pincode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, phone, line1, line2 || null, city, state, pincode, setDefault]
    );
    res.status(201).json(get('SELECT * FROM addresses WHERE id = ?', [id]));
  } catch (e) {
    res.status(500).json({ error: 'Could not save address.' });
  }
});

// PUT /api/addresses/:id/default
router.put('/:id/default', authenticate, (req, res) => {
  try {
    const addr = get('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Address not found.' });
    run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    run('UPDATE addresses SET is_default = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Default address updated.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not update default address.' });
  }
});

// DELETE /api/addresses/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const addr = get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Address not found.' });
    run('DELETE FROM addresses WHERE id = ?', [req.params.id]);
    if (addr.is_default) {
      const next = get('SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
      if (next) run('UPDATE addresses SET is_default = 1 WHERE id = ?', [next.id]);
    }
    res.json({ message: 'Address removed.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not delete address.' });
  }
});

module.exports = router;
