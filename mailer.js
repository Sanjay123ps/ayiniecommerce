const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `"Ayini Home Products 🌿" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
  } catch (e) {
    console.error('Email send error:', e.message);
  }
}

module.exports = { sendEmail };