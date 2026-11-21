const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const { buildQuote } = require('../services/pricing');

// Customer: preview a coupon against their current cart items (priced on the server).
exports.apply = asyncHandler(async (req, res) => {
  validate(req.body, { code: { required: true, label: 'Coupon code', maxLength: 30 } });
  const quote = await buildQuote(req.body.items, req.body.code);
  res.json({
    code: quote.couponCode,
    description: quote.coupon.description,
    subtotal: quote.subtotal,
    discount: quote.discount,
    shippingFee: quote.shippingFee,
    total: quote.total,
  });
});

// Public list of active coupons to show as hints in the cart.
exports.publicList = asyncHandler(async (_req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] })
    .select('code description minOrder')
    .limit(5);
  res.json({ coupons });
});

const rules = {
  code: { required: true, label: 'Code', minLength: 3, maxLength: 20, pattern: /^[A-Za-z0-9_-]+$/, message: 'Code can only use letters, numbers, - and _' },
  type: { required: true, label: 'Type', enum: ['percent', 'fixed'] },
  value: { required: true, label: 'Value', type: 'number', min: 1 },
  minOrder: { label: 'Minimum order', type: 'number', min: 0 },
  maxDiscount: { label: 'Max discount', type: 'number', min: 0 },
  usageLimit: { label: 'Usage limit', type: 'number', min: 1 },
};

function normalize(b) {
  if (b.type === 'percent' && Number(b.value) > 90) throw ApiError.badRequest('Percent discount cannot exceed 90%');
  const nullable = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    code: b.code.trim().toUpperCase(),
    description: (b.description || '').slice(0, 200),
    type: b.type,
    value: Number(b.value),
    minOrder: Number(b.minOrder) || 0,
    maxDiscount: nullable(b.maxDiscount),
    usageLimit: nullable(b.usageLimit),
    expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
    isActive: b.isActive !== false,
  };
}

exports.adminList = asyncHandler(async (_req, res) => res.json({ coupons: await Coupon.find().sort('-createdAt') }));

exports.create = asyncHandler(async (req, res) => {
  validate(req.body, rules);
  res.status(201).json({ coupon: await Coupon.create(normalize(req.body)) });
});

exports.update = asyncHandler(async (req, res) => {
  validate(req.body, rules);
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  Object.assign(coupon, normalize(req.body));
  await coupon.save();
  res.json({ coupon });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await Coupon.findByIdAndDelete(req.params.id))) throw ApiError.notFound('Coupon not found');
  res.json({ message: 'Coupon deleted' });
});
