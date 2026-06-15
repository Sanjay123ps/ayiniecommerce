const express  = require('express');
const router   = express.Router();
const { run, get, all, runInsert, calcShipping, validateCoupon, incrementCouponUse, generateOrderNumber } = require('../db');
const auth     = require('../middleware/auth');
const { sendEmail } = require('../mailer');

function getOrderDetail(orderId) {
  const order = get(`
    SELECT o.*,
           u.name  AS customer_name,
           u.email AS customer_email,
           u.phone AS customer_phone,
           a.name    AS addr_name,
           a.phone   AS addr_phone,
           a.line1, a.line2, a.city, a.state, a.pincode
    FROM orders o
    LEFT JOIN users     u ON u.id = o.user_id
    LEFT JOIN addresses a ON a.id = o.address_id
    WHERE o.id = ?
  `, [orderId]);
  if (!order) return null;
  const items = all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  order.items = items;
  order.address = order.addr_name ? {
    name: order.addr_name, phone: order.addr_phone,
    line1: order.line1, line2: order.line2,
    city: order.city, state: order.state, pincode: order.pincode,
  } : null;
  return order;
}

// POST /api/orders
router.post('/', auth, async (req, res) => {
  try {
    const { address_id, payment_method = 'cod', coupon_code, notes } = req.body;
    if (!address_id) return res.status(400).json({ error: 'Delivery address is required.' });

    const addr = get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [address_id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Address not found.' });

    const cartItems = all(`
      SELECT c.product_id, c.quantity, p.name, p.price, p.unit, p.emoji
      FROM cart c JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ? AND p.active = 1
    `, [req.user.id]);
    if (!cartItems.length) return res.status(400).json({ error: 'Your cart is empty.' });

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping  = calcShipping(subtotal);
    let discount    = 0;
    let validCoupon = null;

    if (coupon_code) {
      try {
        const result  = validateCoupon(coupon_code, subtotal);
        discount      = result.discount;
        validCoupon   = result.coupon;
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    }

    const total        = Math.max(0, subtotal + shipping - discount);
    const orderNumber  = generateOrderNumber();
    const orderId      = runInsert(`
      INSERT INTO orders
        (order_number, user_id, address_id, subtotal, shipping, discount, total,
         payment_method, payment_status, status, coupon_code, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [orderNumber, req.user.id, address_id, subtotal, shipping, discount, total,
        payment_method, payment_method === 'cod' ? 'pending' : 'pending',
        'pending', validCoupon?.code || null, notes || null]);

    const itemStmt = get('SELECT 1');
    cartItems.forEach(item => {
      runInsert(
        'INSERT INTO order_items (order_id, product_id, name, price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.name, item.price, item.quantity, item.unit || null]
      );
    });

    if (validCoupon) incrementCouponUse(validCoupon.code);
    run('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    const order = getOrderDetail(orderId);

    // Send order confirmation email
    try {
      const itemsHtml = cartItems.map(i =>
        `<tr><td>${i.name}</td><td>${i.unit||''}</td><td>${i.quantity}</td><td>₹${(i.price*i.quantity).toFixed(0)}</td></tr>`
      ).join('');
      await sendEmail({
        to:      req.user.email,
        subject: `✅ Order Confirmed – #${orderNumber} | Ayini Home Products`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#1a3a2a;">Order Confirmed! 🎉</h2>
            <p>Hi ${req.user.name}, your order has been placed successfully.</p>
            <p><strong>Order Number:</strong> <span style="color:#1a3a2a;">#${orderNumber}</span></p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead><tr style="background:#f3f4f6;">
                <th style="padding:8px;text-align:left;">Product</th>
                <th style="padding:8px;">Unit</th>
                <th style="padding:8px;">Qty</th>
                <th style="padding:8px;">Amount</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p><strong>Subtotal:</strong> ₹${subtotal.toFixed(0)}</p>
            <p><strong>Shipping:</strong> ${shipping===0?'FREE':'₹'+shipping}</p>
            ${discount>0?`<p><strong>Discount:</strong> –₹${discount}</p>`:''}
            <p style="font-size:1.1rem;"><strong>Total: ₹${total.toFixed(0)}</strong></p>
            <p><strong>Payment:</strong> ${payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}</p>
            <p style="margin-top:16px;color:#6b7280;font-size:.85rem;">We'll notify you when your order is shipped. Thank you for shopping with Ayini! 🌿</p>
          </div>`,
      });
    } catch {}

    res.status(201).json({ order_number: orderNumber, order_id: orderId, total, order });
  } catch (e) {
    console.error('Place order error:', e);
    res.status(500).json({ error: 'Could not place order. Please try again.' });
  }
});

// GET /api/orders/my
router.get('/my', auth, (req, res) => {
  const orders = all(`
    SELECT o.*, COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [req.user.id]);
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', auth, (req, res) => {
  const order = getOrderDetail(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Access denied.' });
  res.json(order);
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', auth, (req, res) => {
  try {
    const order = get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!['pending','confirmed'].includes(order.status))
      return res.status(400).json({ error: `Cannot cancel an order that is ${order.status}.` });
    run(
      'UPDATE orders SET status = ?, cancelled_at = datetime("now") WHERE id = ?',
      ['cancelled', req.params.id]
    );
    res.json({ message: 'Order cancelled successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Could not cancel order.' });
  }
});

module.exports = { router, getOrderDetail };