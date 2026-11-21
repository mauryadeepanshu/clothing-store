const mongoose = require('mongoose');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate, addressRules, pickAddress } = require('../utils/validate');
const { buildQuote } = require('../services/pricing');
const { createCodOrder, cancelOrder } = require('../services/orders');
const mailer = require('../services/email');

// Server-side quote used by the checkout page to display authoritative totals.
exports.quote = asyncHandler(async (req, res) => {
  const q = await buildQuote(req.body.items, req.body.couponCode);
  res.json({ items: q.items, subtotal: q.subtotal, discount: q.discount, couponCode: q.couponCode, shippingFee: q.shippingFee, total: q.total });
});

// Cash on Delivery order.
exports.createCOD = asyncHandler(async (req, res) => {
  validate(req.body.shippingAddress || {}, addressRules);
  const quote = await buildQuote(req.body.items, req.body.couponCode);
  const order = await createCodOrder({ user: req.user, quote, shippingAddress: pickAddress(req.body.shippingAddress) });
  res.status(201).json({ order });
});

exports.mine = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id, status: { $ne: 'Pending Payment' } }).sort('-createdAt');
  res.json({ orders });
});

exports.getOne = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Order not found');
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw ApiError.notFound('Order not found');
  const isOwner = String(order.user._id) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.notFound('Order not found');
  res.json({ order });
});

exports.cancelMine = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  const cancelled = await cancelOrder(order._id, { from: ['Placed', 'Confirmed'], note: 'Cancelled by customer', filter: { user: req.user._id } });
  if (!cancelled) {
    const now = await Order.findById(order._id);
    throw ApiError.badRequest(`Orders that are ${now.status.toLowerCase()} can't be cancelled`);
  }
  mailer.orderStatus(cancelled, req.user);
  res.json({ order: cancelled });
});
