const { PaymentMethod, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const { CASH_CODE } = PaymentMethod;

function publicMethod(method) {
  return {
    id: method.id,
    name: method.name,
    code: method.code,
    description: method.description,
    instructions: method.instructions,
    icon: method.icon,
    isActive: method.isActive,
    isPermanent: method.isPermanent,
    settlesImmediately: method.settlesImmediately,
    sortOrder: method.sortOrder,
  };
}

// GET /api/payment-methods
// Customers only ever receive the methods they are allowed to choose.
exports.listPaymentMethods = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const includeInactive = isAdmin && req.query.includeInactive === 'true';

  const methods = await PaymentMethod.findAll({
    where: includeInactive ? {} : { isActive: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });

  res.json({ success: true, data: { paymentMethods: methods.map(publicMethod) } });
});

// POST /api/payment-methods (admin)
exports.createPaymentMethod = asyncHandler(async (req, res) => {
  const { name, code, description, instructions, icon, isActive, settlesImmediately, sortOrder } =
    req.body;

  const normalisedCode = String(code || name).trim().toLowerCase().replace(/\s+/g, '_');
  if (normalisedCode === CASH_CODE) {
    throw ApiError.conflict('A cash payment method already exists');
  }

  const existing = await PaymentMethod.findOne({ where: { code: normalisedCode } });
  if (existing) throw ApiError.conflict('A payment method with this code already exists');

  const method = await PaymentMethod.create({
    name,
    code: normalisedCode,
    description,
    instructions,
    icon,
    isActive: isActive === undefined ? true : Boolean(isActive),
    // Admin-added methods are treated as settled on placement unless told otherwise.
    settlesImmediately: settlesImmediately === undefined ? true : Boolean(settlesImmediately),
    isPermanent: false,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    success: true,
    message: 'Payment method created',
    data: { paymentMethod: publicMethod(method) },
  });
});

// PATCH /api/payment-methods/:id (admin)
exports.updatePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findByPk(req.params.id);
  if (!method) throw ApiError.notFound('Payment method not found');

  const { name, description, instructions, icon, isActive, settlesImmediately, sortOrder, code } =
    req.body;

  // Cash must stay available, so its availability and identity are locked.
  if (method.isPermanent) {
    if (isActive === false) {
      throw ApiError.badRequest('Cash is always available and cannot be disabled');
    }
    if (code && code !== method.code) {
      throw ApiError.badRequest('The cash payment method code cannot be changed');
    }
  } else if (code && code !== method.code) {
    const clash = await PaymentMethod.findOne({ where: { code } });
    if (clash) throw ApiError.conflict('A payment method with this code already exists');
    method.code = code;
  }

  if (name !== undefined) method.name = name;
  if (description !== undefined) method.description = description;
  if (instructions !== undefined) method.instructions = instructions;
  if (icon !== undefined) method.icon = icon;
  if (isActive !== undefined && !method.isPermanent) method.isActive = Boolean(isActive);
  if (settlesImmediately !== undefined && !method.isPermanent) {
    method.settlesImmediately = Boolean(settlesImmediately);
  }
  if (sortOrder !== undefined) method.sortOrder = sortOrder;

  await method.save();

  res.json({
    success: true,
    message: 'Payment method updated',
    data: { paymentMethod: publicMethod(method) },
  });
});

// PATCH /api/payment-methods/:id/status (admin) -> enable / disable
exports.togglePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findByPk(req.params.id);
  if (!method) throw ApiError.notFound('Payment method not found');

  if (method.isPermanent) {
    throw ApiError.badRequest('Cash is always available and cannot be disabled');
  }

  method.isActive = req.body.isActive === undefined ? !method.isActive : Boolean(req.body.isActive);
  await method.save();

  res.json({
    success: true,
    message: method.isActive ? `${method.name} enabled` : `${method.name} disabled`,
    data: { paymentMethod: publicMethod(method) },
  });
});

// DELETE /api/payment-methods/:id (admin)
exports.deletePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findByPk(req.params.id);
  if (!method) throw ApiError.notFound('Payment method not found');

  if (method.isPermanent) {
    throw ApiError.badRequest('Cash is a permanent payment method and cannot be deleted');
  }

  const orderCount = await Order.count({ where: { paymentMethodId: method.id } });
  if (orderCount > 0) {
    // Orders keep a snapshot of the method, but keeping the row makes reporting
    // straightforward; disabling hides it from customers just as well.
    throw ApiError.badRequest(
      `${orderCount} order(s) used this method. Disable it instead of deleting it.`
    );
  }

  await method.destroy();
  res.json({ success: true, message: 'Payment method deleted' });
});

exports.publicMethod = publicMethod;
