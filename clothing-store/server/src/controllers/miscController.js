const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const StockAlert = require('../models/StockAlert');
const ContactMessage = require('../models/ContactMessage');
const SiteSettings = require('../models/SiteSettings');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate, EMAIL_RE, PHONE_RE } = require('../utils/validate');
const { estimateDelivery } = require('../services/delivery');
const { buildInvoice } = require('../services/gst');
const mailer = require('../services/email');
const { getStore, invalidate, publicStore } = require('../services/storeConfig');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- Search suggestions ----
exports.suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (q.length < 2) return res.json({ products: [], categories: [] });
  const re = new RegExp(escapeRe(q), 'i');
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, name: re }).select('name slug images price finalPrice').sort('-sold').limit(6).lean(),
    Category.find({ isActive: true, name: re }).select('name slug').limit(3).lean(),
  ]);
  res.json({ products, categories });
});

// ---- Delivery estimate ----
exports.delivery = (req, res) => res.json(estimateDelivery(req.query.pincode));

// ---- Back-in-stock alerts ----
exports.notifyMe = asyncHandler(async (req, res) => {
  const addr = String(req.body.email || req.user?.email || '').toLowerCase().trim();
  if (!EMAIL_RE.test(addr)) throw ApiError.badRequest('Enter a valid email address');
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Product not found');
  const p = await Product.findById(req.params.id).select('sizes');
  const size = p?.sizes.find((s) => s.name === req.body.size);
  if (!size) throw ApiError.badRequest('Choose a size');
  if (size.stock > 0) throw ApiError.badRequest('That size is in stock now');
  await StockAlert.updateOne({ product: p._id, size: size.name, email: addr }, { $set: { notifiedAt: null } }, { upsert: true });
  res.status(201).json({ message: `We’ll email ${addr} when size ${size.name} is back` });
});

// ---- Contact ----
exports.contact = asyncHandler(async (req, res) => {
  validate(req.body, {
    name: { required: true, label: 'Name', minLength: 2, maxLength: 80 },
    email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
    phone: { label: 'Phone', pattern: PHONE_RE, message: 'Enter a valid 10-digit mobile number' },
    subject: { required: true, label: 'Topic', maxLength: 80 },
    message: { required: true, label: 'Message', minLength: 10, maxLength: 3000 },
  });
  const msg = await ContactMessage.create({
    name: req.body.name.trim(), email: req.body.email.trim(), phone: (req.body.phone || '').trim(),
    orderNumber: String(req.body.orderNumber || '').trim().slice(0, 30), subject: req.body.subject.trim(), message: req.body.message.trim(),
  });
  mailer.contactToStore(msg);
  res.status(201).json({ message: 'Message sent' });
});

exports.messages = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json({ messages: await ContactMessage.find(filter).sort('-createdAt').limit(300) });
});

exports.updateMessage = asyncHandler(async (req, res) => {
  if (!['New', 'Read', 'Resolved'].includes(req.body.status)) throw ApiError.badRequest('Invalid status');
  const m = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!m) throw ApiError.notFound('Message not found');
  res.json({ message: m });
});

// ---- Site settings (homepage banners, announcement) ----
const merge = (defaults, data = {}) => Object.fromEntries(
  Object.entries(defaults).map(([k, v]) => [k, typeof v === 'object' && v !== null ? { ...v, ...(data[k] || {}) } : data[k] ?? v])
);

exports.getSettings = asyncHandler(async (_req, res) => {
  const doc = await SiteSettings.findOne({ key: 'site' }).lean();
  res.json({ settings: merge(SiteSettings.DEFAULTS, doc?.data), store: publicStore(await getStore()) });
});

const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const linkOk = (v) => !v || /^\/[^\s]*$/.test(v) || /^https?:\/\/\S+$/.test(v);

exports.updateSettings = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const data = {
    announcement: { enabled: Boolean(b.announcement?.enabled), text: str(b.announcement?.text, 140), link: str(b.announcement?.link, 200) },
    hero: Object.fromEntries(['image', 'imageAlt', 'eyebrow', 'headline', 'primaryLabel', 'primaryLink', 'secondaryLabel', 'secondaryLink'].map((k) => [k, str(b.hero?.[k], k === 'image' ? 600 : 200)])),
    promo: {
      enabled: Boolean(b.promo?.enabled),
      ...Object.fromEntries(['eyebrow', 'headline', 'body', 'image', 'imageAlt', 'ctaLabel', 'ctaLink'].map((k) => [k, str(b.promo?.[k], k === 'image' ? 600 : 300)])),
    },
  };
  if (!data.hero.image || !data.hero.headline) throw ApiError.badRequest('The hero needs an image and a headline');
  const st = b.store || {};
  const num = (v, min, max, label) => {
    if (v === '' || v === undefined || v === null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw ApiError.badRequest(`${label} must be between ${min} and ${max}`);
    return n;
  };
  data.store = {
    name: str(st.name, 80), legalName: str(st.legalName, 120), email: str(st.email, 120), phone: str(st.phone, 30),
    address: str(st.address, 300), state: str(st.state, 60), gstin: str(st.gstin, 15).toUpperCase(),
    supportHours: str(st.supportHours, 80), grievanceName: str(st.grievanceName, 80), grievanceEmail: str(st.grievanceEmail, 120),
    dispatchTime: str(st.dispatchTime, 60),
    freeShippingThreshold: num(st.freeShippingThreshold, 0, 100000, 'Free shipping threshold'),
    shippingFee: num(st.shippingFee, 0, 2000, 'Shipping fee'),
    returnWindowDays: num(st.returnWindowDays, 0, 90, 'Return window'),
  };
  if (data.store.email && !EMAIL_RE.test(data.store.email)) throw ApiError.badRequest('Support email is not valid');
  if (data.store.grievanceEmail && !EMAIL_RE.test(data.store.grievanceEmail)) throw ApiError.badRequest('Grievance officer email is not valid');
  if (data.store.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(data.store.gstin)) throw ApiError.badRequest('GSTIN must be 15 characters in the official format, e.g. 27ABCDE1234F1Z5');
  const links = [data.announcement.link, data.hero.primaryLink, data.hero.secondaryLink, data.promo.ctaLink];
  if (!links.every(linkOk)) throw ApiError.badRequest('Links must start with / (a page on this site) or https://');
  await SiteSettings.updateOne({ key: 'site' }, { $set: { data } }, { upsert: true });
  invalidate();
  res.json({ settings: merge(SiteSettings.DEFAULTS, data), store: publicStore(await getStore()) });
});

// ---- GST invoice ----
exports.invoice = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Order not found');
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user._id) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.notFound('Order not found');
  if (order.status === 'Pending Payment') throw ApiError.badRequest('An invoice is available once the order is placed');
  const prods = await Product.find({ _id: { $in: order.items.map((i) => i.product) } }).select('hsn category').populate('category', 'hsn').lean();
  const hsnByProduct = Object.fromEntries(prods.map((p) => [String(p._id), p.hsn || p.category?.hsn || '']));
  res.json({ order, invoice: buildInvoice(order, hsnByProduct, await getStore()) });
});

// ---- Sales report ----
exports.report = asyncHandler(async (req, res) => {
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : new Date();
  const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : new Date(to.getTime() - 29 * 864e5);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw ApiError.badRequest('Choose a valid date range');
  const orders = await Order.find({ createdAt: { $gte: from, $lte: to }, status: { $ne: 'Pending Payment' } })
    .sort('createdAt').limit(5000).populate('user', 'name email').lean();
  const valid = orders.filter((o) => o.status !== 'Cancelled');
  const sum = (arr, k) => Math.round(arr.reduce((s, o) => s + (o[k] || 0), 0) * 100) / 100;

  const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const byDayMap = new Map();
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 864e5)) byDayMap.set(dayKey(d), { date: dayKey(d), orders: 0, revenue: 0 });
  valid.forEach((o) => { const k = byDayMap.get(dayKey(o.createdAt)); if (k) { k.orders++; k.revenue = Math.round((k.revenue + o.total) * 100) / 100; } });

  const prod = new Map();
  valid.forEach((o) => o.items.forEach((i) => {
    const k = String(i.product);
    const cur = prod.get(k) || { name: i.name, units: 0, revenue: 0 };
    cur.units += i.quantity; cur.revenue = Math.round((cur.revenue + i.lineTotal) * 100) / 100;
    prod.set(k, cur);
  }));
  const byPayment = ['COD', 'RAZORPAY'].map((m) => ({ method: m, orders: valid.filter((o) => o.paymentMethod === m).length, revenue: sum(valid.filter((o) => o.paymentMethod === m), 'total') }));

  res.json({
    range: { from, to },
    summary: {
      grossSales: sum(valid, 'total'),
      orders: valid.length,
      cancelled: orders.length - valid.length,
      units: valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
      avgOrderValue: valid.length ? Math.round((sum(valid, 'total') / valid.length) * 100) / 100 : 0,
      discounts: sum(valid, 'discount'),
      shipping: sum(valid, 'shippingFee'),
    },
    byDay: [...byDayMap.values()],
    byPayment,
    topProducts: [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber, date: o.createdAt, customer: o.user?.name || '', email: o.user?.email || '',
      items: o.items.reduce((s, i) => s + i.quantity, 0), subtotal: o.subtotal, discount: o.discount, coupon: o.couponCode,
      shipping: o.shippingFee, total: o.total, payment: o.paymentMethod, paymentStatus: o.paymentStatus, status: o.status,
      city: o.shippingAddress?.city, state: o.shippingAddress?.state, pincode: o.shippingAddress?.pincode,
    })),
  });
});
