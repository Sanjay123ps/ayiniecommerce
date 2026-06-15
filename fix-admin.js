require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDB, run, get } = require('./db');

getDB().then(() => {
  const hash = bcrypt.hashSync('ayini2025', 12);
  run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@ayini.com']);
  const user = get('SELECT * FROM users WHERE email = ?', ['admin@ayini.com']);
  console.log('Updated user:', JSON.stringify(user));
  process.exit(0);
});