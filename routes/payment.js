const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const { run, get, all, runInsert, calcShipping, validateCoupon, incrementCouponUse, generateOrderNumber } = require('../db');
const auth     = require('../middleware/auth');
const { sendEmail } = require('../mailer');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// POST /api/payment/create-order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { address_id, coupon_code, notes } = req.body;
    if (!address_id) return res.status(400).json({ error: 'Delivery address is required.' });

    const addr = get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [address_id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Address not found.' });

    const cartItems = all(`
      SELECT c.product_id, c.quantity, p.name, p.price, p.unit
      FROM cart c JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ? AND p.active = 1
    `, [req.user.id]);
    if (!cartItems.length) return res.status(400).json({ error: 'Your cart is empty.' });

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping  = calcShipping(subtotal);
    let discount    = 0;
    let validCoupon = null;

    if (coupon_code) {
      const result = validateCoupon(coupon_code, subtotal);
      discount     = result.discount;
      validCoupon  = result.coupon;
    }

    const total = Math.max(0, subtotal + shipping - discount);
    const rzpOrder = await razorpay.orders.create({
      amount:   Math.round(total * 100),
      currency: 'INR',
      receipt:  `ayini_${Date.now()}`,
    });

    res.json({
      razorpay_order_id: rzpOrder.id,
      amount:  rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id:  process.env.RAZORPAY_KEY_ID,
      total,
      subtotal,
      shipping,
      discount,
    });
  } catch (e) {
    console.error('Create Razorpay order error:', e);
    res.status(500).json({ error: 'Could not create payment order.' });
  }
});

// POST /api/payment/verify
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      address_id, coupon_code, notes,
    } = req.body;

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });

    const addr = get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [address_id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Address not found.' });

    const cartItems = all(`
      SELECT c.product_id, c.quantity, p.name, p.price, p.unit
      FROM cart c JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ? AND p.active = 1
    `, [req.user.id]);
    if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty.' });

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping  = calcShipping(subtotal);
    let discount    = 0;
    let validCoupon = null;

    if (coupon_code) {
      const result = validateCoupon(coupon_code, subtotal);
      discount     = result.discount;
      validCoupon  = result.coupon;
    }

    const total       = Math.max(0, subtotal + shipping - discount);
    const orderNumber = generateOrderNumber();
    const orderId     = runInsert(`
      INSERT INTO orders
        (order_number, user_id, address_id, subtotal, shipping, discount, total,
         payment_method, payment_status, status, coupon_code, notes,
         razorpay_order_id, razorpay_payment_id, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [orderNumber, req.user.id, address_id, subtotal, shipping, discount, total,
        'razorpay', 'paid', 'confirmed',
        validCoupon?.code || null, notes || null,
        razorpay_order_id, razorpay_payment_id]);

    cartItems.forEach(item => {
      runInsert(
        'INSERT INTO order_items (order_id, product_id, name, price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.name, item.price, item.quantity, item.unit || null]
      );
    });

    if (validCoupon) incrementCouponUse(validCoupon.code);
    run('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    try {
      await sendEmail({
        to:      req.user.email,
        subject: `✅ Payment Confirmed – #${orderNumber} | Ayini`,
        html: `<div style="font-family:sans-serif;max-width:500px;">
          <h2 style="color:#1a3a2a;">Payment Confirmed! 🎉</h2>
          <p>Hi ${req.user.name}, your payment of <strong>₹${total.toFixed(0)}</strong> was successful.</p>
          <p><strong>Order #${orderNumber}</strong> is now confirmed and will be processed shortly.</p>
          <p>Payment ID: <code>${razorpay_payment_id}</code></p>
        </div>`,
      });
    } catch {}

    res.json({ message: 'Payment verified.', order_number: orderNumber, order_id: orderId });
  } catch (e) {
    console.error('Verify payment error:', e);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// POST /api/payment/webhook  (Razorpay webhook — no auth)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const sig  = req.headers['x-razorpay-signature'];
    const body = req.body.toString();
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');
    if (sig !== expected) return res.status(400).json({ error: 'Invalid webhook signature.' });
    const event = JSON.parse(body);
    if (event.event === 'payment.captured') {
      const paymentId = event.payload?.payment?.entity?.id;
      const orderId   = event.payload?.payment?.entity?.order_id;
      if (paymentId && orderId) {
        run(
          'UPDATE orders SET payment_status = ?, status = ?, confirmed_at = datetime("now") WHERE razorpay_order_id = ? AND status = ?',
          ['paid', 'confirmed', orderId, 'pending']
        );
      }
    }
    res.json({ received: true });
  } catch (e) {
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;