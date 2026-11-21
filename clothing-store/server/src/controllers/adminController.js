const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const ReturnRequest = require('../models/ReturnRequest');
const ContactMessage = require('../models/ContactMessage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { cancelOrder, refundViaRazorpay, reconcileRazorpayOrder } = require('../services/orders');
const { rzpMessage } = require('../services/razorpay');
const mailer = require('../services/email');

// Revenue counts paid online orders and delivered COD orders.
const REVENUE_MATCH = {
  status: { $ne: 'Cancelled' },
  $or: [{ paymentStatus: 'Paid' }, { paymentMethod: 'COD', status: 'Delivered' }],
};
const ACTIVE_ORDERS = { status: { $ne: 'Pending Payment' } };

exports.stats = asyncHandler(async (_req, res) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);

  const [revenueAgg, totalOrders, totalCustomers, totalProducts, byStatus, monthly, topProducts, recentOrders, lowStock, pendingCOD] =
    await Promise.all([
      Order.aggregate([{ $match: REVENUE_MATCH }, { $group: { _id: null, total: { $sum: '$total' }, n: { $sum: 1 } } }]),
      Order.countDocuments(ACTIVE_ORDERS),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Order.aggregate([{ $match: ACTIVE_ORDERS }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Order.find({ ...REVENUE_MATCH, createdAt: { $gte: since } }).select('total createdAt').lean(),
      Product.find().sort('-sold').limit(5).select('name images sold price finalPrice totalStock'),
      Order.find(ACTIVE_ORDERS).sort('-createdAt').limit(6).populate('user', 'name email'),
      Product.find({ 'sizes.stock': { $lte: 5 } }).select('name sizes').lean(),
      Order.aggregate([
        { $match: { paymentMethod: 'COD', status: { $nin: ['Cancelled', 'Delivered'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

  // Fill 6 months, including months with no sales.
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const hits = monthly.filter((o) => o.createdAt.getFullYear() === d.getFullYear() && o.createdAt.getMonth() === d.getMonth());
    months.push({
      label: d.toLocaleString('en-IN', { month: 'short' }),
      revenue: Math.round(hits.reduce((s, o) => s + o.total, 0)),
      orders: hits.length,
    });
  }

  res.json({
    revenue: revenueAgg[0]?.total || 0,
    paidOrders: revenueAgg[0]?.n || 0,
    pendingCODValue: pendingCOD[0]?.total || 0,
    totalOrders,
    totalCustomers,
    totalProducts,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    monthly: months,
    topProducts,
    recentOrders,
    attention: {
      refundsDue: await Order.countDocuments({ paymentStatus: 'Refund Required' }),
      returnsWaiting: await ReturnRequest.countDocuments({ status: 'Requested' }),
      newMessages: await ContactMessage.countDocuments({ status: 'New' }),
      stuckPayments: await Order.countDocuments({ paymentStatus: 'Processing', processingSince: { $lt: new Date(Date.now() - 10 * 60000) } }),
    },
    lowStock: lowStock
      .flatMap((p) => p.sizes.filter((x) => x.stock <= 5).map((x) => ({ _id: p._id, name: p.name, size: x.name, stock: x.stock })))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10),
  });
});

exports.orders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const filter = { ...ACTIVE_ORDERS };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.orderNumber = new RegExp(String(req.query.q).replace(/[^A-Za-z0-9]/g, ''), 'i');
  const [orders, total] = await Promise.all([
    Order.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('user', 'name email'),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, total, page, pages: Math.ceil(total / limit) || 1 });
});

const FLOW = ['Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  if (![...FLOW, 'Cancelled'].includes(status)) throw ApiError.badRequest('Choose a valid status');
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Order not found');
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === 'Pending Payment') throw ApiError.badRequest('This order has not been paid yet');
  if (['Cancelled', 'Delivered'].includes(order.status)) throw ApiError.badRequest(`This order is already ${order.status.toLowerCase()}`);
  const cleanNote = String(note).slice(0, 200);

  let updated;
  if (status === 'Cancelled') {
    updated = await cancelOrder(order._id, { from: FLOW.slice(0, -1), note: cleanNote || 'Cancelled by store' });
  } else {
    if (FLOW.indexOf(status) <= FLOW.indexOf(order.status)) throw ApiError.badRequest('Order status can only move forward');
    // Conditional on the status we just read, so a simultaneous customer cancellation can't be overwritten.
    updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: { status, ...(status === 'Delivered' ? { deliveredAt: new Date(), ...(order.paymentMethod === 'COD' ? { paymentStatus: 'Paid' } : {}) } : {}) },
        $push: { statusHistory: { status, note: cleanNote } },
      },
      { new: true }
    ).populate('user', 'name email phone');
  }
  if (!updated) throw ApiError.conflict('This order changed while you were editing it. Refresh and try again.');
  if (updated.user) mailer.orderStatus(updated, updated.user, cleanNote);
  res.json({ order: updated });
});

/** Full refund of a cancelled, prepaid order through Razorpay. */
exports.refundOrder = asyncHandler(async (req, res) => {
  const claimed = await Order.findOneAndUpdate(
    { _id: req.params.id, paymentStatus: 'Refund Required', paymentMethod: 'RAZORPAY' },
    { $set: { paymentStatus: 'Refund Processing' } },
    { new: true }
  );
  if (!claimed) throw ApiError.badRequest('This order has no pending online refund (it may already be processing)');
  const refunded = (claimed.refunds || []).filter((r) => r.status !== 'failed').reduce((s, r) => s + r.amount, 0);
  try {
    await refundViaRazorpay({ order: claimed, amount: claimed.total - refunded, kind: 'order', note: 'Order cancelled' });
  } catch (err) {
    await Order.updateOne({ _id: claimed._id, paymentStatus: 'Refund Processing' }, {
      $set: { paymentStatus: 'Refund Required' },
      $push: { statusHistory: { status: claimed.status, note: err.message } },
    });
    throw err;
  }
  const order = await Order.findOneAndUpdate({ _id: claimed._id }, { $set: { paymentStatus: 'Refunded' } }, { new: true }).populate('user', 'name email phone');
  if (order.user) mailer.refundIssued(order.user, order, claimed.total - refunded);
  res.json({ order });
});

/** For refunds paid outside Razorpay (cash or UPI), after the admin has sent the money. */
exports.markRefunded = asyncHandler(async (req, res) => {
  const reference = String(req.body?.reference || '').trim().slice(0, 100);
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, paymentStatus: 'Refund Required' },
    {
      $set: { paymentStatus: 'Refunded' },
      $push: {
        statusHistory: { status: 'Cancelled', note: `Refund recorded manually${reference ? ` (ref ${reference})` : ''}` },
      },
    },
    { new: true }
  );
  if (!order) throw ApiError.badRequest('This order has no pending refund');
  const refunded = (order.refunds || []).filter((r) => r.status !== 'failed').reduce((s, r) => s + r.amount, 0);
  await Order.updateOne({ _id: order._id }, { $push: { refunds: { refundId: reference, amount: Math.max(0, order.total - refunded), status: 'manual', kind: 'order' } } });
  res.json({ order: await Order.findById(order._id).populate('user', 'name email phone') });
});

/** Ask Razorpay about an unpaid online order (e.g. customer says money was debited). */
exports.reconcileOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  const result = await reconcileRazorpayOrder(order).catch((err) => { throw err instanceof ApiError ? err : new ApiError(502, rzpMessage(err)); });
  res.json({ action: result.action, order: result.order });
});

exports.customers = asyncHandler(async (req, res) => {
  const filter = { role: 'customer' };
  if (req.query.q) {
    const re = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const users = await User.find(filter).sort('-createdAt').limit(200).lean();
  const stats = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $nin: ['Pending Payment', 'Cancelled'] } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const map = new Map(stats.map((s) => [String(s._id), s]));
  res.json({
    customers: users.map((u) => ({
      _id: u._id, name: u.name, email: u.email, phone: u.phone, isBlocked: u.isBlocked, createdAt: u.createdAt,
      orders: map.get(String(u._id))?.orders || 0,
      spent: map.get(String(u._id))?.spent || 0,
    })),
  });
});

exports.toggleBlock = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'customer' });
  if (!user) throw ApiError.notFound('Customer not found');
  user.isBlocked = !user.isBlocked;
  await user.save();
  res.json({ isBlocked: user.isBlocked });
});
