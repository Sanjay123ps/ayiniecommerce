const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { run, get, all, runInsert } = require('../db');
const admin   = require('../middleware/admin');
const { getOrderDetail } = require('./orders');

const JWT_SECRET = process.env.JWT_SECRET || 'ayini-dev-secret';

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    
    const user = get('SELECT * FROM users WHERE email = ? AND role = ?', [email.toLowerCase(), 'admin']);
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials.' });

    console.log('Admin user keys:', Object.keys(user));
    console.log('password_hash value:', user.password_hash);

    if (!user.password_hash) {
      return res.status(500).json({ error: 'No password hash found. Keys: ' + Object.keys(user).join(', ') });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid admin credentials.' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Admin login error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/verify
router.get('/verify', admin, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email });
});

// GET /api/admin/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/admin/stats
router.get('/stats', admin, (req, res) => {
  try {
    const total_orders     = get('SELECT COUNT(*) as c FROM orders')?.c || 0;
    const total_revenue    = get('SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status != ?', ['cancelled'])?.s || 0;
    const total_customers  = get('SELECT COUNT(*) as c FROM users WHERE role = ?', ['customer'])?.c || 0;
    const pending_orders   = get('SELECT COUNT(*) as c FROM orders WHERE status = ?', ['pending'])?.c || 0;
    const orders_today     = get("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now')")?.c || 0;
    const revenue_today    = get("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'")?.s || 0;

    const status_breakdown = {};
    all('SELECT status, COUNT(*) as c FROM orders GROUP BY status').forEach(r => {
      status_breakdown[r.status] = r.c;
    });

    const top_products = all(`
      SELECT oi.name, SUM(oi.quantity) as count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled'
      GROUP BY oi.name ORDER BY count DESC LIMIT 6
    `);

    const recent_orders = all(`
      SELECT o.order_number, o.total, o.status, o.created_at, u.name as customer_name
      FROM orders o LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC LIMIT 5
    `);

    const recent_customers = all(
      'SELECT id, name, email, created_at FROM users WHERE role = ? ORDER BY created_at DESC LIMIT 5',
      ['customer']
    );

    res.json({
      total_orders, total_revenue, total_customers, pending_orders,
      orders_today, revenue_today, status_breakdown,
      top_products, recent_orders, recent_customers,
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

// GET /api/admin/orders
router.get('/orders', admin, (req, res) => {
  try {
    const { status, payment_method, search } = req.query;
    let sql    = `
      SELECT o.*, u.name as customer_name, u.phone as customer_phone,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    const params = [], where = [];
    if (status)         { where.push('o.status = ?');          params.push(status); }
    if (payment_method) { where.push('o.payment_method = ?');  params.push(payment_method); }
    if (search)         { where.push('(o.order_number LIKE ? OR u.name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (where.length)   sql += ' WHERE ' + where.join(' AND ');
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    res.json(all(sql, params));
  } catch (e) {
    res.status(500).json({ error: 'Could not fetch orders.' });
  }
});

// GET /api/admin/orders/:id
router.get('/orders/:id', admin, (req, res) => {
  const order = getOrderDetail(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', admin, (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','processing','shipped','delivered','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const timestamps = {
      confirmed:  'confirmed_at',
      processing: 'processing_at',
      shipped:    'shipped_at',
      delivered:  'delivered_at',
      cancelled:  'cancelled_at',
    };
    let sql = 'UPDATE orders SET status = ?';
    const params = [status];
    if (timestamps[status]) { sql += `, ${timestamps[status]} = datetime('now')`; }
    sql += ' WHERE id = ?'; params.push(req.params.id);
    run(sql, params);
    res.json({ message: `Order status updated to ${status}.` });
  } catch (e) {
    res.status(500).json({ error: 'Could not update status.' });
  }
});

// GET /api/admin/products
router.get('/products', admin, (req, res) => {
  res.json(all('SELECT * FROM products ORDER BY category, id'));
});

// POST /api/admin/products
router.post('/products', admin, (req, res) => {
  try {
    const { name, price, unit, category, description, emoji, badge, active } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Name and price are required.' });
    const id = runInsert(
      'INSERT INTO products (name, price, unit, category, description, emoji, badge, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, parseFloat(price), unit||null, category||null, description||null, emoji||'🌿', badge||null, active!==false?1:0]
    );
    res.status(201).json(get('SELECT * FROM products WHERE id = ?', [id]));
  } catch (e) {
    res.status(500).json({ error: 'Could not create product.' });
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', admin, (req, res) => {
  try {
    const { name, price, unit, category, description, emoji, badge, active } = req.body;
    const existing = get('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });
    run(
      'UPDATE products SET name=?, price=?, unit=?, category=?, description=?, emoji=?, badge=?, active=? WHERE id=?',
      [name, parseFloat(price), unit||null, category||null, description||null, emoji||'🌿', badge||null, active!==false?1:0, req.params.id]
    );
    res.json(get('SELECT * FROM products WHERE id = ?', [req.params.id]));
  } catch (e) {
    res.status(500).json({ error: 'Could not update product.' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', admin, (req, res) => {
  try {
    const existing = get('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });
    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not delete product.' });
  }
});

// POST /api/admin/products/sync
router.post('/products/sync', admin, (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'products array required.' });
    let added = 0, updated = 0;
    products.forEach(p => {
      const existing = get('SELECT id FROM products WHERE name = ? AND category = ?', [p.name, p.category]);
      if (existing) {
        run('UPDATE products SET price=?, unit=?, emoji=?, badge=?, active=1 WHERE id=?',
            [p.price, p.unit||null, p.emoji||'🌿', p.badge||null, existing.id]);
        updated++;
      } else {
        runInsert('INSERT INTO products (name,price,unit,category,description,emoji,badge,active) VALUES (?,?,?,?,?,?,?,1)',
                  [p.name, p.price, p.unit||null, p.category||null, p.description||null, p.emoji||'🌿', p.badge||null]);
        added++;
      }
    });
    res.json({ message: `Sync complete. ${added} added, ${updated} updated.`, added, updated });
  } catch (e) {
    res.status(500).json({ error: 'Sync failed.' });
  }
});

// GET /api/admin/customers
router.get('/customers', admin, (req, res) => {
  try {
    const customers = all(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             COUNT(o.id)            as order_count,
             COALESCE(SUM(o.total),0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
      WHERE u.role = 'customer'
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: 'Could not fetch customers.' });
  }
});

// GET /api/admin/contacts
router.get('/contacts', admin, (req, res) => {
  res.json(all('SELECT * FROM contacts ORDER BY created_at DESC'));
});

// PUT /api/admin/contacts/:id/read
router.put('/contacts/:id/read', admin, (req, res) => {
  run('UPDATE contacts SET status = ? WHERE id = ?', ['read', req.params.id]);
  res.json({ message: 'Marked as read.' });
});

// GET /api/admin/coupons
router.get('/coupons', admin, (req, res) => {
  res.json(all('SELECT * FROM coupons ORDER BY created_at DESC'));
});

// POST /api/admin/coupons
router.post('/coupons', admin, (req, res) => {
  try {
    const { code, type, value, min_order, max_uses, expires_at } = req.body;
    if (!code || !value) return res.status(400).json({ error: 'Code and value are required.' });
    const existing = get('SELECT id FROM coupons WHERE code = ?', [code.toUpperCase()]);
    if (existing) return res.status(409).json({ error: 'Coupon code already exists.' });
    const id = runInsert(
      'INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [code.toUpperCase(), type||'percent', parseFloat(value), parseFloat(min_order)||0, parseInt(max_uses)||0, expires_at||null]
    );
    res.status(201).json(get('SELECT * FROM coupons WHERE id = ?', [id]));
  } catch (e) {
    res.status(500).json({ error: 'Could not create coupon.' });
  }
});

// PUT /api/admin/coupons/:id
router.put('/coupons/:id', admin, (req, res) => {
  try {
    const existing = get('SELECT id FROM coupons WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Coupon not found.' });
    const { active } = req.body;
    run('UPDATE coupons SET active = ? WHERE id = ?', [active ? 1 : 0, req.params.id]);
    res.json({ message: `Coupon ${active ? 'enabled' : 'disabled'}.` });
  } catch (e) {
    res.status(500).json({ error: 'Could not update coupon.' });
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', admin, (req, res) => {
  try {
    const existing = get('SELECT id FROM coupons WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Coupon not found.' });
    run('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ message: 'Coupon deleted.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not delete coupon.' });
  }
});

// POST /api/admin/change-password
router.post('/change-password', admin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields required.' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Min 6 characters.' });
    const user  = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(new_password, 12);
    run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Admin password changed.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not change password.' });
  }
});

// GET /api/admin/settings
router.get('/settings', admin, (req, res) => {
  const { getSettings } = require('../db');
  const s = getSettings();
  res.json({
    shipping_charge:         s.shipping_charge         || 50,
    free_shipping_threshold: s.free_shipping_threshold || 500,
    store_name:              s.store_name              || 'Ayini Home Products',
    whatsapp:                s.whatsapp                || '+91 73971 30039',
    email:                   s.email                   || 'ayinihomeproducts@gmail.com',
  });
});

// PUT /api/admin/settings
router.put('/settings', admin, (req, res) => {
  const { updateSettings } = require('../db');
  const ok = updateSettings(req.body);
  if (ok) res.json({ message: 'Settings saved.' });
  else res.status(500).json({ error: 'Could not save settings.' });
});

module.exports = router;