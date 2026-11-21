const mongoose = require('mongoose');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const { getStore } = require('./storeConfig');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Evaluate a coupon against a subtotal. Returns { coupon, discount } or throws a 400 with a clear reason.
 */
async function evaluateCoupon(code, subtotal) {
  if (!code) return { coupon: null, discount: 0 };
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon || !coupon.isActive) throw ApiError.badRequest('This coupon code is not valid');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrder) {
    throw ApiError.badRequest(`Add items worth ₹${(coupon.minOrder - subtotal).toLocaleString('en-IN')} more to use ${coupon.code}`);
  }
  let discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(round2(discount), subtotal);
  return { coupon, discount };
}

/**
 * Build a fully priced order from raw client items: [{ product, size, color, quantity }].
 * Prices come only from the database. Validates availability and stock.
 */
async function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw ApiError.badRequest('Your cart is empty');
  if (rawItems.length > 50) throw ApiError.badRequest('Too many items in one order');

  const ids = rawItems.map((i) => i.product);
  if (!ids.every((id) => mongoose.isValidObjectId(id))) throw ApiError.badRequest('Cart contains an invalid product');
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  // Merge duplicate lines (same product + size + color) so stock checks are accurate.
  const merged = new Map();
  for (const raw of rawItems) {
    const qty = Math.floor(Number(raw.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 10) throw ApiError.badRequest('Quantity must be between 1 and 10');
    const key = `${raw.product}|${raw.size}|${raw.color || ''}`;
    const prev = merged.get(key);
    merged.set(key, { ...raw, quantity: (prev?.quantity || 0) + qty });
  }

  const items = [];
  const needBySize = new Map();
  for (const raw of merged.values()) {
    const p = byId.get(String(raw.product));
    if (!p || !p.isActive) throw ApiError.badRequest('An item in your cart is no longer available');
    const size = p.sizes.find((s) => s.name === raw.size);
    if (!size) throw ApiError.badRequest(`Size ${raw.size} is not available for ${p.name}`);
    if (p.colors.length && raw.color && !p.colors.some((c) => c.name === raw.color)) {
      throw ApiError.badRequest(`Colour ${raw.color} is not available for ${p.name}`);
    }
    const sizeKey = `${p._id}|${size.name}`;
    const need = (needBySize.get(sizeKey) || 0) + raw.quantity;
    needBySize.set(sizeKey, need);
    if (size.stock < need) {
      throw ApiError.badRequest(
        size.stock === 0
          ? `${p.name} (${size.name}) is out of stock`
          : `Only ${size.stock} left of ${p.name} in size ${size.name}`
      );
    }
    const unitPrice = Product.computeDerived({ price: p.price, discountPrice: p.discountPrice }).finalPrice;
    items.push({
      product: p._id,
      name: p.name,
      image: p.colors.find((c) => c.name === raw.color)?.images?.[0] || p.images[0],
      size: size.name,
      color: raw.color || p.colors[0]?.name || '',
      quantity: raw.quantity,
      unitPrice,
      lineTotal: round2(unitPrice * raw.quantity),
    });
  }
  const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
  return { items, subtotal };
}

async function buildQuote(rawItems, couponCode) {
  const { items, subtotal } = await priceItems(rawItems);
  const { coupon, discount } = await evaluateCoupon(couponCode, subtotal);
  const store = await getStore();
  const afterDiscount = round2(subtotal - discount);
  const shippingFee = afterDiscount >= store.freeShippingThreshold ? 0 : store.shippingFee;
  const total = round2(afterDiscount + shippingFee);
  return { items, subtotal, discount, coupon, couponCode: coupon?.code || '', shippingFee, total };
}

/**
 * Decrements stock for every line with a conditional update (only if enough stock remains).
 * In a transaction (session given) any failure aborts everything. Without one, lines already
 * decremented are restored before the error is thrown.
 */
async function commitStock(items, session = null) {
  const done = [];
  for (const it of items) {
    const res = await Product.updateOne(
      { _id: it.product, sizes: { $elemMatch: { name: it.size, stock: { $gte: it.quantity } } } },
      { $inc: { 'sizes.$.stock': -it.quantity, totalStock: -it.quantity, sold: it.quantity } },
      { session }
    );
    if (res.modifiedCount !== 1) {
      if (!session) await restoreStock(done);
      const err = ApiError.conflict(`${it.name || 'An item'} (${it.size}) just sold out. Please update your bag.`);
      err.stockConflict = true;
      throw err;
    }
    done.push(it);
  }
}

async function restoreStock(items, session = null) {
  for (const it of items) {
    await Product.updateOne(
      { _id: it.product, 'sizes.name': it.size },
      { $inc: { 'sizes.$.stock': it.quantity, totalStock: it.quantity, sold: -it.quantity } },
      { session }
    );
  }
}

module.exports = { buildQuote, evaluateCoupon, commitStock, restoreStock, round2 };
