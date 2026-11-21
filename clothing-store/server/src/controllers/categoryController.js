const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { validate } = require('../utils/validate');

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' && req.user?.role === 'admin' ? {} : { isActive: true };
  const categories = await Category.find(filter).sort('name').lean();
  const counts = await Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', n: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({ categories: categories.map((c) => ({ ...c, productCount: map.get(String(c._id)) || 0 })) });
});

const rules = {
  name: { required: true, label: 'Name', minLength: 2, maxLength: 50 },
  description: { label: 'Description', maxLength: 300 },
};

exports.create = asyncHandler(async (req, res) => {
  validate(req.body, rules);
  const category = await Category.create({
    name: req.body.name.trim(),
    slug: slugify(req.body.name),
    description: req.body.description || '',
    image: req.body.image || '',
    hsn: String(req.body.hsn || '').replace(/[^0-9]/g, '').slice(0, 8),
    isActive: req.body.isActive !== false,
  });
  res.status(201).json({ category });
});

exports.update = asyncHandler(async (req, res) => {
  validate(req.body, rules);
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  category.name = req.body.name.trim();
  category.slug = slugify(req.body.name);
  category.description = req.body.description || '';
  category.image = req.body.image || '';
  category.hsn = String(req.body.hsn || '').replace(/[^0-9]/g, '').slice(0, 8);
  if (typeof req.body.isActive === 'boolean') category.isActive = req.body.isActive;
  await category.save();
  res.json({ category });
});

exports.remove = asyncHandler(async (req, res) => {
  const inUse = await Product.countDocuments({ category: req.params.id });
  if (inUse) throw ApiError.badRequest(`Move or delete the ${inUse} product(s) in this category first`);
  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Category not found');
  res.json({ message: 'Category deleted' });
});
