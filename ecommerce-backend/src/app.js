const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const addressRoutes = require('./routes/addressRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const couponRoutes = require('./routes/couponRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const variationRoutes = require('./routes/variationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and tooling requests arrive without an Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Static serving for uploaded files
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Express 5 leaves req.body undefined when a request carries no body, so
// handlers that read optional fields would throw. Normalise it once here.
app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

app.get('/api/settings', require('./controllers/adminController').getSettings);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/variations', variationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
// The more specific admin mounts come first so their paths are never swallowed
// by the general /api/admin router.
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
