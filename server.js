require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { getDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://sanjay123ps.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
}));

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 120 : 1000,
  message: { error: 'Rate limit exceeded.' },
});
app.use('/api/auth', authLimiter);
app.use('/api',      apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Ayini API', timestamp: new Date().toISOString() });
});

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/cart',      require('./routes/cart'));
app.use('/api/addresses', require('./routes/address'));
app.use('/api/orders',    require('./routes/orders').router);
app.use('/api/wishlist',  require('./routes/wishlist'));
app.use('/api/contact',   require('./routes/contact'));
app.use('/api/payment',   require('./routes/payment'));
app.use('/api/admin',     require('./routes/admin'));

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

async function start() {
  try {
    await getDB();
    console.log('✅ Database ready');
    app.listen(PORT, () => {
      console.log(`🚀 Ayini API running → http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (e) {
    console.error('❌ Failed to start server:', e);
    process.exit(1);
  }
}
start();