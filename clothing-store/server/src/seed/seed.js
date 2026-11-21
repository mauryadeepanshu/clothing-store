/* eslint-disable no-console */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const env = require('../config/env');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const slugify = require('../utils/slugify');
const { categories, products, coupons } = require('./data');

/**
 * Usage:
 *   npm run seed          -> replaces categories, products and coupons; creates/updates the admin
 *   npm run seed -- --admin-only   -> only creates/updates the admin account
 * Orders, customers, carts and wishlists are never deleted.
 */
async function run() {
  await connectDB();
  const adminOnly = process.argv.includes('--admin-only');

  if (!adminOnly) {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({}), Coupon.deleteMany({})]);
    const cats = await Category.insertMany(categories.map((c) => ({ ...c, slug: slugify(c.name) })));
    const catId = Object.fromEntries(cats.map((c) => [c.name, c._id]));

    const docs = products.map((p, i) => {
      const flags = Object.fromEntries((p.flags || []).map((f) => [f, true]));
      return Product.computeDerived({
        name: p.name,
        hsn: p.hsn || '',
        slug: slugify(p.name),
        description: p.description,
        details: p.details,
        price: p.price,
        discountPrice: p.discountPrice || null,
        gender: p.gender,
        category: catId[p.cat],
        images: p.images,
        sizes: p.sizes,
        colors: p.colors,
        ...flags,
        sold: flags.isBestSeller ? 40 + ((i * 7) % 60) : (i * 3) % 20,
        // Stagger createdAt so "Newest" sorting is meaningful.
        createdAt: new Date(Date.now() - (products.length - i) * 36e5 * (flags.isNewArrival ? 1 : 24)),
      });
    });
    await Product.insertMany(docs);
    const in90 = new Date(Date.now() + 90 * 864e5);
    await Coupon.insertMany(coupons.map((c) => ({ ...c, expiresAt: in90 })));
    console.log(`Seeded ${cats.length} categories, ${docs.length} products, ${coupons.length} coupons.`);
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8 || ADMIN_PASSWORD === 'choose_a_strong_password') {
    console.warn('Admin not created: set ADMIN_EMAIL and a real ADMIN_PASSWORD (8+ chars) in server/.env, then run `npm run seed -- --admin-only`.');
  } else {
    let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+password');
    if (!admin) admin = new User({ email: ADMIN_EMAIL.toLowerCase() });
    admin.name = ADMIN_NAME || 'Store Admin';
    admin.password = ADMIN_PASSWORD;
    admin.role = 'admin';
    admin.isBlocked = false;
    await admin.save();
    console.log(`Admin ready: ${admin.email}`);
  }
  void env;
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
