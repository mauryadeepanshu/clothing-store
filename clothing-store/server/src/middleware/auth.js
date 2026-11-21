const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });
const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
// A password change or reset signs out every existing session.
const tokenStale = (user, payload) => user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime();

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please log in again.');
  }
  const user = await User.findById(payload.id).select('+passwordChangedAt');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (tokenStale(user, payload)) throw ApiError.unauthorized('Your password was changed. Please log in again.');
  if (user.isBlocked) throw ApiError.forbidden('This account has been blocked. Contact support.');
  req.user = user;
  next();
});

// Role check is done against the database record, never the token claim alone.
const adminOnly = (req, _res, next) => {
  if (!req.user || req.user.role !== 'admin') return next(ApiError.forbidden('Admin access required'));
  next();
};

module.exports = { protect, adminOnly, signToken };

// Attaches req.user when a valid token is present, but never blocks the request.
const optionalAuth = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = verifyToken(header.slice(7));
    const user = await User.findById(payload.id).select('+passwordChangedAt');
    if (user && !user.isBlocked && !tokenStale(user, payload)) req.user = user;
  } catch { /* ignore invalid tokens on public routes */ }
  next();
};
module.exports.optionalAuth = optionalAuth;
