const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate, EMAIL_RE } = require('../utils/validate');
const crypto = require('crypto');
const { signToken } = require('../middleware/auth');
const mailer = require('../services/email');

const passwordRule = { required: true, label: 'Password', minLength: 8, maxLength: 72 };

exports.register = asyncHandler(async (req, res) => {
  validate(req.body, {
    name: { required: true, label: 'Name', minLength: 2, maxLength: 60 },
    email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
    password: passwordRule,
  });
  const email = req.body.email.toLowerCase().trim();
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  // Role is never taken from the request body: every public sign-up is a customer.
  const user = await User.create({ name: req.body.name.trim(), email, password: req.body.password });
  mailer.welcome(user);
  res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
});

exports.login = asyncHandler(async (req, res) => {
  validate(req.body, {
    email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
    password: { required: true, label: 'Password' },
  });
  const user = await User.findOne({ email: req.body.email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw ApiError.unauthorized('Email or password is incorrect');
  if (user.isBlocked) throw ApiError.forbidden('This account has been blocked. Contact support.');
  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

// Same credentials check, but refuses non-admins so the admin panel can't be entered with a customer account.
exports.adminLogin = asyncHandler(async (req, res) => {
  validate(req.body, {
    email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' },
    password: { required: true, label: 'Password' },
  });
  const user = await User.findOne({ email: req.body.email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw ApiError.unauthorized('Email or password is incorrect');
  if (user.role !== 'admin') throw ApiError.forbidden('This account does not have admin access');
  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// Always answers the same way, so the form can't be used to discover which emails have accounts.
exports.forgot = asyncHandler(async (req, res) => {
  validate(req.body, { email: { required: true, label: 'Email', pattern: EMAIL_RE, message: 'Enter a valid email address' } });
  const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
  if (user && !user.isBlocked) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    mailer.passwordReset(user, token);
  }
  res.json({ message: 'If an account exists for that email, we’ve sent a link to reset the password.' });
});

exports.reset = asyncHandler(async (req, res) => {
  validate(req.body, { token: { required: true, label: 'Reset link' }, password: passwordRule });
  const user = await User.findOne({ resetTokenHash: hashToken(req.body.token), resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  user.password = req.body.password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

exports.me = asyncHandler(async (req, res) => res.json({ user: req.user.toSafeJSON() }));
