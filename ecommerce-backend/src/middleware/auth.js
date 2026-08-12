const { User } = require('../models');
const { verifyToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

/** Rejects the request unless a valid token maps to an active user. */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('You are not logged in. Please log in to continue.');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Your session is invalid or has expired. Please log in again.');
  }

  const user = await User.findByPk(payload.id);
  if (!user) throw ApiError.unauthorized('The account for this session no longer exists.');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled.');

  req.user = user;
  next();
});

/** Attaches req.user when a token is present, but never rejects. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await User.findByPk(payload.id);
      if (user && user.isActive) req.user = user;
    } catch {
      // An unusable token is treated the same as no token at all.
    }
  }
  next();
});

/** Route guard: restrictTo('admin') or restrictTo('admin', 'seller'). */
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action is restricted to: ${roles.join(', ')}.`));
    }
    next();
  };
}

module.exports = { protect, optionalAuth, restrictTo };
