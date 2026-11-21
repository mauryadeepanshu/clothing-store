const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true }, stock: { type: Number, required: true, min: 0, default: 0 } },
  { _id: false }
);
const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, default: '#000000' },
    images: { type: [String], default: [] }, // photos of the product in this colour; falls back to product images
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true, maxlength: 3000 },
    details: [{ type: String, maxlength: 200 }],
    price: { type: Number, required: true, min: 0 }, // MRP in rupees
    discountPrice: { type: Number, min: 0, default: null }, // selling price if on sale
    gender: { type: String, enum: ['men', 'women', 'unisex'], required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: { type: [String], validate: [(v) => v.length > 0, 'At least one image is required'] },
    sizes: { type: [sizeSchema], validate: [(v) => v.length > 0, 'At least one size is required'] },
    colors: { type: [colorSchema], default: [] },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    hsn: { type: String, trim: true, default: '' }, // overrides the category HSN code when set
    sold: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    // Derived fields, kept in sync on save so the shop can filter/sort with indexed queries.
    finalPrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

function computeDerived(p) {
  const onSale = p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price;
  p.finalPrice = onSale ? p.discountPrice : p.price;
  p.discountPercent = onSale ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0;
  p.totalStock = (p.sizes || []).reduce((s, x) => s + (x.stock || 0), 0);
  return p;
}

productSchema.pre('validate', function derive(next) {
  computeDerived(this);
  next();
});
productSchema.statics.computeDerived = computeDerived;

productSchema.index({ gender: 1, category: 1, isActive: 1 });
productSchema.index({ isActive: 1, finalPrice: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, sold: -1 });

module.exports = mongoose.model('Product', productSchema);
