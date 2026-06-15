const jwt = require('jsonwebtoken');
const { get } = require('../db');

function adminMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin access required.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ayini-dev-secret');
    const user = get('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user)               return res.status(401).json({ error: 'User not found.' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access only.' });
    req.user = user;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Admin session expired.' });
    return res.status(401).json({ error: 'Invalid admin token.' });
  }
}

module.exports = adminMiddleware;