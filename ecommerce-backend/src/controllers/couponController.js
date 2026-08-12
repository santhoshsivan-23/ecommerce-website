const { Coupon, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/coupons (admin)
exports.listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: { coupons } });
});

// POST /api/coupons (admin)
exports.createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscount,
    startsAt,
    expiresAt,
    usageLimit,
    isActive,
  } = req.body;

  const existing = await Coupon.findOne({ where: { code: String(code).trim().toUpperCase() } });
  if (existing) throw ApiError.conflict('A coupon with this code already exists');

  if (discountType === 'percent' && Number(discountValue) > 100) {
    throw ApiError.badRequest('A percentage discount cannot exceed 100');
  }

  const coupon = await Coupon.create({
    code,
    description,
    discountType: discountType === 'fixed' ? 'fixed' : 'percent',
    discountValue: Number(discountValue),
    minOrderValue: Number(minOrderValue) || 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    isActive: isActive === undefined ? true : Boolean(isActive),
  });

  res.status(201).json({ success: true, message: 'Coupon created', data: { coupon } });
});

// PATCH /api/coupons/:id (admin)
exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');

  const fields = [
    'description',
    'discountType',
    'discountValue',
    'minOrderValue',
    'maxDiscount',
    'startsAt',
    'expiresAt',
    'usageLimit',
    'isActive',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) coupon[field] = req.body[field];
  });

  if (req.body.code && req.body.code !== coupon.code) {
    const clash = await Coupon.findOne({ where: { code: String(req.body.code).toUpperCase() } });
    if (clash) throw ApiError.conflict('A coupon with this code already exists');
    coupon.code = req.body.code;
  }

  if (coupon.discountType === 'percent' && coupon.discountValue > 100) {
    throw ApiError.badRequest('A percentage discount cannot exceed 100');
  }

  await coupon.save();
  res.json({ success: true, message: 'Coupon updated', data: { coupon } });
});

// DELETE /api/coupons/:id (admin)
exports.deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');

  const orderCount = await Order.count({ where: { couponId: coupon.id } });
  if (orderCount > 0) {
    throw ApiError.badRequest(
      `${orderCount} order(s) used this coupon. Deactivate it instead of deleting it.`
    );
  }

  await coupon.destroy();
  res.json({ success: true, message: 'Coupon deleted' });
});
