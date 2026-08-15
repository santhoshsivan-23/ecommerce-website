const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  Product,
  ProductVariant,
  ProductImage,
  Brand,
  Category,
  Order,
  OrderItem,
  OrderStatusHistory,
  StockMovement,
  PaymentMethod,
  Address,
  Coupon,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  quoteSelections,
  loadSelections,
  lockAndValidateStock,
  adjustStock,
  snapshotOrderItems,
  assignOrderNumber,
  recordStatus,
} = require('../services/orderService');
// Date windows and the low-stock line are shared with the admin panel, so the
// two dashboards can never disagree about what "this month" or "low" means.
const { LOW_STOCK_THRESHOLD, resolveDateWindow } = require('../utils/reporting');

/* -------------------------------- Dashboard -------------------------------- */

// GET /api/seller/stats
exports.getStats = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;
  const { range = 'all', from, to } = req.query;

  const placedAt = resolveDateWindow({ range, from, to });
  const orderWhere = placedAt ? { placedAt } : {};

  const [productCounts, lowStock, itemAggregate, orderRows] = await Promise.all([
    // Counts across the shared business product catalogue.
    Product.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal('CASE WHEN isActive = 1 THEN 1 ELSE 0 END')), 'active'],
        [fn('SUM', literal(`CASE WHEN stock <= 0 THEN 1 ELSE 0 END`)), 'outOfStock'],
        [
          fn('SUM', literal(`CASE WHEN stock > 0 AND stock <= ${LOW_STOCK_THRESHOLD} THEN 1 ELSE 0 END`)),
          'lowStock',
        ],
      ],
      raw: true,
    }),

    Product.findAll({
      where: { stock: { [Op.lte]: LOW_STOCK_THRESHOLD } },
      attributes: ['id', 'name', 'slug', 'stock', 'isActive'],
      order: [['stock', 'ASC'], ['name', 'ASC']],
      limit: 10,
    }),

    // Revenue represents employee performance on assigned/created order lines.
    OrderItem.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('OrderItem.lineTotal')), 0), 'revenue'],
        [fn('COALESCE', fn('SUM', col('OrderItem.quantity')), 0), 'unitsSold'],
      ],
      where: { sellerId },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [],
          where: { ...orderWhere, status: { [Op.ne]: 'cancelled' } },
          required: true,
        },
      ],
      raw: true,
    }),

    Order.findAll({
      attributes: ['status', [fn('COUNT', literal('DISTINCT `Order`.`id`')), 'count']],
      where: orderWhere,
      group: ['Order.status'],
      raw: true,
    }),
  ]);

  const byStatus = orderRows.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {});
  const totalOrders = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

  res.json({
    success: true,
    data: {
      range: from || to ? 'custom' : range,
      products: {
        total: Number(productCounts?.total || 0),
        active: Number(productCounts?.active || 0),
        outOfStock: Number(productCounts?.outOfStock || 0),
        lowStock: Number(productCounts?.lowStock || 0),
      },
      orders: {
        total: totalOrders,
        pending: (byStatus.pending || 0) + (byStatus.confirmed || 0) + (byStatus.processing || 0),
        shipped: byStatus.shipped || 0,
        completed: byStatus.delivered || 0,
        cancelled: byStatus.cancelled || 0,
        byStatus,
      },
      sales: {
        revenue: Number(itemAggregate?.revenue || 0),
        unitsSold: Number(itemAggregate?.unitsSold || 0),
      },
      lowStockProducts: lowStock,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
  });
});

/* -------------------------------- Inventory -------------------------------- */

// GET /api/seller/inventory
exports.listInventory = asyncHandler(async (req, res) => {
  const { q, stockLevel, page = 1, limit = 20 } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

  // Shared business inventory
  const where = {};
  if (q && String(q).trim()) where.name = { [Op.like]: `%${String(q).trim()}%` };
  if (stockLevel === 'out') where.stock = { [Op.lte]: 0 };
  if (stockLevel === 'low') where.stock = { [Op.gt]: 0, [Op.lte]: LOW_STOCK_THRESHOLD };
  if (stockLevel === 'in') where.stock = { [Op.gt]: LOW_STOCK_THRESHOLD };

  const { rows, count } = await Product.findAndCountAll({
    where,
    attributes: ['id', 'name', 'slug', 'stock', 'isActive', 'price', 'discountPrice'],
    include: [
      { model: Brand, as: 'brand', attributes: ['id', 'name'] },
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: ProductVariant, as: 'variants', separate: true, order: [['id', 'ASC']] },
      {
        model: ProductImage,
        as: 'images',
        separate: true,
        order: [['isPrimary', 'DESC'], ['sortOrder', 'ASC']],
        limit: 1,
      },
    ],
    order: [['stock', 'ASC'], ['name', 'ASC']],
    limit: perPage,
    offset: (pageNum - 1) * perPage,
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      products: rows,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    },
  });
});

/**
 * PATCH /api/seller/inventory/:productId
 * Accepts either a relative `adjustment` (+10 / -3) or an absolute `stock`.
 */
exports.adjustInventory = asyncHandler(async (req, res) => {
  const { variantId = null, adjustment, stock, reason } = req.body;

  if (adjustment === undefined && stock === undefined) {
    throw ApiError.badRequest('Provide either an adjustment or a new stock value');
  }

  const result = await sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(req.params.productId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) throw ApiError.notFound('Product not found');

    let variant = null;
    if (variantId) {
      variant = await ProductVariant.findOne({
        where: { id: variantId, productId: product.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!variant) throw ApiError.badRequest('That variant does not belong to this product');
    }

    const current = variant ? variant.stock : product.stock;
    const next =
      adjustment !== undefined ? current + Number(adjustment) : Number(stock);

    if (!Number.isFinite(next)) throw ApiError.badRequest('Stock must be a number');
    if (next < 0) throw ApiError.badRequest(`Stock cannot go below zero (currently ${current})`);

    const change = next - current;

    if (variant) {
      variant.stock = next;
      await variant.save({ transaction });
      // The parent stock mirrors the variant totals, so move it by the same amount.
      product.stock = Math.max(0, product.stock + change);
    } else {
      product.stock = next;
    }
    await product.save({ transaction });

    await StockMovement.create(
      {
        productId: product.id,
        variantId: variant ? variant.id : null,
        sellerId: req.user.id,
        type: 'adjustment',
        quantityChange: change,
        resultingStock: next,
        reason: reason || (change >= 0 ? 'Stock added' : 'Stock removed'),
        createdById: req.user.id,
      },
      { transaction }
    );

    return { product, variant, previousStock: current, newStock: next, change };
  });

  res.json({
    success: true,
    message:
      result.change === 0
        ? 'Stock unchanged'
        : `Stock ${result.change > 0 ? 'increased' : 'reduced'} from ${result.previousStock} to ${result.newStock}`,
    data: {
      productId: result.product.id,
      variantId: result.variant ? result.variant.id : null,
      productStock: result.product.stock,
      newStock: result.newStock,
      change: result.change,
    },
  });
});

// GET /api/seller/inventory/:productId/history
exports.getStockHistory = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.productId, {
    attributes: ['id', 'name', 'stock', 'sellerId'],
  });
  if (!product) throw ApiError.notFound('Product not found');

  const movements = await StockMovement.findAll({
    where: { productId: product.id },
    include: [
      { model: User, as: 'createdBy', attributes: ['id', 'name', 'role'] },
      { model: ProductVariant, as: 'variant', attributes: ['id', 'size', 'color', 'sku'] },
      { model: Order, as: 'order', attributes: ['id', 'orderNumber'] },
    ],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: 100,
  });

  res.json({
    success: true,
    data: {
      product: { id: product.id, name: product.name, stock: product.stock },
      movements,
    },
  });
});

/* ------------------------------- Seller orders ------------------------------ */

/** Formats order data for seller operational view. */
function toSellerOrder(order) {
  const plain = order.toJSON();
  const items = plain.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

  return {
    ...plain,
    items,
    sellerItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    sellerSubtotal: Math.round(subtotal * 100) / 100,
    isSoleSeller: true,
    allowedNextStatuses: order.allowedNextStatuses ? order.allowedNextStatuses() : [],
    canUpdateStatus: order.allowedNextStatuses ? order.allowedNextStatuses().length > 0 : false,
  };
}

const SELLER_ORDER_INCLUDES = [
  { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
  { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code', 'icon'] },
  { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
];

// GET /api/seller/orders
exports.listOrders = asyncHandler(async (req, res) => {
  const { q, status, paymentStatus, source, from, to, page = 1, limit = 15 } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 15));

  const where = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (source) where.orderSource = source;

  const placedAt = resolveDateWindow({ from, to });
  if (placedAt) where.placedAt = placedAt;

  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    where[Op.or] = [
      { orderNumber: { [Op.like]: term } },
      { shippingFullName: { [Op.like]: term } },
      { shippingPhone: { [Op.like]: term } },
    ];
  }

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: SELLER_ORDER_INCLUDES,
    order: [['placedAt', 'DESC'], ['id', 'DESC']],
    limit: perPage,
    offset: (pageNum - 1) * perPage,
    distinct: true,
    col: 'id',
  });

  res.json({
    success: true,
    data: {
      orders: rows.map((order) => toSellerOrder(order)),
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    },
  });
});

// GET /api/seller/orders/:id
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
      {
        model: OrderStatusHistory,
        as: 'statusHistory',
        separate: true,
        order: [['createdAt', 'ASC']],
        include: [{ model: User, as: 'changedBy', attributes: ['id', 'name', 'role'] }],
      },
      { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code', 'icon'] },
      { model: Coupon, as: 'coupon', attributes: ['id', 'code'] },
      { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
    ],
  });
  if (!order) throw ApiError.notFound('Order not found');

  res.json({ success: true, data: { order: toSellerOrder(order) } });
});

// PATCH /api/seller/orders/:id/status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await sequelize.transaction(async (transaction) => {
    const found = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction,
    });
    if (!found) throw ApiError.notFound('Order not found');

    const items = found.items || [];

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
      await adjustStock(items, 1, transaction, {
        type: 'cancellation',
        reason: `Order ${found.orderNumber} cancelled by seller`,
        orderId: found.id,
        userId: req.user.id,
      });
      found.cancelledAt = new Date();
      found.cancelReason = note || 'Cancelled by seller';
      if (found.paymentStatus === 'paid') found.paymentStatus = 'refunded';
    }

    if (status === 'confirmed') found.confirmedAt = new Date();
    if (status === 'shipped') found.shippedAt = new Date();
    if (status === 'delivered') {
      found.deliveredAt = new Date();
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

  const full = await Order.findByPk(order.id, {
    include: [
      { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
      {
        model: OrderStatusHistory,
        as: 'statusHistory',
        separate: true,
        order: [['createdAt', 'ASC']],
        include: [{ model: User, as: 'changedBy', attributes: ['id', 'name', 'role'] }],
      },
      { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code', 'icon'] },
      { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
    ],
  });

  res.json({
    success: true,
    message: `Order marked as ${status}`,
    data: { order: toSellerOrder(full, req.user.id) },
  });
});

/* -------------------------- Seller-created direct order --------------------- */

// GET /api/seller/customers
exports.listCustomers = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  const where = { role: 'customer', isActive: true };
  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { email: { [Op.like]: term } },
      { phone: { [Op.like]: term } },
    ];
  }

  const customers = await User.findAll({
    where,
    attributes: ['id', 'name', 'email', 'phone'],
    include: [{ model: Address, as: 'addresses', separate: true, order: [['isDefault', 'DESC']] }],
    order: [['name', 'ASC']],
    limit: Math.min(50, Number(limit) || 20),
  });

  res.json({ success: true, data: { customers } });
});

// POST /api/seller/customers -> create a customer directly from seller portal
exports.createCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;

  const existing = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const customer = await User.create({
    name,
    email: String(email).toLowerCase(),
    phone: phone || null,
    password: 'Customer@123',
    role: 'customer',
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: `Customer ${customer.name} created successfully`,
    data: { customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } },
  });
});

// POST /api/seller/orders/quote -> price a draft before creating it
exports.quoteDraftOrder = asyncHandler(async (req, res) => {
  const { items, couponCode } = req.body;

  const selections = await loadSelections(items);
  const quote = await quoteSelections(selections, { couponCode: couponCode || null });

  res.json({ success: true, data: quote });
});

// POST /api/seller/orders
exports.createOrder = asyncHandler(async (req, res) => {
  const {
    customerId,
    addressId,
    items,
    paymentMethodId,
    paymentMethodCode,
    couponCode,
    note,
    shippingAddress,
  } = req.body;

  const order = await sequelize.transaction(async (transaction) => {
    let customer = null;
    if (customerId && customerId !== 'walk-in' && Number(customerId) > 0) {
      customer = await User.findOne({
        where: { id: Number(customerId), role: 'customer', isActive: true },
        transaction,
      });
      if (!customer) throw ApiError.badRequest('Please select a valid customer');
    } else {
      // Automatically use Walk-in Customer for direct / walk-in sales
      [customer] = await User.findOrCreate({
        where: { email: 'walkin@shop.com' },
        defaults: {
          name: 'Walk-in Customer',
          email: 'walkin@shop.com',
          phone: '0000000000',
          password: 'WalkInUser@123',
          role: 'customer',
          isActive: true,
        },
        transaction,
      });
    }

    // Shared business catalogue product selections
    const selections = await loadSelections(items, { transaction });
    const quote = await quoteSelections(selections, {
      couponCode: couponCode || null,
      strictCoupon: Boolean(couponCode),
      transaction,
    });

    if (quote.hasUnavailableItems) {
      const problem = quote.items.find((line) => !line.isAvailable);
      throw ApiError.badRequest(`${problem.product.name}: ${problem.issues.join(', ')}`);
    }

    // Delivery details: saved address, entered address, or default direct walk-in sale.
    let address = null;
    if (addressId && customer.id) {
      address = await Address.findOne({
        where: { id: addressId, userId: customer.id },
        transaction,
      });
    }

    const shipping = address
      ? {
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
        }
      : shippingAddress && shippingAddress.addressLine1
        ? {
            addressId: null,
            shippingFullName: shippingAddress.fullName || customer.name,
            shippingPhone: shippingAddress.phone || customer.phone || '0000000000',
            shippingAddressLine1: shippingAddress.addressLine1,
            shippingAddressLine2: shippingAddress.addressLine2 || null,
            shippingLandmark: shippingAddress.landmark || null,
            shippingCity: shippingAddress.city,
            shippingState: shippingAddress.state,
            shippingPostalCode: shippingAddress.postalCode,
            shippingCountry: shippingAddress.country || 'India',
          }
        : {
            addressId: null,
            shippingFullName: customer.name || 'Walk-in Customer',
            shippingPhone: customer.phone || '0000000000',
            shippingAddressLine1: 'Over the Counter / Direct Sale',
            shippingAddressLine2: null,
            shippingLandmark: null,
            shippingCity: 'Direct Sale',
            shippingState: 'Direct Sale',
            shippingPostalCode: '000000',
            shippingCountry: 'India',
          };

    const method = await PaymentMethod.findOne({
      where: {
        ...(paymentMethodId ? { id: paymentMethodId } : { code: paymentMethodCode }),
        isActive: true,
      },
      transaction,
    });
    if (!method) throw ApiError.badRequest('Please select an available payment method');

    // Same stock rules as customer checkout.
    await lockAndValidateStock(quote.items, transaction);

    const { summary } = quote;

    const created = await Order.create(
      {
        userId: customer.id,
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
        paymentStatus: method.resolvePaymentStatus(),
        status: 'pending',
        // This is what separates a direct order from a storefront checkout.
        orderSource: 'seller',
        createdById: req.user.id,
        customerNote: note || null,
        placedAt: new Date(),
        ...shipping,
      },
      { transaction }
    );

    await assignOrderNumber(created, transaction);

    const orderItems = await snapshotOrderItems(created.id, quote.items, transaction);

    await adjustStock(orderItems, -1, transaction, {
      type: 'order',
      reason: `Order ${created.orderNumber} created by seller`,
      orderId: created.id,
      userId: req.user.id,
    });

    if (quote.coupon) {
      await Coupon.increment('usedCount', { where: { id: quote.coupon.id }, transaction });
    }

    await recordStatus(created.id, 'pending', {
      note: `Order created by ${req.user.name}`,
      changedById: req.user.id,
      transaction,
    });

    return created;
  });

  const full = await Order.findByPk(order.id, {
    include: [
      { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
      { model: PaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'code', 'icon'] },
      { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
    ],
  });

  res.status(201).json({
    success: true,
    message: `Order ${full.orderNumber} created for ${full.customer.name}`,
    data: { order: toSellerOrder(full, req.user.id) },
  });
});
