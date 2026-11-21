const crypto = require('crypto');
const mongoose = require('mongoose');
const ReturnRequest = require('../models/ReturnRequest');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { commitStock, restoreStock, round2 } = require('../services/pricing');
const { withTx } = require('../services/tx');
const { refundViaRazorpay } = require('../services/orders');
const { getStore } = require('../services/storeConfig');
const mailer = require('../services/email');

const REASONS = ['Size too small', 'Size too big', 'Not as pictured', 'Quality not as expected', 'Damaged or defective', 'Received wrong item', 'Changed my mind'];
const UPI_RE = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

const windowEnds = (order, days) => new Date(new Date(order.deliveredAt || order.updatedAt).getTime() + days * 864e5);

// Quantities already in an active (non-rejected) return per product+size+color line.
async function alreadyRequested(orderId) {
  const existing = await ReturnRequest.find({ order: orderId, status: { $ne: 'Rejected' } }).lean();
  const map = new Map();
  existing.forEach((r) => r.items.forEach((i) => {
    const k = `${i.product}|${i.size}|${i.color}`;
    map.set(k, (map.get(k) || 0) + i.quantity);
  }));
  return map;
}

exports.reasons = asyncHandler(async (_req, res) => res.json({ reasons: REASONS, windowDays: (await getStore()).returnWindowDays }));

exports.eligibility = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  const used = await alreadyRequested(order._id);
  const items = order.items.map((i) => ({ ...i.toObject(), returnable: i.quantity - (used.get(`${i.product}|${i.size}|${i.color}`) || 0) }));
  const products = await Product.find({ _id: { $in: order.items.map((i) => i.product) } }).select('sizes').lean();
  const sizesById = Object.fromEntries(products.map((p) => [String(p._id), p.sizes]));
  const days = (await getStore()).returnWindowDays;
  const open = order.status === 'Delivered' && windowEnds(order, days) > new Date();
  res.json({ eligible: open && items.some((i) => i.returnable > 0), windowEnds: windowEnds(order, days), windowDays: days, items, sizesById, reasons: REASONS, paymentMethod: order.paymentMethod });
});

exports.create = asyncHandler(async (req, res) => {
  const { orderId, type, reason, comment = '', refundUpi = '' } = req.body;
  if (typeof orderId !== 'string') throw ApiError.badRequest('Choose an order');
  if (!['return', 'exchange'].includes(type)) throw ApiError.badRequest('Choose return or exchange');
  if (!REASONS.includes(reason)) throw ApiError.badRequest('Choose a reason');
  if (!mongoose.isValidObjectId(orderId)) throw ApiError.notFound('Order not found');
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'Delivered') throw ApiError.badRequest('Returns open once your order is delivered');
  const days = (await getStore()).returnWindowDays;
  if (windowEnds(order, days) < new Date()) throw ApiError.badRequest(`The ${days}-day return window for this order has closed`);
  if (type === 'return' && order.paymentMethod === 'COD' && !UPI_RE.test(String(refundUpi).trim())) {
    throw ApiError.badRequest('Enter the UPI ID where we should send your refund', { refundUpi: 'Enter a valid UPI ID, e.g. name@okbank' });
  }

  const used = await alreadyRequested(order._id);
  const wanted = Array.isArray(req.body.items) ? req.body.items : [];
  if (!wanted.length) throw ApiError.badRequest('Select at least one item');
  const items = [];
  for (const w of wanted) {
    const line = order.items.find((i) => String(i.product) === String(w.product) && i.size === w.size && i.color === (w.color || ''));
    if (!line) throw ApiError.badRequest('An item is not part of this order');
    const qty = Math.floor(Number(w.quantity));
    const left = line.quantity - (used.get(`${line.product}|${line.size}|${line.color}`) || 0);
    if (!(qty >= 1 && qty <= left)) throw ApiError.badRequest(`You can return up to ${left} of ${line.name}`);
    let exchangeSize = '';
    if (type === 'exchange') {
      const p = await Product.findById(line.product).select('sizes').lean();
      const s = p?.sizes.find((x) => x.name === w.exchangeSize);
      if (!s || s.name === line.size) throw ApiError.badRequest(`Choose a different size for ${line.name}`);
      if (s.stock < qty) throw ApiError.badRequest(`Size ${s.name} of ${line.name} is out of stock. Choose another size or request a return.`);
      exchangeSize = s.name;
    }
    items.push({ product: line.product, name: line.name, image: line.image, size: line.size, color: line.color, quantity: qty, unitPrice: line.unitPrice, exchangeSize });
  }
  // Refund what the customer actually paid for these pieces (coupon discount spread proportionally; shipping not refunded).
  const paidRatio = order.subtotal > 0 ? (order.subtotal - order.discount) / order.subtotal : 1;
  const refundAmount = type === 'return' ? round2(items.reduce((s, i) => s + i.unitPrice * i.quantity * paidRatio, 0)) : 0;

  const ret = await ReturnRequest.create({
    returnNumber: `RT${Date.now().toString().slice(-7)}${crypto.randomInt(10, 99)}`,
    order: order._id, orderNumber: order.orderNumber, user: req.user._id, type, items, reason,
    comment: String(comment).slice(0, 500), refundUpi: String(refundUpi).trim(), refundAmount,
    history: [{ status: 'Requested', note: reason }],
  });
  mailer.returnUpdate(ret, req.user);
  res.status(201).json({ return: ret });
});

exports.mine = asyncHandler(async (req, res) => {
  res.json({ returns: await ReturnRequest.find({ user: req.user._id }).sort('-createdAt') });
});

// ----- Admin -----
const NEXT = {
  Requested: ['Approved', 'Rejected'],
  Approved: ['Picked Up'],
  'Picked Up': ['Refunded', 'Exchanged'],
};

exports.adminList = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  const returns = await ReturnRequest.find(filter).sort('-createdAt').limit(200).populate('user', 'name email phone').populate('order', 'paymentMethod shippingAddress total payment.razorpayPaymentId');
  res.json({ returns });
});

/**
 * Moves a return one step forward. Each step is an atomic claim on the current status, so double-clicks
 * or two admins can't reserve exchange stock twice, restock twice or refund twice.
 * For prepaid orders, "Refunded" sends the money back through Razorpay unless method is 'manual'.
 */
exports.adminUpdate = asyncHandler(async (req, res) => {
  const { status, note = '', method } = req.body;
  const cleanNote = String(note).slice(0, 300);
  const ret = await ReturnRequest.findById(req.params.id).populate('order');
  if (!ret) throw ApiError.notFound('Return not found');
  const allowed = (NEXT[ret.status] || []).filter((s) => (ret.type === 'return' ? s !== 'Exchanged' : s !== 'Refunded'));
  if (!allowed.includes(status)) throw ApiError.badRequest(`A ${ret.status.toLowerCase()} request can move to: ${allowed.join(', ') || 'nothing (closed)'}`);
  if (status === 'Rejected' && !cleanNote) throw ApiError.badRequest('Add a note explaining why the request is rejected');

  if (status === 'Refunded') {
    const order = ret.order;
    const online = order?.paymentMethod === 'RAZORPAY' && order.payment?.razorpayPaymentId && method !== 'manual';
    const claimed = await ReturnRequest.findOneAndUpdate({ _id: ret._id, status: 'Picked Up' }, { $set: { status: 'Refund Processing' } }, { new: true });
    if (!claimed) throw ApiError.conflict('This return changed while you were editing it. Refresh and try again.');
    let refundId = '';
    try {
      if (online) {
        const refund = await refundViaRazorpay({ order: await Order.findById(order._id), amount: ret.refundAmount, kind: 'return', returnId: ret._id, note: `Return ${ret.returnNumber}` });
        refundId = refund.id;
      } else {
        await Order.updateOne({ _id: order._id }, { $push: { refunds: { refundId: cleanNote.slice(0, 100), amount: ret.refundAmount, status: 'manual', kind: 'return', returnId: ret._id } } });
      }
    } catch (err) {
      await ReturnRequest.updateOne({ _id: ret._id, status: 'Refund Processing' }, { $set: { status: 'Picked Up' }, $push: { history: { status: 'Picked Up', note: err.message } } });
      throw err;
    }
    const refundedTotal = ((await Order.findById(order._id)).refunds || []).filter((r) => r.status !== 'failed').reduce((s2, r) => s2 + r.amount, 0);
    await Order.updateOne({ _id: order._id, paymentStatus: { $in: ['Paid', 'Partially Refunded'] } }, { $set: { paymentStatus: refundedTotal >= order.total - 0.01 ? 'Refunded' : 'Partially Refunded' } });
    await ReturnRequest.updateOne({ _id: ret._id }, {
      $set: { status: 'Refunded', refundId, refundMethod: online ? 'razorpay' : 'manual' },
      $push: { history: { status: 'Refunded', note: cleanNote || (online ? `Refunded via Razorpay (${refundId})` : 'Refunded manually') } },
    });
  } else {
    await withTx(async (session) => {
      const claimed = await ReturnRequest.findOneAndUpdate(
        { _id: ret._id, status: ret.status },
        {
          $set: { status, ...(status === 'Approved' && ret.type === 'exchange' ? { exchangeStockReserved: true } : {}), ...(status === 'Picked Up' ? { restocked: true } : {}) },
          $push: { history: { status, note: cleanNote } },
        },
        { new: false, session }
      );
      if (!claimed) throw ApiError.conflict('This return changed while you were editing it. Refresh and try again.');
      // Reserve replacement sizes when an exchange is approved, so they can't sell out before dispatch.
      if (status === 'Approved' && ret.type === 'exchange' && !claimed.exchangeStockReserved) {
        try {
          await commitStock(ret.items.map((i) => ({ product: i.product, name: i.name, size: i.exchangeSize, quantity: i.quantity })), session);
        } catch (err) {
          if (!session) await ReturnRequest.updateOne({ _id: ret._id }, { $set: { status: ret.status, exchangeStockReserved: false }, $pop: { history: 1 } });
          throw err;
        }
      }
      if (status === 'Picked Up' && !claimed.restocked) {
        await restoreStock(ret.items.map((i) => ({ product: i.product, size: i.size, quantity: i.quantity })), session);
      }
    });
  }

  const updated = await ReturnRequest.findById(ret._id).populate('user', 'name email phone').populate('order', 'paymentMethod shippingAddress total payment.razorpayPaymentId');
  if (updated.user) mailer.returnUpdate(updated, updated.user);
  res.json({ return: updated });
});
