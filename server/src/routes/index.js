const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const products = require('../controllers/productController');
const categories = require('../controllers/categoryController');
const cart = require('../controllers/cartController');
const wishlist = require('../controllers/wishlistController');
const coupons = require('../controllers/couponController');
const orders = require('../controllers/orderController');
const payments = require('../controllers/paymentController');
const admin = require('../controllers/adminController');
const newsletter = require('../controllers/newsletterController');
const reviews = require('../controllers/reviewController');
const returns = require('../controllers/returnController');
const misc = require('../controllers/miscController');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again in a few minutes.' } });
const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many submissions. Try again later.' } });
const paymentLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many checkout attempts. Try again in a few minutes.' } });
const admin$ = [protect, adminOnly];

router.get('/health', (_req, res) => res.json({ ok: true }));

// Auth
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/admin/login', authLimiter, auth.adminLogin);
router.get('/auth/me', protect, auth.me);
router.post('/auth/forgot', authLimiter, auth.forgot);
router.post('/auth/reset', authLimiter, auth.reset);

// Account
router.put('/users/profile', protect, users.updateProfile);
router.put('/users/password', protect, users.changePassword);
router.post('/users/addresses', protect, users.addAddress);
router.put('/users/addresses/:id', protect, users.updateAddress);
router.delete('/users/addresses/:id', protect, users.deleteAddress);

// Catalogue
router.get('/products', optionalAuth, products.list);
router.get('/products/filters', products.filters);
router.get('/products/suggest', misc.suggest);
router.get('/products/:id/reviews', optionalAuth, reviews.list);
router.post('/products/:id/reviews', protect, reviews.upsert);
router.delete('/products/:id/reviews', protect, reviews.removeMine);
router.post('/products/:id/notify', formLimiter, optionalAuth, misc.notifyMe);
router.get('/products/:idOrSlug', optionalAuth, products.getOne);
router.get('/categories', optionalAuth, categories.list);

// Cart & wishlist
router.get('/cart', protect, cart.get);
router.post('/cart', protect, cart.add);
router.post('/cart/merge', protect, cart.merge);
router.patch('/cart/:itemId', protect, cart.update);
router.delete('/cart/:itemId', protect, cart.remove);
router.delete('/cart', protect, cart.clear);
router.get('/wishlist', protect, wishlist.get);
router.post('/wishlist/:productId', protect, wishlist.add);
router.delete('/wishlist/:productId', protect, wishlist.remove);

// Coupons
router.get('/coupons/public', coupons.publicList);
router.post('/coupons/apply', coupons.apply);

// Orders & payments
router.post('/orders/quote', orders.quote);
router.post('/orders', paymentLimiter, protect, orders.createCOD);
router.get('/orders/mine', protect, orders.mine);
router.get('/orders/:id', protect, orders.getOne);
router.get('/orders/:id/invoice', protect, misc.invoice);
router.get('/orders/:orderId/return-eligibility', protect, returns.eligibility);
router.post('/orders/:id/cancel', protect, orders.cancelMine);
router.get('/payments/config', payments.config);
router.post('/payments/razorpay/order', paymentLimiter, protect, payments.createOrder);
router.post('/payments/razorpay/verify', paymentLimiter, protect, payments.verify);
router.post('/payments/razorpay/failed', paymentLimiter, protect, payments.markFailed);

// Newsletter, contact, delivery, settings, returns
router.post('/newsletter', formLimiter, newsletter.subscribe);
router.post('/contact', formLimiter, misc.contact);
router.get('/delivery/estimate', misc.delivery);
router.get('/settings', misc.getSettings);
router.get('/returns/reasons', returns.reasons);
router.get('/returns/mine', protect, returns.mine);
router.post('/returns', protect, returns.create);

// Admin
router.get('/admin/stats', admin$, admin.stats);
router.get('/admin/orders', admin$, admin.orders);
router.patch('/admin/orders/:id/status', admin$, admin.updateOrderStatus);
router.post('/admin/orders/:id/refunded', admin$, admin.markRefunded);
router.post('/admin/orders/:id/refund', admin$, admin.refundOrder);
router.post('/admin/orders/:id/reconcile', admin$, admin.reconcileOrder);
router.get('/admin/customers', admin$, admin.customers);
router.patch('/admin/customers/:id/block', admin$, admin.toggleBlock);
router.post('/admin/products', admin$, products.create);
router.put('/admin/products/:id', admin$, products.update);
router.patch('/admin/products/:id/stock', admin$, products.updateStock);
router.delete('/admin/products/:id', admin$, products.remove);
router.post('/admin/uploads', admin$, upload.array('images', 8), upload.verifyImages, products.upload);
router.post('/admin/categories', admin$, categories.create);
router.put('/admin/categories/:id', admin$, categories.update);
router.delete('/admin/categories/:id', admin$, categories.remove);
router.get('/admin/coupons', admin$, coupons.adminList);
router.post('/admin/coupons', admin$, coupons.create);
router.put('/admin/coupons/:id', admin$, coupons.update);
router.delete('/admin/coupons/:id', admin$, coupons.remove);
router.get('/admin/reports', admin$, misc.report);
router.put('/admin/settings', admin$, misc.updateSettings);
router.get('/admin/messages', admin$, misc.messages);
router.patch('/admin/messages/:id', admin$, misc.updateMessage);
router.get('/admin/reviews', admin$, reviews.adminList);
router.delete('/admin/reviews/:reviewId', admin$, reviews.adminRemove);
router.get('/admin/returns', admin$, returns.adminList);
router.patch('/admin/returns/:id', admin$, returns.adminUpdate);

module.exports = router;
