const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  Order,
  OrderItem,
  OrderStatusHistory,
  CartItem,
  Address,
  PaymentMethod,
  Coupon,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { quoteCart } = require('../services/cartService');
const {
  lockAndValidateStock,
  adjustStock,
  snapshotOrderItems,
  assignOrderNumber,
  recordStatus,
} = require('../services/orderService');

const ORDER_INCLUDES = [
  { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
  {
    model: OrderStatusHistory,
    as: 'statusHistory',
    separate: true,
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'changedBy', attributes: ['id', 'name', 'role'] }],
  },
  { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code', 'icon'] },
  { model: Coupon, as: 'coupon', attributes: ['id', 'code', 'discountType', 'discountValue'] },
];

const CUSTOMER_INCLUDE = {
  model: User,
  as: 'customer',
  attributes: ['id', 'name', 'email', 'phone'],
};

/** Adds the derived fields the UI needs on top of the stored row. */
function decorate(order, { forAdmin = false } = {}) {
  const plain = order.toJSON();
  return {
    ...plain,
    canBeCancelledByCustomer: order.isCustomerCancellable(),
    allowedNextStatuses: forAdmin ? order.allowedNextStatuses() : undefined,
  };
}

/* -------------------------------- Checkout --------------------------------- */

// GET /api/orders/checkout-summary
// Everything the review screen needs, priced by the server.
exports.getCheckoutSummary = asyncHandler(async (req, res) => {
  const quote = await quoteCart(req.user.id, { couponCode: req.query.coupon || null });

  const [addresses, paymentMethods] = await Promise.all([
    Address.findAll({
      where: { userId: req.user.id },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
    }),
    PaymentMethod.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    }),
  ]);

  res.json({
    success: true,
    data: {
      ...quote,
      addresses,
      paymentMethods,
      canPlaceOrder:
        quote.items.length > 0 && !quote.hasUnavailableItems && addresses.length > 0,
    },
  });
});

// POST /api/orders
exports.placeOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethodId, paymentMethodCode, couponCode, customerNote } = req.body;

  const order = await sequelize.transaction(async (transaction) => {
    // 1. Price the cart on the server. The client's totals are never trusted.
    const quote = await quoteCart(req.user.id, {
      couponCode: couponCode || null,
      strictCoupon: Boolean(couponCode),
      transaction,
    });

    if (quote.items.length === 0) throw ApiError.badRequest('Your cart is empty');
    if (quote.hasUnavailableItems) {
      throw ApiError.badRequest(
        'Some items in your cart are unavailable. Please review your cart before ordering.'
      );
    }

    // 2. Delivery address must belong to this customer.
    const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id },
      transaction,
    });
    if (!address) throw ApiError.badRequest('Please select a valid delivery address');

    // 3. Payment method must be one the admin currently offers.
    const method = await PaymentMethod.findOne({
      where: {
        ...(paymentMethodId ? { id: paymentMethodId } : { code: paymentMethodCode }),
        isActive: true,
      },
      transaction,
    });
    if (!method) throw ApiError.badRequest('Please select an available payment method');

    // 4. Lock the stock rows and re-check against the locked values so two
    //    concurrent checkouts cannot oversell the same units.
    await lockAndValidateStock(quote.items, transaction);

    const { summary } = quote;

    // 5. Create the order with a snapshot of address, payment and pricing.
    const created = await Order.create(
      {
        userId: req.user.id,
        subtotal: summary.subtotal,
        productDiscount: summary.productDiscount,
        couponDiscount: summary.couponDiscount,
        discount: summary.discount,
        deliveryCharge: summary.deliveryCharge,
        total: summary.total,
        couponId: quote.coupon ? quote.coupon.id : null,
        couponCode: quote.coupon ? quote.coupon.code : null,
        paymentMethodId: method.id,
        paymentMethodCode: method.code,
        paymentMethodName: method.name,
        // No gateway in this phase: the method alone decides the recorded status.
        paymentStatus: method.resolvePaymentStatus(),
        status: 'pending',
        orderSource: 'customer',
        addressId: address.id,
        shippingFullName: address.fullName,
        shippingPhone: address.phone,
        shippingAddressLine1: address.addressLine1,
        shippingAddressLine2: address.addressLine2,
        shippingLandmark: address.landmark,
        shippingCity: address.city,
        shippingState: address.state,
        shippingPostalCode: address.postalCode,
        shippingCountry: address.country,
        customerNote: customerNote || null,
        placedAt: new Date(),
      },
      { transaction }
    );

    await assignOrderNumber(created, transaction);

    // 6. Snapshot every line so later catalogue edits cannot rewrite history.
    const orderItems = await snapshotOrderItems(created.id, quote.items, transaction);

    // 7. Reduce stock for what was just sold.
    await adjustStock(orderItems, -1, transaction, {
      type: 'order',
      reason: `Order ${created.orderNumber}`,
      orderId: created.id,
      userId: req.user.id,
    });

    if (quote.coupon) {
      await Coupon.increment('usedCount', { where: { id: quote.coupon.id }, transaction });
    }

    // 8. The cart has become an order.
    await CartItem.destroy({ where: { cartId: quote.cartId }, transaction });

    await recordStatus(created.id, 'pending', {
      note: 'Order placed',
      changedById: req.user.id,
      transaction,
    });

    return created;
  });

  const full = await Order.findByPk(order.id, { include: ORDER_INCLUDES });
  res.status(201).json({
    success: true,
    message: `Order ${full.orderNumber} placed successfully`,
    data: { order: decorate(full) },
  });
});

/* ---------------------------- Customer order views -------------------------- */

// GET /api/orders
exports.listMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Math.max(1, Number(limit) || 10));

  const where = { userId: req.user.id };
  if (status) where.status = status;

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
      { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code', 'icon'] },
    ],
    // MySQL DATETIME only stores seconds, so id breaks ties between orders
    // placed in the same second and keeps paging stable.
    order: [['placedAt', 'DESC'], ['id', 'DESC']],
    limit: perPage,
    offset: (pageNum - 1) * perPage,
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      orders: rows.map((order) => decorate(order)),
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    },
  });
});

// GET /api/orders/:idOrNumber
exports.getMyOrder = asyncHandler(async (req, res) => {
  const { idOrNumber } = req.params;
  const where = /^\d+$/.test(idOrNumber)
    ? { id: Number(idOrNumber), userId: req.user.id }
    : { orderNumber: idOrNumber, userId: req.user.id };

  const order = await Order.findOne({ where, include: ORDER_INCLUDES });
  if (!order) throw ApiError.notFound('Order not found');

  res.json({ success: true, data: { order: decorate(order) } });
});

// PATCH /api/orders/:id/cancel
exports.cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await sequelize.transaction(async (transaction) => {
    const found = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: OrderItem, as: 'items' }],
      transaction,
    });
    if (!found) throw ApiError.notFound('Order not found');

    if (found.status === 'cancelled') throw ApiError.badRequest('This order is already cancelled');
    if (!found.isCustomerCancellable()) {
      throw ApiError.badRequest(
        `This order is already ${found.status} and can no longer be cancelled online. Please contact support.`
      );
    }

    // Cancelling puts the reserved units back on sale.
    await adjustStock(found.items, 1, transaction, {
      type: 'cancellation',
      reason: `Order ${found.orderNumber} cancelled by customer`,
      orderId: found.id,
      userId: req.user.id,
    });

    found.status = 'cancelled';
    found.cancelledAt = new Date();
    found.cancelReason = req.body.reason || 'Cancelled by customer';
    if (found.paymentStatus === 'paid') found.paymentStatus = 'refunded';
    await found.save({ transaction });

    await recordStatus(found.id, 'cancelled', {
      note: found.cancelReason,
      changedById: req.user.id,
      transaction,
    });

    return found;
  });

  const full = await Order.findByPk(order.id, { include: ORDER_INCLUDES });
  res.json({ success: true, message: 'Order cancelled', data: { order: decorate(full) } });
});

/* ----------------------------- Admin order views ---------------------------- */

// GET /api/admin/orders
exports.adminListOrders = asyncHandler(async (req, res) => {
  const {
    q,
    status,
    paymentStatus,
    paymentMethod,
    from,
    to,
    sort = 'newest',
    page = 1,
    limit = 15,
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 15));

  const where = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (paymentMethod) where.paymentMethodCode = paymentMethod;

  if (from || to) {
    where.placedAt = {};
    if (from) where.placedAt[Op.gte] = new Date(`${from}T00:00:00`);
    if (to) where.placedAt[Op.lte] = new Date(`${to}T23:59:59`);
  }

  // Search spans the order number and who it was for.
  const customerWhere = {};
  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    where[Op.or] = [
      { orderNumber: { [Op.like]: term } },
      { shippingFullName: { [Op.like]: term } },
      { shippingPhone: { [Op.like]: term } },
      literal(
        `EXISTS (SELECT 1 FROM users u WHERE u.id = \`Order\`.\`userId\` AND (u.name LIKE ${sequelize.escape(term)} OR u.email LIKE ${sequelize.escape(term)}))`
      ),
    ];
  }

  const order =
    sort === 'oldest'
      ? [['placedAt', 'ASC'], ['id', 'ASC']]
      : sort === 'total_desc'
        ? [['total', 'DESC'], ['id', 'DESC']]
        : sort === 'total_asc'
          ? [['total', 'ASC'], ['id', 'ASC']]
          : [['placedAt', 'DESC'], ['id', 'DESC']];

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      { ...CUSTOMER_INCLUDE, where: customerWhere, required: false },
      { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
      { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code'] },
    ],
    order,
    limit: perPage,
    offset: (pageNum - 1) * perPage,
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      orders: rows.map((row) => decorate(row, { forAdmin: true })),
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    },
  });
});

// GET /api/admin/orders/stats
exports.adminOrderStats = asyncHandler(async (req, res) => {
  const [byStatus, byPayment, totals] = await Promise.all([
    Order.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Order.findAll({
      attributes: ['paymentMethodCode', [fn('COUNT', col('id')), 'count']],
      group: ['paymentMethodCode'],
      raw: true,
    }),
    Order.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'orderCount'],
        [fn('COALESCE', fn('SUM', col('total')), 0), 'revenue'],
      ],
      where: { status: { [Op.ne]: 'cancelled' } },
      raw: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {}),
      byPaymentMethod: byPayment.reduce(
        (acc, row) => ({ ...acc, [row.paymentMethodCode]: Number(row.count) }),
        {}
      ),
      orderCount: Number(totals.orderCount),
      revenue: Number(totals.revenue),
    },
  });
});

// GET /api/admin/orders/:id
exports.adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [...ORDER_INCLUDES, CUSTOMER_INCLUDE, { model: Address, as: 'address' }],
  });
  if (!order) throw ApiError.notFound('Order not found');

  res.json({ success: true, data: { order: decorate(order, { forAdmin: true }) } });
});

// PATCH /api/admin/orders/:id/status
exports.adminUpdateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await sequelize.transaction(async (transaction) => {
    const found = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction,
    });
    if (!found) throw ApiError.notFound('Order not found');

    if (found.status === status) throw ApiError.badRequest(`This order is already ${status}`);

    const allowed = found.allowedNextStatuses();
    if (!allowed.includes(status)) {
      throw ApiError.badRequest(
        allowed.length === 0
          ? `A ${found.status} order can no longer change status`
          : `A ${found.status} order can only move to: ${allowed.join(', ')}`
      );
    }

    if (status === 'cancelled') {
      await adjustStock(found.items, 1, transaction, {
        type: 'cancellation',
        reason: `Order ${found.orderNumber} cancelled`,
        orderId: found.id,
        userId: req.user.id,
      });
      found.cancelledAt = new Date();
      found.cancelReason = note || 'Cancelled by admin';
      if (found.paymentStatus === 'paid') found.paymentStatus = 'refunded';
    }

    if (status === 'confirmed') found.confirmedAt = new Date();
    if (status === 'shipped') found.shippedAt = new Date();
    if (status === 'delivered') {
      found.deliveredAt = new Date();
      // Cash is collected on delivery, so delivering settles it.
      if (found.paymentStatus === 'pending') found.paymentStatus = 'paid';
    }

    found.status = status;
    await found.save({ transaction });

    await recordStatus(found.id, status, {
      note: note || null,
      changedById: req.user.id,
      transaction,
    });

    return found;
  });

  const full = await Order.findByPk(order.id, { include: [...ORDER_INCLUDES, CUSTOMER_INCLUDE] });
  res.json({
    success: true,
    message: `Order marked as ${status}`,
    data: { order: decorate(full, { forAdmin: true }) },
  });
});

// PATCH /api/admin/orders/:id/payment-status
exports.adminUpdatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  if (!Order.PAYMENT_STATUSES.includes(paymentStatus)) {
    throw ApiError.badRequest(
      `Payment status must be one of: ${Order.PAYMENT_STATUSES.join(', ')}`
    );
  }

  const order = await Order.findByPk(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  order.paymentStatus = paymentStatus;
  await order.save();

  const full = await Order.findByPk(order.id, { include: [...ORDER_INCLUDES, CUSTOMER_INCLUDE] });
  res.json({
    success: true,
    message: `Payment marked as ${paymentStatus}`,
    data: { order: decorate(full, { forAdmin: true }) },
  });
});
