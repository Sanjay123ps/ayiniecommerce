const express = require('express');
const router  = express.Router();
const { runInsert } = require('../db');
const { sendEmail } = require('../mailer');

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: 'Name, email and message are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Please enter a valid email address.' });

    runInsert(
      'INSERT INTO contacts (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), phone||null, subject||'General Enquiry', message.trim(), 'unread']
    );

    // Notify admin
    try {
      await sendEmail({
        to:      process.env.EMAIL_USER || 'ayinihomeproducts@gmail.com',
        subject: `📩 New Message: ${subject || 'General Enquiry'} – Ayini`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
            <h2 style="color:#1a3a2a;">New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || '—'}</p>
            <p><strong>Subject:</strong> ${subject || '—'}</p>
            <hr>
            <p><strong>Message:</strong></p>
            <p style="background:#f9fafb;padding:14px;border-radius:8px;">${message}</p>
          </div>`,
      });
    } catch {}

    // Auto-reply to sender
    try {
      await sendEmail({
        to:      email,
        subject: '✅ We received your message – Ayini Home Products',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
            <h2 style="color:#1a3a2a;">Thanks for reaching out, ${name}! 🌿</h2>
            <p>We've received your message and will get back to you within 24 hours.</p>
            <p>In the meantime, you can also reach us on WhatsApp:</p>
            <a href="https://wa.me/917397130039"
               style="background:#25d366;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">
              💬 Chat on WhatsApp
            </a>
            <p style="margin-top:20px;color:#6b7280;font-size:.85rem;">Ayini Home Products · Coimbatore, Tamil Nadu</p>
          </div>`,
      });
    } catch {}

    res.status(201).json({ message: 'Message sent successfully. We will get back to you soon.' });
  } catch (e) {
    console.error('Contact error:', e);
    res.status(500).json({ error: 'Could not send message.' });
  }
});

module.exports = router;