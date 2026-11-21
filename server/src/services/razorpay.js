const Razorpay = require('razorpay');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

let client = null;
/** Shared Razorpay client. Throws a 503 when keys are not configured. */
function razorpay() {
  if (!env.razorpayEnabled) throw new ApiError(503, 'Online payment is not set up yet. Choose Cash on Delivery.');
  if (!client) client = new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  return client;
}

/** Razorpay SDK errors carry details in error.error.description. */
const rzpMessage = (err) => err?.error?.description || err?.message || 'Razorpay request failed';

module.exports = { razorpay, rzpMessage };
