const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const POPULATE = { path: 'items.product', select: 'name slug images price discountPrice finalPrice sizes colors isActive' };

async function getCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate(POPULATE);
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

// Drops lines whose product was deleted/deactivated or whose size no longer exists.
function serialize(cart) {
  const items = cart.items
    .filter((i) => i.product && i.product.isActive && i.product.sizes.some((s) => s.name === i.size))
    .map((i) => {
      const p = i.product;
      const stock = p.sizes.find((s) => s.name === i.size).stock;
      return {
        _id: i._id,
        product: { _id: p._id, name: p.name, slug: p.slug, image: p.colors.find((c) => c.name === i.color)?.images?.[0] || p.images[0], price: p.price, finalPrice: p.finalPrice },
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        stock,
      };
    });
  return { items };
}

async function checkLine(productId, size, color, quantity) {
  if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest('Invalid product');
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1 || qty > 10) throw ApiError.badRequest('Quantity must be between 1 and 10');
  const p = await Product.findById(productId);
  if (!p || !p.isActive) throw ApiError.notFound('Product not available');
  const s = p.sizes.find((x) => x.name === size);
  if (!s) throw ApiError.badRequest('Select a valid size');
  if (color && p.colors.length && !p.colors.some((c) => c.name === color)) throw ApiError.badRequest('Select a valid colour');
  return { p, s, qty };
}

exports.get = asyncHandler(async (req, res) => res.json(serialize(await getCart(req.user._id))));

exports.add = asyncHandler(async (req, res) => {
  const { product, size, color = '', quantity = 1 } = req.body;
  const { s, qty } = await checkLine(product, size, color, quantity);
  const cart = await Cart.findOne({ user: req.user._id }) || new Cart({ user: req.user._id, items: [] });
  const existing = cart.items.find((i) => String(i.product) === String(product) && i.size === size && i.color === color);
  const newQty = Math.min(10, (existing?.quantity || 0) + qty);
  if (newQty > s.stock) throw ApiError.badRequest(s.stock ? `Only ${s.stock} left in size ${size}` : 'This size is out of stock');
  if (existing) existing.quantity = newQty;
  else cart.items.push({ product, size, color, quantity: qty });
  await cart.save();
  res.json(serialize(await getCart(req.user._id)));
});

exports.update = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const line = cart?.items.id(req.params.itemId);
  if (!line) throw ApiError.notFound('Cart item not found');
  const { s, qty } = await checkLine(line.product, line.size, line.color, req.body.quantity);
  if (qty > s.stock) throw ApiError.badRequest(`Only ${s.stock} left in size ${line.size}`);
  line.quantity = qty;
  await cart.save();
  res.json(serialize(await getCart(req.user._id)));
});

exports.remove = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { _id: req.params.itemId } } });
  res.json(serialize(await getCart(req.user._id)));
});

exports.clear = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.json({ items: [] });
});

// Merges a guest (localStorage) cart into the account cart after login.
exports.merge = asyncHandler(async (req, res) => {
  const incoming = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  const cart = await Cart.findOne({ user: req.user._id }) || new Cart({ user: req.user._id, items: [] });
  for (const raw of incoming) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { s, qty } = await checkLine(raw.product, raw.size, raw.color || '', raw.quantity);
      const existing = cart.items.find((i) => String(i.product) === String(raw.product) && i.size === raw.size && i.color === (raw.color || ''));
      const q = Math.min(10, s.stock, (existing?.quantity || 0) + qty);
      if (q < 1) continue;
      if (existing) existing.quantity = q;
      else cart.items.push({ product: raw.product, size: raw.size, color: raw.color || '', quantity: q });
    } catch { /* skip invalid guest lines */ }
  }
  await cart.save();
  res.json(serialize(await getCart(req.user._id)));
});
