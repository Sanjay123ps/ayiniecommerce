const express = require('express');
const router  = express.Router();
const { run, get, all, runInsert } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/wishlist
router.get('/', authenticate, (req, res) => {
  const items = all(`
    SELECT w.id, w.product_id, w.added_at, p.name, p.price, p.unit, p.emoji, p.badge, p.category
    FROM wishlist w
    JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ? AND p.active = 1
    ORDER BY w.added_at DESC
  `, [req.user.id]);
  res.json(items);
});

// POST /api/wishlist
router.post('/', authenticate, (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required.' });
    const product = get('SELECT id FROM products WHERE id = ? AND active = 1', [product_id]);
    if (!product)   return res.status(404).json({ error: 'Product not found.' });
    const existing  = get('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing)   return res.status(409).json({ error: 'Already in wishlist.' });
    runInsert('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
    res.status(201).json({ message: 'Added to wishlist.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not add to wishlist.' });
  }
});

// DELETE /api/wishlist/:product_id
router.delete('/:product_id', authenticate, (req, res) => {
  try {
    run('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.product_id]);
    res.json({ message: 'Removed from wishlist.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not remove from wishlist.' });
  }
});

module.exports = router;
