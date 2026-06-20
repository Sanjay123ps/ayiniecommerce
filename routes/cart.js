const express = require('express');
const router  = express.Router();
const { run, get, all, runInsert, calcShipping, validateCoupon } = require('../db');
const { authenticate } = require('../middleware/auth');

function buildCart(userId) {
  const items = all(`
    SELECT c.product_id, c.quantity, p.name, p.price, p.unit, p.emoji
    FROM cart c
    JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ? AND p.active = 1
    ORDER BY c.added_at ASC
  `, [userId]);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping  = calcShipping(subtotal);
  return { items, subtotal, shipping, item_count: items.length };
}

// GET /api/cart
router.get('/', authenticate, (req, res) => {
  res.json(buildCart(req.user.id));
});

// POST /api/cart
router.post('/', authenticate, (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required.' });
    const product = get('SELECT id FROM products WHERE id = ? AND active = 1', [product_id]);
    if (!product)   return res.status(404).json({ error: 'Product not found.' });
    const qty = Math.max(1, Math.min(99, parseInt(quantity)));
    const existing = get('SELECT id FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing) {
      run('UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
          [qty, req.user.id, product_id]);
    } else {
      runInsert('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [req.user.id, product_id, qty]);
    }
    res.json(buildCart(req.user.id));
  } catch (e) {
    res.status(500).json({ error: 'Could not add to cart.' });
  }
});

// PUT /api/cart/:product_id
router.put('/:product_id', authenticate, (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1)
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    const item = get('SELECT id FROM cart WHERE user_id = ? AND product_id = ?',
                     [req.user.id, req.params.product_id]);
    if (!item) return res.status(404).json({ error: 'Item not in cart.' });
    run('UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
        [Math.min(99, qty), req.user.id, req.params.product_id]);
    res.json(buildCart(req.user.id));
  } catch (e) {
    res.status(500).json({ error: 'Could not update cart.' });
  }
});

// DELETE /api/cart/:product_id
router.delete('/:product_id', authenticate, (req, res) => {
  try {
    run('DELETE FROM cart WHERE user_id = ? AND product_id = ?',
        [req.user.id, req.params.product_id]);
    res.json(buildCart(req.user.id));
  } catch (e) {
    res.status(500).json({ error: 'Could not remove item.' });
  }
});

// DELETE /api/cart
router.delete('/', authenticate, (req, res) => {
  try {
    run('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ items: [], subtotal: 0, shipping: 50, item_count: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Could not clear cart.' });
  }
});

// POST /api/cart/coupon
router.post('/coupon', authenticate, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code is required.' });
    const cart = buildCart(req.user.id);
    if (!cart.items.length) return res.status(400).json({ error: 'Your cart is empty.' });
    const { discount, coupon } = validateCoupon(code, cart.subtotal);
    res.json({
      discount,
      code:    coupon.code,
      message: `Coupon applied! You save ₹${discount}.`,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
