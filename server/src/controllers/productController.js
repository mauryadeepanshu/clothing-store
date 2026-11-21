const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { validate } = require('../utils/validate');
const { notifyRestock } = require('../services/alerts');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { finalPrice: 1 },
  'price-desc': { finalPrice: -1 },
  popular: { sold: -1 },
  discount: { discountPercent: -1 },
};

exports.list = asyncHandler(async (req, res) => {
  const { q, gender, category, minPrice, maxPrice, sizes, colors, tag, sort = 'newest' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';

  const match = includeInactive ? {} : { isActive: true };
  if (req.query.ids) {
    const ids = String(req.query.ids).split(',').filter((x) => mongoose.isValidObjectId(x)).slice(0, 24);
    match._id = { $in: ids.map((x) => new mongoose.Types.ObjectId(x)) };
  }
  if (gender) match.gender = { $in: String(gender).split(',') };
  if (category) {
    const slugs = String(category).split(',');
    const cats = await Category.find({ slug: { $in: slugs } }).select('_id');
    match.category = { $in: cats.map((c) => c._id) };
  }
  if (q) {
    const re = new RegExp(escapeRe(String(q).trim().slice(0, 60)), 'i');
    match.$or = [{ name: re }, { description: re }];
  }
  if (sizes) match['sizes.name'] = { $in: String(sizes).split(',') };
  if (colors) match['colors.name'] = { $in: String(colors).split(',') };
  if (tag === 'new') match.isNewArrival = true;
  if (tag === 'bestseller') match.isBestSeller = true;
  if (tag === 'trending') match.isTrending = true;
  if (tag === 'sale') match.discountPrice = { $gt: 0 };

  if (minPrice || maxPrice) {
    match.finalPrice = {};
    if (minPrice) match.finalPrice.$gte = Number(minPrice);
    if (maxPrice) match.finalPrice.$lte = Number(maxPrice);
  }

  const [items, total] = await Promise.all([
    Product.find(match)
      .select('-description -details')
      .sort({ ...(SORTS[sort] || SORTS.newest), _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', 'name slug')
      .lean(),
    Product.countDocuments(match),
  ]);
  res.json({ products: items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// Available filter values for the shop sidebar.
exports.filters = asyncHandler(async (_req, res) => {
  const products = await Product.find({ isActive: true }).select('sizes.name colors price discountPrice').lean();
  const sizeSet = new Set();
  const colorMap = new Map();
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    p.sizes.forEach((s) => sizeSet.add(s.name));
    p.colors.forEach((c) => colorMap.set(c.name, c.hex));
    const fp = Product.computeDerived({ ...p }).finalPrice;
    min = Math.min(min, fp);
    max = Math.max(max, fp);
  }
  const agg = {
    sizes: [...sizeSet].map((x) => ({ _id: x })),
    colors: [...colorMap].sort((a, b) => a[0].localeCompare(b[0])).map(([n, hex]) => ({ _id: n, hex })),
    price: products.length ? [{ min, max }] : [],
  };
  const ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '26', '28', '30', '32', '34', '36', '38', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'Free Size'];
  const sizes = agg.sizes.map((s) => s._id).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  res.json({
    sizes,
    colors: agg.colors.map((c) => ({ name: c._id, hex: c.hex })),
    price: { min: agg.price[0]?.min || 0, max: agg.price[0]?.max || 0 },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const product = await Product.findOne(query).populate('category', 'name slug');
  if (!product || (!product.isActive && req.user?.role !== 'admin')) throw ApiError.notFound('Product not found');
  const related = await Product.find({
    _id: { $ne: product._id },
    isActive: true,
    $or: [{ category: product.category._id }, { gender: product.gender }],
  })
    .sort({ category: product.category._id ? -1 : 1, sold: -1 })
    .limit(8)
    .populate('category', 'name slug');
  // Prefer same-category items first.
  related.sort((a, b) => Number(String(b.category._id) === String(product.category._id)) - Number(String(a.category._id) === String(product.category._id)));
  res.json({ product, related: related.slice(0, 4) });
});

// ---------- Admin ----------

const productRules = {
  name: { required: true, label: 'Name', minLength: 2, maxLength: 120 },
  description: { required: true, label: 'Description', minLength: 10, maxLength: 3000 },
  price: { required: true, label: 'Price', type: 'number', min: 1 },
  discountPrice: { label: 'Sale price', type: 'number', min: 0 },
  gender: { required: true, label: 'Collection', enum: ['men', 'women', 'unisex'] },
  category: { required: true, label: 'Category' },
  images: { required: true, label: 'Images', type: 'array' },
  sizes: { required: true, label: 'Sizes', type: 'array' },
};

function normalize(body) {
  const sizes = (body.sizes || [])
    .filter((s) => s && String(s.name).trim())
    .map((s) => ({ name: String(s.name).trim(), stock: Math.max(0, Math.floor(Number(s.stock) || 0)) }));
  const colors = (body.colors || [])
    .filter((c) => c && String(c.name).trim())
    .map((c) => ({
      name: String(c.name).trim(),
      hex: /^#[0-9a-f]{3,8}$/i.test(c.hex) ? c.hex : '#000000',
      images: (Array.isArray(c.images) ? c.images : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 8),
    }));
  const images = (body.images || []).map((s) => String(s).trim()).filter(Boolean);
  const discount = body.discountPrice === '' || body.discountPrice === null || body.discountPrice === undefined ? null : Number(body.discountPrice);
  if (!images.length) throw ApiError.badRequest('Add at least one product image');
  if (!sizes.length) throw ApiError.badRequest('Add at least one size');
  if (new Set(sizes.map((s) => s.name)).size !== sizes.length) throw ApiError.badRequest('Each size can only be listed once');
  if (discount !== null && discount > 0 && discount >= Number(body.price)) throw ApiError.badRequest('Sale price must be lower than the regular price');
  return {
    name: body.name.trim(),
    description: body.description.trim(),
    details: (body.details || []).map((d) => String(d).trim()).filter(Boolean).slice(0, 12),
    price: Number(body.price),
    discountPrice: discount && discount > 0 ? discount : null,
    gender: body.gender,
    category: body.category,
    images,
    sizes,
    colors,
    hsn: String(body.hsn || '').replace(/[^0-9]/g, '').slice(0, 8),
    isNewArrival: Boolean(body.isNewArrival),
    isBestSeller: Boolean(body.isBestSeller),
    isTrending: Boolean(body.isTrending),
    isActive: body.isActive !== false,
  };
}

async function uniqueSlug(name, excludeId) {
  const base = slugify(name) || 'product';
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${i++}`;
  return slug;
}

exports.create = asyncHandler(async (req, res) => {
  validate(req.body, productRules);
  const data = normalize(req.body);
  if (!(await Category.exists({ _id: data.category }))) throw ApiError.badRequest('Choose a valid category');
  const product = await Product.create({ ...data, slug: await uniqueSlug(data.name) });
  res.status(201).json({ product });
});

exports.update = asyncHandler(async (req, res) => {
  validate(req.body, productRules);
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const data = normalize(req.body);
  if (!(await Category.exists({ _id: data.category }))) throw ApiError.badRequest('Choose a valid category');
  if (data.name !== product.name) product.slug = await uniqueSlug(data.name, product._id);
  const before = product.sizes.map((s) => ({ name: s.name, stock: s.stock }));
  Object.assign(product, data);
  await product.save();
  const notified = await notifyRestock(product, before);
  res.json({ product, notified });
});

// Inventory-only update: [{ name, stock }]
exports.updateStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const before = product.sizes.map((s) => ({ name: s.name, stock: s.stock }));
  const updates = Array.isArray(req.body.sizes) ? req.body.sizes : [];
  for (const u of updates) {
    const s = product.sizes.find((x) => x.name === u.name);
    const stock = Math.floor(Number(u.stock));
    if (s && Number.isFinite(stock) && stock >= 0) s.stock = stock;
  }
  await product.save();
  const notified = await notifyRestock(product, before);
  res.json({ product, notified });
});

exports.remove = asyncHandler(async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Product not found');
  res.json({ message: 'Product deleted' });
});

exports.upload = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Choose at least one image to upload');
  res.status(201).json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
});
