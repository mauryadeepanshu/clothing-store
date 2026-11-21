const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function load(userId) {
  const w = await Wishlist.findOne({ user: userId }).populate({
    path: 'products',
    match: { isActive: true },
    select: 'name slug images price discountPrice finalPrice discountPercent totalStock gender',
  });
  return { products: w ? w.products : [] };
}

exports.get = asyncHandler(async (req, res) => res.json(await load(req.user._id)));

exports.add = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId) || !(await Product.exists({ _id: productId, isActive: true }))) {
    throw ApiError.notFound('Product not found');
  }
  await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: productId } }, { upsert: true });
  res.json(await load(req.user._id));
});

exports.remove = asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.params.productId } });
  res.json(await load(req.user._id));
});
