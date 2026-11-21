const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const Order = require('./models/Order');
const { reconcileRazorpayOrder } = require('./services/orders');
const { txState } = require('./services/tx');

// ---- Fail fast on unsafe or incomplete configuration ----
const problems = [];
if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET must be set and at least 32 characters long.');
if (Boolean(env.razorpayKeyId) !== Boolean(env.razorpayKeySecret)) problems.push('Set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or neither.');
if (problems.length) {
  problems.forEach((p) => console.error(`Config error: ${p}`));
  process.exit(1);
}
if (env.nodeEnv === 'production') {
  if (env.clientUrls.some((u) => u.includes('localhost'))) console.warn('Warning: CLIENT_URL still points at localhost in production.');
  if (env.razorpayEnabled && !env.razorpayWebhookSecret) console.warn('Warning: RAZORPAY_WEBHOOK_SECRET is not set; payments rely on the checkout callback and the background check.');
  if (env.razorpayKeyId.startsWith('rzp_test_')) console.warn('Warning: Razorpay is in TEST mode in production.');
  if (!env.smtp.host) console.warn('Warning: SMTP is not configured; customers will not receive emails.');
}

/**
 * Background check every 5 minutes: settles online orders whose payment outcome we never heard about
 * (closed tab, missed webhook) by asking Razorpay, and frees coupon holds on abandoned checkouts.
 */
async function sweepPendingPayments() {
  if (!env.razorpayEnabled) return;
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  if (txState.enabled) {
    // A crash mid-finalisation inside a transaction wrote nothing, so the claim can safely be retried.
    await Order.updateMany({ paymentStatus: 'Processing', processingSince: { $lt: new Date(Date.now() - 10 * 60 * 1000) } }, { $set: { paymentStatus: 'Pending' } });
  }
  const stale = await Order.find({ status: 'Pending Payment', paymentStatus: { $in: ['Pending', 'Failed'] }, createdAt: { $lt: cutoff, $gt: recent }, $or: [{ couponReserved: true }, { paymentStatus: 'Pending' }] }).limit(50);
  for (const order of stale) {
    try {
      const { action } = await reconcileRazorpayOrder(order, { release: true });
      if (action !== 'waiting') console.log(`[payments] ${order.orderNumber}: ${action}`);
    } catch (err) {
      console.error(`[payments] could not check ${order.orderNumber}: ${err.message}`);
    }
  }
}

connectDB()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`API running on http://localhost:${env.port}`);
      console.log(`Razorpay: ${env.razorpayEnabled ? `enabled (${env.razorpayKeyId.startsWith('rzp_test_') ? 'test' : 'live'} mode)` : 'disabled — add keys to .env to enable'}`);
    });
    const timer = setInterval(() => sweepPendingPayments().catch((e) => console.error('[payments] sweep failed:', e.message)), Number(process.env.PAYMENT_SWEEP_MS) || 5 * 60 * 1000);
    timer.unref();
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

module.exports = { sweepPendingPayments };
