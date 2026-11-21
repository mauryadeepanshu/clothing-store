const crypto = require('crypto');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { commitStock, restoreStock, round2 } = require('./pricing');
const { withTx, txState } = require('./tx');
const { razorpay, rzpMessage } = require('./razorpay');
const mailer = require('./email');

// MF + yymmdd + 6 random base32 chars (~1 billion combinations per day).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newOrderNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  let r = '';
  for (let i = 0; i < 6; i++) r += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `MF${ymd}${r}`;
};

/**
 * Takes one coupon use if the limit allows. Compare-and-swap on usedCount: the increment only applies if
 * nobody else changed the count since we read it, so two buyers can never both take the last use.
 */
async function consumeCoupon(code, session = null) {
  if (!code) return true;
  for (let attempt = 0; attempt < 8; attempt++) {
    const c = await Coupon.findOne({ code, isActive: true }).session(session).lean();
    if (!c) return false;
    if (c.usageLimit !== null && c.usageLimit !== undefined && c.usedCount >= c.usageLimit) return false;
    const res = await Coupon.updateOne({ _id: c._id, usedCount: c.usedCount }, { $inc: { usedCount: 1 } }, { session });
    if (res.modifiedCount === 1) return true;
  }
  return false;
}

async function releaseCoupon(code, session = null) {
  if (code) await Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}

async function clearCart(userId) {
  await Cart.updateOne({ user: userId }, { $set: { items: [] } });
}

/** Cash on delivery: stock, coupon and order are written together; the cart is cleared only after success. */
async function createCodOrder({ user, quote, shippingAddress }) {
  const order = await withTx(async (session) => {
    await commitStock(quote.items, session);
    let couponTaken = false;
    try {
      if (quote.couponCode) {
        couponTaken = await consumeCoupon(quote.couponCode, session);
        if (!couponTaken) throw ApiError.badRequest('This coupon has reached its usage limit');
      }
      const [created] = await Order.create([{
        orderNumber: newOrderNumber(),
        user: user._id,
        items: quote.items,
        shippingAddress,
        subtotal: quote.subtotal,
        discount: quote.discount,
        couponCode: quote.couponCode,
        couponReserved: Boolean(quote.couponCode),
        shippingFee: quote.shippingFee,
        total: quote.total,
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        status: 'Placed',
        stockCommitted: true,
        statusHistory: [{ status: 'Placed', note: 'Cash on Delivery' }],
      }], { session });
      return created;
    } catch (err) {
      if (!session) { // no transaction: undo by hand
        await restoreStock(quote.items);
        if (couponTaken) await releaseCoupon(quote.couponCode);
      }
      throw err;
    }
  });
  await clearCart(user._id);
  mailer.orderPlaced(order, user);
  return order;
}

/**
 * Called after a Razorpay payment is confirmed (verify endpoint, webhook or reconciliation).
 * Safe to call any number of times, concurrently: an atomic claim (Pending/Failed → Processing)
 * lets exactly one caller deduct stock. Returns the order as it stands afterwards.
 */
async function finalizePaidOrder(orderId, { paymentId, signature, source = 'verify' }) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, status: 'Pending Payment', paymentStatus: { $in: ['Pending', 'Failed'] } },
    {
      $set: {
        paymentStatus: 'Processing',
        processingSince: new Date(),
        'payment.razorpayPaymentId': paymentId,
        ...(signature ? { 'payment.razorpaySignature': signature } : {}),
      },
    },
    { new: true }
  );
  if (!claimed) return Order.findById(orderId); // already handled (or being handled) by another request

  try {
    await withTx(async (session) => {
      await commitStock(claimed.items, session);
      // If the coupon reservation was released (payment arrived after we gave up on it), take it again.
      // The customer has already paid the discounted price, so the order is honoured either way.
      const couponHeld = claimed.couponReserved || (claimed.couponCode ? await consumeCoupon(claimed.couponCode, session) : false);
      await Order.updateOne(
        { _id: claimed._id, paymentStatus: 'Processing' },
        {
          $set: { paymentStatus: 'Paid', status: 'Placed', stockCommitted: true, couponReserved: couponHeld, 'payment.paidAt': new Date() },
          $push: { statusHistory: { status: 'Placed', note: `Payment received via Razorpay (${source})` } },
        },
        { session }
      );
    });
  } catch (err) {
    if (err.stockConflict) {
      // Paid, but an item sold out meanwhile: cancel and flag for refund. Stock was not deducted.
      const prev = await Order.findOneAndUpdate(
        { _id: claimed._id, paymentStatus: 'Processing' },
        {
          $set: { paymentStatus: 'Refund Required', status: 'Cancelled', couponReserved: false, 'payment.paidAt': new Date() },
          $push: { statusHistory: { status: 'Cancelled', note: `Paid but out of stock (${err.message}). Refund required.` } },
        }
      );
      if (prev?.couponReserved) await releaseCoupon(prev.couponCode);
      return Order.findById(claimed._id);
    }
    // Unexpected failure (e.g. database unavailable). With transactions nothing was written, so hand the
    // claim back and let the verify retry / webhook / reconciliation finish it.
    if (txState.enabled) await Order.updateOne({ _id: claimed._id, paymentStatus: 'Processing' }, { $set: { paymentStatus: 'Pending' } }).catch(() => {});
    throw err;
  }

  const order = await Order.findById(claimed._id);
  await clearCart(order.user);
  const user = await User.findById(order.user);
  if (user) mailer.orderPlaced(order, user);
  return order;
}

/**
 * Cancels an order if (and only if) it is still in one of `from`. The status change is an atomic claim,
 * so concurrent cancellations (customer + admin) restore stock and release the coupon exactly once.
 */
async function cancelOrder(orderId, { from, note, filter = {} }) {
  const prev = await withTx(async (session) => {
    const before = await Order.findOneAndUpdate(
      { _id: orderId, status: { $in: from }, ...filter },
      { $set: { status: 'Cancelled', stockCommitted: false, couponReserved: false }, $push: { statusHistory: { status: 'Cancelled', note } } },
      { new: false, session }
    );
    if (!before) return null;
    const paymentStatus = before.paymentStatus === 'Paid' ? 'Refund Required' : before.paymentStatus === 'Pending' ? 'Voided' : before.paymentStatus;
    await Order.updateOne({ _id: orderId }, { $set: { paymentStatus } }, { session });
    if (before.stockCommitted) await restoreStock(before.items, session);
    if (before.couponReserved) await releaseCoupon(before.couponCode, session);
    return before;
  });
  if (!prev) return null;
  return Order.findById(orderId).populate('user', 'name email phone');
}

/**
 * Asks Razorpay what happened to an order's payments and settles our record:
 * captured → finalize; authorized → capture then finalize; all failed / none (and `release`) → mark failed
 * and free the coupon reservation. Payments still in progress are left alone.
 */
async function reconcileRazorpayOrder(order, { release = false } = {}) {
  if (order.paymentMethod !== 'RAZORPAY' || order.status !== 'Pending Payment' || !order.payment?.razorpayOrderId) return { action: 'none', order };
  const rp = razorpay();
  const { items = [] } = await rp.orders.fetchPayments(order.payment.razorpayOrderId);
  const expected = Math.round(order.total * 100);
  const ok = (p) => p.amount === expected && p.currency === 'INR';
  const captured = items.find((p) => p.status === 'captured' && ok(p));
  if (captured) return { action: 'finalized', order: await finalizePaidOrder(order._id, { paymentId: captured.id, source: 'reconcile' }) };
  const authorized = items.find((p) => p.status === 'authorized' && ok(p));
  if (authorized) {
    await rp.payments.capture(authorized.id, expected, 'INR');
    return { action: 'captured', order: await finalizePaidOrder(order._id, { paymentId: authorized.id, source: 'reconcile' }) };
  }
  const inProgress = items.some((p) => p.status === 'created');
  if (!inProgress && (release || items.every((p) => p.status === 'failed'))) {
    const prev = await Order.findOneAndUpdate(
      { _id: order._id, status: 'Pending Payment', paymentStatus: { $in: ['Pending', 'Failed'] } },
      { $set: { paymentStatus: 'Failed', couponReserved: false } },
      { new: false }
    );
    if (prev?.couponReserved) await releaseCoupon(prev.couponCode);
    return { action: 'released', order: await Order.findById(order._id) };
  }
  return { action: 'waiting', order };
}

/**
 * Refunds money through Razorpay. kind 'order' refunds a cancelled order in full; kind 'return'
 * refunds a return's amount. Never refunds more than was paid, and the claim prevents double refunds.
 */
async function refundViaRazorpay({ order, amount, kind, returnId, note }) {
  if (order.paymentMethod !== 'RAZORPAY' || !order.payment?.razorpayPaymentId) throw ApiError.badRequest('This order was not paid online; record a manual refund instead');
  const refunded = (order.refunds || []).filter((r) => r.status !== 'failed').reduce((s, r) => s + r.amount, 0);
  const amt = round2(amount);
  if (!(amt > 0) || amt > round2(order.total - refunded)) throw ApiError.badRequest(`You can refund at most ₹${round2(order.total - refunded)} on this order`);
  const rp = razorpay();
  const refund = await rp.payments.refund(order.payment.razorpayPaymentId, {
    amount: Math.round(amt * 100),
    speed: 'normal',
    receipt: `${order.orderNumber}-${kind}-${Date.now().toString(36)}`.slice(0, 40),
    notes: { orderNumber: order.orderNumber, kind, ...(returnId ? { returnId: String(returnId) } : {}) },
  }).catch((err) => { throw new ApiError(502, `Razorpay refund failed: ${rzpMessage(err)}`); });
  await Order.updateOne({ _id: order._id }, {
    $push: {
      refunds: { refundId: refund.id, amount: amt, status: refund.status || 'pending', kind, returnId, note },
      statusHistory: { status: order.status, note: `Refund of ₹${amt.toLocaleString('en-IN')} issued via Razorpay (${refund.id})` },
    },
  });
  return refund;
}

module.exports = {
  newOrderNumber, consumeCoupon, releaseCoupon, clearCart, createCodOrder, finalizePaidOrder, cancelOrder,
  reconcileRazorpayOrder, refundViaRazorpay,
};
