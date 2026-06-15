const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ayini.db');

let db;

async function getDB() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  enableWAL();
  createTables();
  seedAdmin();
  seedProducts();
  return db;
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function enableWAL() {
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA foreign_keys = ON;');
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  if (!row || !Object.keys(row).length) return null;
  const normalized = {};
  Object.keys(row).forEach(k => {
    const clean = k.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    normalized[clean] = row[k];
  });
  return normalized;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const normalized = {};
    Object.keys(row).forEach(k => {
      const clean = k.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      normalized[clean] = row[k];
    });
    rows.push(normalized);
  }
  stmt.free();
  return rows;
}

function runInsert(sql, params = []) {
  db.run(sql, params);
  saveDB();
  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result && result[0] && result[0].values && result[0].values[0]) {
    return result[0].values[0][0];
  }
  return null;
}

// ── Schema ────────────────────────────────────────────────────────
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      phone         TEXT,
      role          TEXT    DEFAULT 'customer',
      created_at    TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT    UNIQUE NOT NULL,
      expires_at TEXT    NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      price       REAL    NOT NULL,
      unit        TEXT,
      category    TEXT,
      description TEXT,
      emoji       TEXT    DEFAULT '🌿',
      badge       TEXT,
      active      INTEGER DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS addresses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT    NOT NULL,
      phone      TEXT    NOT NULL,
      line1      TEXT    NOT NULL,
      line2      TEXT,
      city       TEXT    NOT NULL,
      state      TEXT    NOT NULL,
      pincode    TEXT    NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cart (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity   INTEGER NOT NULL DEFAULT 1,
      added_at   TEXT    DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT    UNIQUE NOT NULL,
      type        TEXT    NOT NULL DEFAULT 'percent',
      value       REAL    NOT NULL,
      min_order   REAL    DEFAULT 0,
      max_uses    INTEGER DEFAULT 0,
      use_count   INTEGER DEFAULT 0,
      expires_at  TEXT,
      active      INTEGER DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number     TEXT    UNIQUE NOT NULL,
      user_id          INTEGER NOT NULL,
      address_id       INTEGER,
      subtotal         REAL    NOT NULL,
      shipping         REAL    NOT NULL DEFAULT 50,
      discount         REAL    DEFAULT 0,
      total            REAL    NOT NULL,
      payment_method   TEXT    NOT NULL DEFAULT 'cod',
      payment_status   TEXT    DEFAULT 'pending',
      razorpay_order_id   TEXT,
      razorpay_payment_id TEXT,
      status           TEXT    DEFAULT 'pending',
      coupon_code      TEXT,
      notes            TEXT,
      confirmed_at     TEXT,
      processing_at    TEXT,
      shipped_at       TEXT,
      delivered_at     TEXT,
      cancelled_at     TEXT,
      created_at       TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE SET NULL,
      FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      name       TEXT    NOT NULL,
      price      REAL    NOT NULL,
      quantity   INTEGER NOT NULL,
      unit       TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      added_at   TEXT    DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id                      INTEGER PRIMARY KEY DEFAULT 1,
      shipping_charge         REAL    DEFAULT 50,
      free_shipping_threshold REAL    DEFAULT 500,
      store_name              TEXT    DEFAULT 'Ayini Home Products',
      whatsapp                TEXT    DEFAULT '+91 73971 30039',
      email                   TEXT    DEFAULT 'ayinihomeproducts@gmail.com'
    )
  `);

  saveDB();
}

// ── Seed Admin ────────────────────────────────────────────────────
function seedAdmin() {
  const bcrypt     = require('bcryptjs');
  const adminEmail = process.env.ADMIN_EMAIL    || 'admin@ayini.com';
  const adminPass  = process.env.ADMIN_PASSWORD || 'ayini2025';
  
  try {
    const existing = get('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (!existing) {
      const hash = bcrypt.hashSync(adminPass, 12);
      db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Admin', adminEmail, hash, 'admin']
      );
      saveDB();
      console.log(`✅ Admin seeded → ${adminEmail}`);
    } else {
      // Fix existing admin hash if needed
      const adminUser = get('SELECT * FROM users WHERE email = ?', [adminEmail]);
      if (!adminUser.password_hash) {
        const hash = bcrypt.hashSync(adminPass, 12);
        db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, adminEmail]);
        saveDB();
        console.log(`✅ Admin password fixed → ${adminEmail}`);
      }
    }
  } catch(e) {
    console.error('❌ seedAdmin error:', e.message);
  }
}
// ── Seed Products ─────────────────────────────────────────────────
function seedProducts() {
  const count = get('SELECT COUNT(*) as c FROM products');
  if (count && count.c > 0) return;

  const products = [
    // Masala
    { name:'Mutton Masala / Kuruma Masala', price:135, unit:'250g', category:'masala', emoji:'🌶️', badge:'Best Seller' },
    { name:'Paruppu Podi',                  price:60,  unit:'100g', category:'masala', emoji:'🫙' },
    { name:'Chilli Powder',                 price:50,  unit:'100g', category:'masala', emoji:'🌶️', badge:'Popular' },
    { name:'Malli Powder (Coriander)',      price:40,  unit:'100g', category:'masala', emoji:'🌿' },
    { name:'Idli Podi',                     price:140, unit:'250g', category:'masala', emoji:'🫙', badge:'Best Seller' },
    { name:'Idli Podi',                     price:60,  unit:'100g', category:'masala', emoji:'🫙' },
    { name:'Sambar Podi',                   price:135, unit:'250g', category:'masala', emoji:'🥘' },
    { name:'Karuveppilai Podi',             price:60,  unit:'100g', category:'masala', emoji:'🌿' },
    { name:'Chicken Masala',                price:70,  unit:'100g', category:'masala', emoji:'🌶️' },
    { name:'Instant Rasam Podi',            price:80,  unit:'100g', category:'masala', emoji:'🥘' },
    // Millets
    { name:'Pepper (Milagu)',               price:47,  unit:'50g',  category:'millets', emoji:'🫘' },
    { name:'Cardamom (Elakkai)',            price:200, unit:'50g',  category:'millets', emoji:'🫘' },
    { name:'Fenugreek (Vendhayam)',         price:30,  unit:'250g', category:'millets', emoji:'🌿' },
    { name:'Urad Dal (Ulundhu)',            price:75,  unit:'500g', category:'millets', emoji:'🫘' },
    { name:'Cumin Seed (Seeragam)',         price:45,  unit:'100g', category:'millets', emoji:'🫘' },
    { name:'Double Beans',                  price:40,  unit:'250g', category:'millets', emoji:'🫘' },
    { name:'Ragi',                          price:70,  unit:'1kg',  category:'millets', emoji:'🌾', badge:'Iron Rich' },
    { name:'Ragi',                          price:40,  unit:'500g', category:'millets', emoji:'🌾' },
    { name:'Black Gram (Ulundhu)',          price:65,  unit:'500g', category:'millets', emoji:'🫘' },
    { name:'Samai (Little Millet)',         price:60,  unit:'500g', category:'millets', emoji:'🌾' },
    { name:'Ellu (Sesame)',                 price:120, unit:'500g', category:'millets', emoji:'🫘' },
    { name:'Pearl Millet (Naattu Kambu)',   price:50,  unit:'500g', category:'millets', emoji:'🌾' },
    { name:'Barnyard Millet (Kuthiravali)', price:60,  unit:'500g', category:'millets', emoji:'🌾', badge:'Healthy' },
    { name:'Horse Gram (Kollu)',            price:55,  unit:'500g', category:'millets', emoji:'🫘' },
    { name:'Sundal',                        price:110, unit:'1kg',  category:'millets', emoji:'🫘' },
    { name:'Sundal',                        price:55,  unit:'500g', category:'millets', emoji:'🫘' },
    { name:'Greengram (Paasi Payiru)',      price:70,  unit:'500g', category:'millets', emoji:'🫘' },
    { name:'Soya Chunks (Big)',             price:30,  unit:'250g', category:'millets', emoji:'🫘' },
    { name:'Soya Chunks (Small)',           price:30,  unit:'250g', category:'millets', emoji:'🫘' },
    { name:'Solam (Sorghum)',              price:30,  unit:'500g', category:'millets', emoji:'🌽' },
    // Oils
    { name:'Coconut Oil',                   price:450, unit:'1lt',   category:'oil', emoji:'🥥', badge:'Cold Press' },
    { name:'Coconut Oil',                   price:230, unit:'500ml', category:'oil', emoji:'🥥', badge:'Cold Press' },
    { name:'Castor Oil (Vilakku Ennai)',    price:75,  unit:'250ml', category:'oil', emoji:'🌾' },
    { name:'Castor Oil (Vilakku Ennai)',    price:150, unit:'500ml', category:'oil', emoji:'🌾' },
    { name:'Groundnut Oil',                 price:140, unit:'500ml', category:'oil', emoji:'🥜', badge:'Traditional' },
    { name:'Groundnut Oil',                 price:275, unit:'1lt',   category:'oil', emoji:'🥜', badge:'Traditional' },
    { name:'Gingelly Oil (Nallennai)',      price:250, unit:'500ml', category:'oil', emoji:'🌾' },
    // Flour
    { name:'Kavuni Barley Kanji Mix',      price:125, unit:'250g', category:'flour', emoji:'🌾' },
    { name:'Wheat Kurunai (Kottai Kambu)', price:35,  unit:'500g', category:'flour', emoji:'🌾' },
    { name:'Karuppu Kavuni Kurunai',       price:140, unit:'500g', category:'flour', emoji:'🌾' },
    { name:'Millet Dosa Mix',              price:100, unit:'500g', category:'flour', emoji:'🌾' },
    { name:'Multigrain Health Mix',        price:150, unit:'250g', category:'flour', emoji:'🌾' },
    { name:'Kambu Kurunai',               price:40,  unit:'500g', category:'flour', emoji:'🌾' },
    { name:'Wheat Flour (Gothumai)',       price:60,  unit:'1kg',  category:'flour', emoji:'🌾' },
    // Noodles
    { name:'Millet Noodles (Varagu)',           price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Semiya (Ragi / Tomato / Kambu)',    price:25,  unit:'225g', category:'noodles', emoji:'🍜' },
    { name:'Wheat Noodles (Gothumai)',          price:160, unit:'Big',  category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Kuthiravali)',      price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Multigrain)',       price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Thinai)',           price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Sikappuvaragu)',    price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Samai)',            price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Kambu)',            price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    { name:'Millet Noodles (Ragi)',             price:60,  unit:'200g', category:'noodles', emoji:'🍜' },
    // Soap
    { name:'Herbal Hair Oil',      price:175, unit:'200g', category:'soap', emoji:'💧', badge:'Natural' },
    { name:'Nalangu Maavu Soap',   price:70,  unit:'bar',  category:'soap', emoji:'🧼', badge:'Traditional' },
    { name:'Multhanimetti Soap',   price:70,  unit:'bar',  category:'soap', emoji:'🧼' },
    { name:'Vettiver Soap',        price:70,  unit:'bar',  category:'soap', emoji:'🧼' },
    { name:'Kuppaimeni Soap',      price:70,  unit:'bar',  category:'soap', emoji:'🧼' },
    { name:'Sandal Leaf Soap',     price:70,  unit:'bar',  category:'soap', emoji:'🧼' },
    { name:'Bathing Soap',         price:70,  unit:'bar',  category:'soap', emoji:'🧼' },
    { name:'Sandal Soap',          price:70,  unit:'bar',  category:'soap', emoji:'🧼', badge:'Luxury' },
    { name:'Arisi Maavu Soap',     price:70,  unit:'bar',  category:'soap', emoji:'🧼' },
  ];

  const stmt = db.prepare(`
    INSERT INTO products (name, price, unit, category, description, emoji, badge, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  products.forEach(p => {
    stmt.run([p.name, p.price, p.unit||null, p.category||null, p.description||null, p.emoji||'🌿', p.badge||null]);
  });
  stmt.free();
  saveDB();
  console.log(`✅ ${products.length} products seeded`);
}

// ── Coupon helpers ────────────────────────────────────────────────
function calcShipping(subtotal) {
  const settings = getSettings();
  const freeThreshold = settings.free_shipping_threshold || 500;
  const shippingCharge = settings.shipping_charge || 50;
  return subtotal >= freeThreshold ? 0 : shippingCharge;
}

function getSettings() {
  try {
    const row = get('SELECT * FROM settings WHERE id = 1');
    return row || {};
  } catch {
    return {};
  }
}

function updateSettings(data) {
  try {
    const existing = get('SELECT id FROM settings WHERE id = 1');
    if (existing) {
      run(
        'UPDATE settings SET shipping_charge=?, free_shipping_threshold=?, store_name=?, whatsapp=?, email=? WHERE id=1',
        [data.shipping_charge||50, data.free_shipping_threshold||500, data.store_name||'Ayini Home Products', data.whatsapp||'+91 73971 30039', data.email||'ayinihomeproducts@gmail.com']
      );
    } else {
      run(
        'INSERT INTO settings (id, shipping_charge, free_shipping_threshold, store_name, whatsapp, email) VALUES (1,?,?,?,?,?)',
        [data.shipping_charge||50, data.free_shipping_threshold||500, data.store_name||'Ayini Home Products', data.whatsapp||'+91 73971 30039', data.email||'ayinihomeproducts@gmail.com']
      );
    }
    return true;
  } catch(e) {
    console.error('updateSettings error:', e);
    return false;
  }
}

function validateCoupon(code, subtotal) {
  const coupon = get(
    'SELECT * FROM coupons WHERE code = ? AND active = 1',
    [code.toUpperCase()]
  );
  if (!coupon)                          throw new Error('Invalid coupon code.');
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
                                        throw new Error('This coupon has expired.');
  if (coupon.max_uses > 0 && coupon.use_count >= coupon.max_uses)
                                        throw new Error('This coupon has reached its usage limit.');
  if (subtotal < coupon.min_order)      throw new Error(`Minimum order of ₹${coupon.min_order} required.`);

  const discount = coupon.type === 'percent'
    ? Math.round((subtotal * coupon.value) / 100)
    : coupon.value;

  return { discount, coupon };
}

function incrementCouponUse(code) {
  run('UPDATE coupons SET use_count = use_count + 1 WHERE code = ?', [code.toUpperCase()]);
}

// ── Order number generator ────────────────────────────────────────
function generateOrderNumber() {
  const date = new Date();
  const dd   = String(date.getDate()).padStart(2,'0');
  const mm   = String(date.getMonth()+1).padStart(2,'0');
  const yy   = String(date.getFullYear()).slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AYN${yy}${mm}${dd}${rand}`;
}

module.exports = {
  getDB, run, get, all, runInsert, saveDB,
  calcShipping, validateCoupon, incrementCouponUse, generateOrderNumber,
  getSettings, updateSettings,
};