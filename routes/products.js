const express = require('express');
const router  = express.Router();
const { all, get } = require('../db');

// GET /api/products
router.get('/', (req, res) => {
  try {
    const { category, search, limit } = req.query;
    let sql    = 'SELECT * FROM products WHERE active = 1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search)   { sql += ' AND name LIKE ?';  params.push(`%${search}%`); }
    sql += ' ORDER BY id ASC';
    if (limit)    { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    const products = all(sql, params);
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Could not fetch products.' });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ? AND active = 1', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
});

module.exports = router;