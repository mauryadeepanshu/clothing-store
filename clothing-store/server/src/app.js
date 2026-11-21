const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const sanitize = require('./middleware/sanitize');
const { webhook } = require('./controllers/paymentController');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1);
// Content-Security-Policy for the built site (single-server mode): allows Razorpay Checkout, Google Fonts
// and https product images; blocks everything else, which limits the damage of any XSS bug.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
      connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', ...env.clientUrls],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));
app.use(cors({ origin: env.clientUrls, credentials: true }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Webhook needs the raw body for signature verification, so it is mounted before express.json().
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhook);

app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
// General API limit per IP; stricter limits sit on login, forms and payments (routes/index.js).
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please slow down.' } }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));
app.use('/api', routes);

// In production, serve the built React app from the same server if it exists.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (env.nodeEnv === 'production' && fs.existsSync(clientDist)) {
  const Product = require('./models/Product');
  const indexHtml = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const withMeta = (title, description, image, url) => indexHtml
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('</head>', `<meta property="og:type" content="website" /><meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(description)}" />${image ? `<meta property="og:image" content="${esc(image)}" />` : ''}<meta property="og:url" content="${esc(url)}" /><meta name="twitter:card" content="summary_large_image" /></head>`);
  app.use(express.static(clientDist, { index: false }));
  app.get(/^(?!\/api|\/uploads).*/, async (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    const m = req.path.match(/^\/product\/([a-z0-9-]+)$/);
    if (m) {
      const p = await Product.findOne({ slug: m[1], isActive: true }).select('name description images finalPrice').lean().catch(() => null);
      if (p) {
        const img = p.images[0]?.startsWith('/') ? base + p.images[0] : p.images[0];
        return res.send(withMeta(`${p.name} — ₹${p.finalPrice.toLocaleString('en-IN')} | ${env.storeName}`, p.description.slice(0, 160), img, base + req.path));
      }
    }
    res.send(withMeta(env.storeName, 'Considered clothing for men and women. Free shipping over ₹1,999.', '', base + req.path));
  });
}

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
