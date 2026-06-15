const jwt = require('jsonwebtoken');
const { get } = require('../db');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please login.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ayini-dev-secret');
    const user = get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found.' });
    req.user = user;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please login again.' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = authMiddleware;  