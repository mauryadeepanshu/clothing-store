const mongoose = require('mongoose');

// Single document (key: 'site') holding content the admin can edit without code changes.
const DEFAULTS = {
  announcement: { enabled: true, text: 'Free shipping on orders over ₹1,999. Returns within 15 days.', link: '/policies/shipping' },
  hero: {
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2000&q=80',
    imageAlt: 'Model in a camel coat walking through the city',
    eyebrow: 'The Autumn–Winter 2026 collection',
    headline: 'Wool coats, rigid denim and the knits you’ll wear all season.',
    primaryLabel: 'Shop women', primaryLink: '/shop/women',
    secondaryLabel: 'Shop men', secondaryLink: '/shop/men',
  },
  promo: {
    enabled: true,
    eyebrow: 'Ends this Sunday',
    headline: '20% off when you spend ₹4,999 or more.',
    body: 'Use code STYLE20 at checkout. Applies to sale items too, up to ₹1,500 off.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Rail of neutral-toned clothing',
    ctaLabel: 'Shop the collection', ctaLink: '/shop',
  },
};

const settingsSchema = new mongoose.Schema(
  { key: { type: String, unique: true, default: 'site' }, data: { type: mongoose.Schema.Types.Mixed, default: {} } },
  { timestamps: true }
);
settingsSchema.statics.DEFAULTS = DEFAULTS;

module.exports = mongoose.model('SiteSettings', settingsSchema);
