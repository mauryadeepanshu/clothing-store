const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate, PHONE_RE, addressRules, pickAddress } = require('../utils/validate');
const { signToken } = require('../middleware/auth');

exports.updateProfile = asyncHandler(async (req, res) => {
  validate(req.body, {
    name: { required: true, label: 'Name', minLength: 2, maxLength: 60 },
    phone: { label: 'Phone', pattern: PHONE_RE, message: 'Enter a valid 10-digit mobile number' },
  });
  req.user.name = req.body.name.trim();
  req.user.phone = (req.body.phone || '').trim();
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
});

exports.changePassword = asyncHandler(async (req, res) => {
  validate(req.body, {
    currentPassword: { required: true, label: 'Current password' },
    newPassword: { required: true, label: 'New password', minLength: 8, maxLength: 72 },
  });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  // Other devices are signed out; this one gets a fresh token.
  res.json({ message: 'Password updated', token: signToken(user) });
});

const applyDefault = (user, id) => user.addresses.forEach((a) => { a.isDefault = String(a._id) === String(id); });

exports.addAddress = asyncHandler(async (req, res) => {
  validate(req.body, addressRules);
  if (req.user.addresses.length >= 10) throw ApiError.badRequest('You can save up to 10 addresses');
  const addr = { ...pickAddress(req.body), label: (req.body.label || 'Home').slice(0, 30) };
  req.user.addresses.push(addr);
  const created = req.user.addresses[req.user.addresses.length - 1];
  if (req.body.isDefault || req.user.addresses.length === 1) applyDefault(req.user, created._id);
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw ApiError.notFound('Address not found');
  validate(req.body, addressRules);
  Object.assign(addr, pickAddress(req.body), { label: (req.body.label || addr.label).slice(0, 30) });
  if (req.body.isDefault) applyDefault(req.user, addr._id);
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw ApiError.notFound('Address not found');
  const wasDefault = addr.isDefault;
  addr.deleteOne();
  if (wasDefault && req.user.addresses[0]) req.user.addresses[0].isDefault = true;
  await req.user.save();
  res.json({ addresses: req.user.addresses });
});
