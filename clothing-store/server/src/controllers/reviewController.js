const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');

async function recalc(productId) {
  const reviews = await Review.find({ product: productId }).select('rating').lean();
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  await Product.updateOne({ _id: productId }, { $set: { ratingAvg: avg, ratingCount: count } });
}

// A customer may review a product only after an order containing it has been delivered.
const deliveredOrder = (userId, productId) =>
  Order.findOne({ user: userId, status: 'Delivered', 'items.product': productId }).select('items').lean();

exports.list = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Product not found');
  const reviews = await Review.find({ product: id }).sort('-createdAt').limit(100).lean();
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  let canReview = false;
  let myReview = null;
  if (req.user) {
    myReview = reviews.find((r) => String(r.user) === String(req.user._id)) || null;
    canReview = Boolean(await deliveredOrder(req.user._id, id));
  }
  const count = reviews.length;
  res.json({
    reviews: reviews.map(({ user, ...r }) => ({ ...r, mine: req.user ? String(user) === String(req.user._id) : false })),
    summary: { count, avg: count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0, dist },
    canReview,
    myReview,
  });
});

exports.upsert = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validate(req.body, {
    rating: { required: true, label: 'Rating', type: 'number', min: 1, max: 5 },
    title: { label: 'Title', maxLength: 100 },
    comment: { required: true, label: 'Review', minLength: 10, maxLength: 2000 },
  });
  const order = await deliveredOrder(req.user._id, id);
  if (!order) throw ApiError.forbidden('You can review this item once your order has been delivered');
  const bought = order.items.find((i) => String(i.product) === String(id));
  const review = await Review.findOneAndUpdate(
    { product: id, user: req.user._id },
    { $set: { name: req.user.name.split(' ')[0] + (req.user.name.split(' ')[1] ? ` ${req.user.name.split(' ')[1][0]}.` : ''), rating: Math.round(Number(req.body.rating)), title: (req.body.title || '').trim(), comment: req.body.comment.trim(), size: bought?.size || '' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await recalc(id);
  res.status(201).json({ review });
});

exports.removeMine = asyncHandler(async (req, res) => {
  const r = await Review.findOneAndDelete({ product: req.params.id, user: req.user._id });
  if (!r) throw ApiError.notFound('Review not found');
  await recalc(req.params.id);
  res.json({ message: 'Review deleted' });
});

// Admin moderation
exports.adminList = asyncHandler(async (req, res) => {
  const filter = req.query.rating ? { rating: Number(req.query.rating) } : {};
  const reviews = await Review.find(filter).sort('-createdAt').limit(300).populate('product', 'name slug images').populate('user', 'email').lean();
  res.json({ reviews });
});

exports.adminRemove = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndDelete(req.params.reviewId);
  if (!r) throw ApiError.notFound('Review not found');
  await recalc(r.product);
  res.json({ message: 'Review deleted' });
});
