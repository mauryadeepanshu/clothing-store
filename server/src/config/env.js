require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD) || 1999,
  shippingFee: Number(process.env.SHIPPING_FEE ?? 99),
  storeName: process.env.STORE_NAME || 'Modern Fashion Store',
  storeEmail: process.env.STORE_EMAIL || '',
  storePhone: process.env.STORE_PHONE || '',
  storeAddress: process.env.STORE_ADDRESS || '',
  storeState: process.env.STORE_STATE || 'Maharashtra',
  storeGstin: process.env.STORE_GSTIN || '',
  warehousePincode: process.env.WAREHOUSE_PINCODE || '400601',
  gstThreshold: Number(process.env.GST_THRESHOLD) || 2500,
  gstRateLow: Number(process.env.GST_RATE_LOW ?? 5),
  gstRateHigh: Number(process.env.GST_RATE_HIGH ?? 18),
  shippingGstRate: Number(process.env.SHIPPING_GST_RATE ?? 18),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'Modern Fashion Store <no-reply@example.com>',
};

env.clientUrl = env.clientUrls[0];
env.razorpayEnabled = Boolean(env.razorpayKeyId && env.razorpayKeySecret);

module.exports = env;
