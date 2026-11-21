const crypto = require('crypto');
const env = require('../config/env');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate, addressRules, pickAddress } = require('../utils/validate');
const { buildQuote } = require('../services/pricing');
const { razorpay, rzpMessage } = require('../services/razorpay');
const { newOrderNumber, consumeCoupon, releaseCoupon, finalizePaidOrder, reconcileRazorpayOrder } = require('../services/orders');

const safeEqual = (a, b) => {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

// Only the public key id is ever sent to the browser.
exports.config = (_req, res) => res.json({ enabled: env.razorpayEnabled, keyId: env.razorpayEnabled ? env.razorpayKeyId : null });

/** Prices the bag on the server, holds a coupon use, and opens a Razorpay order for the exact amount. */
exports.createOrder = asyncHandler(async (req, res) => {
  validate(req.body.shippingAddress || {}, addressRules);
  const rp = razorpay();
  const q = await buildQuote(req.body.items, req.body.couponCode);
  if (q.couponCode && !(await consumeCoupon(q.couponCode))) throw ApiError.badRequest('This coupon has reached its usage limit');
  const order = new Order({
    orderNumber: newOrderNumber(),
    user: req.user._id,
    items: q.items,
    shippingAddress: pickAddress(req.body.shippingAddress),
    subtotal: q.subtotal,
    discount: q.discount,
    couponCode: q.couponCode,
    couponReserved: Boolean(q.couponCode),
    shippingFee: q.shippingFee,
    total: q.total,
    paymentMethod: 'RAZORPAY',
    paymentStatus: 'Pending',
    status: 'Pending Payment',
    statusHistory: [{ status: 'Pending Payment', note: 'Awaiting Razorpay payment' }],
  });
  let rpOrder;
  try {
    rpOrder = await rp.orders.create({
      amount: Math.round(q.total * 100), // paise
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: String(order._id) },
    });
    order.payment.razorpayOrderId = rpOrder.id;
    await order.save();
  } catch (err) {
    if (q.couponCode) await releaseCoupon(q.couponCode);
    if (err instanceof ApiError || err.name === 'ValidationError') throw err;
    throw new ApiError(502, `Could not start the payment: ${rzpMessage(err)}`);
  }
  res.status(201).json({
    orderId: order._id,
    orderNumber: order.orderNumber,
    razorpayOrderId: rpOrder.id,
    amount: rpOrder.amount,
    currency: rpOrder.currency,
    keyId: env.razorpayKeyId,
    prefill: { name: req.user.name, email: req.user.email, contact: order.shippingAddress.phone },
  });
});

/**
 * Checkout success handler. The order is marked paid only if: the HMAC signature is valid, Razorpay
 * confirms the payment belongs to this order for the exact amount, and it is captured (authorized
 * payments are captured here). The browser's word alone is never enough.
 */
exports.verify = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id: rpOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (![orderId, rpOrderId, paymentId, signature].every((v) => typeof v === 'string' && v)) throw ApiError.badRequest('Missing payment details');
  const rp = razorpay();
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.payment.razorpayOrderId !== rpOrderId) throw ApiError.badRequest('Payment does not match this order');

  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${rpOrderId}|${paymentId}`).digest('hex');
  if (!safeEqual(expected, signature)) {
    await Order.updateOne({ _id: order._id, paymentStatus: 'Pending' }, { $set: { paymentStatus: 'Failed' }, $push: { statusHistory: { status: order.status, note: 'Signature verification failed' } } });
    throw ApiError.badRequest('Payment verification failed. If money was debited, it will be refunded automatically.');
  }

  const amount = Math.round(order.total * 100);
  let payment;
  try {
    payment = await rp.payments.fetch(paymentId);
    if (payment.order_id !== rpOrderId || payment.amount !== amount || payment.currency !== 'INR') {
      throw new ApiError(400, 'Payment amount or order does not match');
    }
    if (payment.status === 'authorized') payment = await rp.payments.capture(paymentId, amount, 'INR');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, `Could not confirm the payment with Razorpay: ${rzpMessage(err)}. Your order will update automatically once it’s confirmed.`);
  }
  if (payment.status !== 'captured') throw ApiError.badRequest(`Payment is ${payment.status}, not completed`);

  const final = await finalizePaidOrder(order._id, { paymentId, signature, source: 'checkout' });
  if (final.paymentStatus === 'Refund Required') {
    throw ApiError.conflict('Payment received but an item sold out moments ago. Your order was cancelled and a full refund will be issued.');
  }
  res.json({ order: final });
});

/** Shopper closed checkout or a payment attempt failed. Settle with Razorpay; free the coupon if nothing was paid. */
exports.markFailed = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id });
  if (!order) return res.json({ ok: true });
  if (order.status === 'Pending Payment' && req.body.reason) {
    await Order.updateOne({ _id: order._id }, { $push: { statusHistory: { status: order.status, note: String(req.body.reason).slice(0, 200) } } });
  }
  try {
    const { action } = await reconcileRazorpayOrder(order, { release: true });
    res.json({ ok: true, action });
  } catch {
    res.json({ ok: true, action: 'deferred' }); // Razorpay unreachable: the background check will settle it
  }
});

/**
 * Razorpay webhook. Signature-checked on the raw body; each event id is processed once
 * (unique index); order updates go through the same idempotent finalize path as checkout.
 */
exports.webhook = asyncHandler(async (req, res) => {
  if (!env.razorpayWebhookSecret) return res.status(503).json({ message: 'Webhook secret not configured' });
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(req.body).digest('hex');
  if (!safeEqual(expected, signature)) return res.status(400).json({ message: 'Invalid signature' });

  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ message: 'Invalid JSON' }); }
  const eventId = req.headers['x-razorpay-event-id'] || `${event.event}:${event.payload?.payment?.entity?.id || event.payload?.refund?.entity?.id || ''}:${event.created_at || ''}`;
  try {
    await WebhookEvent.create({ eventId, event: event.event });
  } catch (err) {
    if (err.code === 11000) return res.json({ received: true, duplicate: true });
    throw err;
  }

  try {
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload.payment?.entity;
      const order = payment && await Order.findOne({ 'payment.razorpayOrderId': payment.order_id });
      if (order && payment.status === 'captured' && Math.round(order.total * 100) === payment.amount && payment.currency === 'INR') {
        await finalizePaidOrder(order._id, { paymentId: payment.id, source: 'webhook' });
      }
    } else if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      const refund = event.payload.refund?.entity;
      const status = event.event === 'refund.processed' ? 'processed' : 'failed';
      const order = refund && await Order.findOne({ 'refunds.refundId': refund.id });
      if (order) {
        await Order.updateOne({ _id: order._id, 'refunds.refundId': refund.id }, { $set: { 'refunds.$.status': status } });
        if (status === 'failed') {
          await Order.updateOne({ _id: order._id }, {
            $set: { paymentStatus: 'Refund Required' },
            $push: { statusHistory: { status: order.status, note: `Razorpay refund ${refund.id} failed. Retry the refund.` } },
          });
        }
      }
    }
  } catch (err) {
    await WebhookEvent.deleteOne({ eventId }); // let Razorpay's retry process it again
    throw err;
  }
  res.json({ received: true });
});
