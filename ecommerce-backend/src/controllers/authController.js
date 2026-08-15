const { User, Cart } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, sendTokenCookie, clearTokenCookie } = require('../utils/token');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register (Customer Registration)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Public registration strictly creates Customer accounts.
  const user = await User.create({ name, email, password, phone, role: 'customer' });

  // Every customer gets a cart up front so cart reads never have to create one.
  await Cart.findOrCreate({ where: { userId: user.id } });

  const token = sendTokenCookie(res, signToken(user));
  res.status(201).json({ success: true, message: 'Registration successful', data: { user: publicUser(user), token } });
});

// POST /api/auth/admin/register (Business Owner Registration)
exports.adminRegister = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, phone, role: 'admin' });

  const token = sendTokenCookie(res, signToken(user));
  res.status(201).json({
    success: true,
    message: 'Business Owner account registered successfully',
    data: { user: publicUser(user), token },
  });
});

// POST /api/auth/admin/login (Dedicated Admin Authentication Flow)
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).toLowerCase() },
  });

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.role !== 'admin') {
    throw ApiError.forbidden('Access denied. This login portal is restricted to Admin accounts.');
  }

  if (!user.isActive) throw ApiError.forbidden('This admin account has been disabled');

  const token = sendTokenCookie(res, signToken(user));
  res.json({ success: true, message: `Welcome back, Admin ${user.name}`, data: { user: publicUser(user), token } });
});

// POST /api/auth/seller/login (Dedicated Seller Authentication Flow)
exports.sellerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).toLowerCase() },
  });

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.role !== 'seller') {
    throw ApiError.forbidden('Access denied. This login portal is restricted to Seller worker accounts.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This seller account has been deactivated by the business admin.');
  }

  const token = sendTokenCookie(res, signToken(user));
  res.json({ success: true, message: `Welcome back, ${user.name}`, data: { user: publicUser(user), token } });
});

// POST /api/auth/login (Customer / General Login)
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).toLowerCase() },
  });

  // Same message either way so the response cannot be used to enumerate accounts.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  if (user.role === 'customer') await Cart.findOrCreate({ where: { userId: user.id } });

  const token = sendTokenCookie(res, signToken(user));
  res.json({ success: true, message: `Welcome back, ${user.name}`, data: { user: publicUser(user), token } });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

// PATCH /api/auth/me
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  res.json({ success: true, message: 'Profile updated', data: { user: publicUser(user) } });
});

// PATCH /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.scope('withPassword').findByPk(req.user.id);
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  const token = sendTokenCookie(res, signToken(user));
  res.json({ success: true, message: 'Password changed successfully', data: { token } });
});

exports.publicUser = publicUser;
