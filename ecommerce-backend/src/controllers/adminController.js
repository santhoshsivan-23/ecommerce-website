const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  User,
  Product,
  ProductImage,
  ProductVariant,
  Category,
  Brand,
  Address,
  Order,
  OrderItem,
  StockMovement,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  LIVE_ORDER_WHERE,
  LOW_STOCK_THRESHOLD,
  dateWhere,
  describeRange,
} = require('../utils/reporting');
const { sellerPerformance, productPerformance } = require('./reportController');

const num = (value) => Number(value || 0);
const round2 = (value) => Math.round(value * 100) / 100;

function paging(query, fallback = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || fallback));
  return { page, limit, offset: (page - 1) * limit };
}

function pagination(count, { page, limit }) {
  return { total: count, page, limit, totalPages: Math.ceil(count / limit) };
}

/* -------------------------------- Dashboard --------------------------------- */

// GET /api/admin/stats
exports.getDashboard = asyncHandler(async (req, res) => {
  const orderWhere = dateWhere(req.query);
  const liveWhere = { ...orderWhere, ...LIVE_ORDER_WHERE };
  const userWindow = dateWhere(req.query, 'createdAt');

  const [
    userRows,
    newUserRows,
    productRow,
    statusRows,
    sourceRows,
    paymentRows,
    salesRow,
    unitsRow,
    lowStockProducts,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    User.findAll({
      attributes: [
        'role',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal('CASE WHEN isActive = 1 THEN 1 ELSE 0 END')), 'active'],
      ],
      group: ['role'],
      raw: true,
    }),

    User.findAll({
      attributes: ['role', [fn('COUNT', col('id')), 'total']],
      where: userWindow,
      group: ['role'],
      raw: true,
    }),

    Product.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal('CASE WHEN isActive = 1 THEN 1 ELSE 0 END')), 'active'],
        [fn('SUM', literal('CASE WHEN stock <= 0 THEN 1 ELSE 0 END')), 'outOfStock'],
        [
          fn(
            'SUM',
            literal(`CASE WHEN stock > 0 AND stock <= ${LOW_STOCK_THRESHOLD} THEN 1 ELSE 0 END`)
          ),
          'lowStock',
        ],
        [fn('COALESCE', fn('SUM', literal('stock * COALESCE(NULLIF(discountPrice, 0), price)')), 0), 'inventoryValue'],
      ],
      raw: true,
    }),

    Order.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('Order.id')), 'count'],
        [fn('COALESCE', fn('SUM', col('Order.total')), 0), 'value'],
      ],
      where: orderWhere,
      group: ['Order.status'],
      raw: true,
    }),

    Order.findAll({
      attributes: [
        'orderSource',
        [fn('COUNT', col('Order.id')), 'count'],
        [
          fn(
            'COALESCE',
            fn(
              'SUM',
              literal("CASE WHEN `Order`.`status` <> 'cancelled' THEN `Order`.`total` ELSE 0 END")
            ),
            0
          ),
          'value',
        ],
      ],
      where: orderWhere,
      group: ['Order.orderSource'],
      raw: true,
    }),

    Order.findAll({
      attributes: [
        'paymentMethodCode',
        'paymentMethodName',
        // Not aliased `count`: ordering by a bare `count` alias reads like the
        // function name and is needlessly ambiguous in the generated SQL.
        [fn('COUNT', col('Order.id')), 'orderCount'],
        [
          fn(
            'COALESCE',
            fn(
              'SUM',
              literal("CASE WHEN `Order`.`status` <> 'cancelled' THEN `Order`.`total` ELSE 0 END")
            ),
            0
          ),
          'value',
        ],
      ],
      where: orderWhere,
      group: ['Order.paymentMethodCode', 'Order.paymentMethodName'],
      order: [[literal('orderCount'), 'DESC']],
      raw: true,
    }),

    Order.findOne({
      attributes: [
        [fn('COUNT', col('Order.id')), 'orderCount'],
        [fn('COALESCE', fn('SUM', col('Order.total')), 0), 'sales'],
        [
          fn(
            'COALESCE',
            fn(
              'SUM',
              literal("CASE WHEN `Order`.`paymentStatus` = 'paid' THEN `Order`.`total` ELSE 0 END")
            ),
            0
          ),
          'revenue',
        ],
      ],
      where: liveWhere,
      raw: true,
    }),

    OrderItem.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('OrderItem.quantity')), 0), 'units']],
      include: [{ model: Order, as: 'order', attributes: [], where: liveWhere, required: true }],
      raw: true,
    }),

    Product.findAll({
      where: { stock: { [Op.lte]: LOW_STOCK_THRESHOLD } },
      attributes: ['id', 'name', 'slug', 'stock', 'isActive'],
      include: [{ model: User, as: 'seller', attributes: ['id', 'name'] }],
      order: [['stock', 'ASC'], ['name', 'ASC']],
      limit: 8,
    }),

    Order.findAll({
      where: orderWhere,
      attributes: [
        'id',
        'orderNumber',
        'total',
        'status',
        'paymentStatus',
        'orderSource',
        'placedAt',
        'shippingFullName',
      ],
      include: [{ model: User, as: 'customer', attributes: ['id', 'name'] }],
      order: [['placedAt', 'DESC'], ['id', 'DESC']],
      limit: 6,
    }),

    productPerformance(req.query, { limit: 5, direction: 'DESC' }),
  ]);

  const byRole = (rows, key = 'total') =>
    rows.reduce((acc, row) => ({ ...acc, [row.role]: num(row[key]) }), {});

  const totals = byRole(userRows);
  const activeByRole = byRole(userRows, 'active');
  const joined = byRole(newUserRows);

  const byStatus = statusRows.reduce(
    (acc, row) => ({ ...acc, [row.status]: num(row.count) }),
    {}
  );
  const orderCount = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const sales = round2(num(salesRow?.sales));
  const liveOrders = num(salesRow?.orderCount);

  res.json({
    success: true,
    data: {
      range: describeRange(req.query),
      customers: {
        total: num(totals.customer),
        active: num(activeByRole.customer),
        inactive: num(totals.customer) - num(activeByRole.customer),
        joinedInRange: num(joined.customer),
      },
      sellers: {
        total: num(totals.seller),
        active: num(activeByRole.seller),
        inactive: num(totals.seller) - num(activeByRole.seller),
        joinedInRange: num(joined.seller),
      },
      admins: { total: num(totals.admin) },
      products: {
        total: num(productRow?.total),
        active: num(productRow?.active),
        disabled: num(productRow?.total) - num(productRow?.active),
        outOfStock: num(productRow?.outOfStock),
        lowStock: num(productRow?.lowStock),
        inventoryValue: round2(num(productRow?.inventoryValue)),
      },
      orders: {
        total: orderCount,
        pending: (byStatus.pending || 0) + (byStatus.confirmed || 0) + (byStatus.processing || 0),
        shipped: byStatus.shipped || 0,
        completed: byStatus.delivered || 0,
        cancelled: byStatus.cancelled || 0,
        byStatus,
      },
      sales: {
        // Business written, i.e. every order that has not been cancelled.
        totalSales: sales,
        // Money actually settled.
        revenue: round2(num(salesRow?.revenue)),
        unitsSold: num(unitsRow?.units),
        averageOrderValue: liveOrders ? round2(sales / liveOrders) : 0,
      },
      bySource: sourceRows.reduce(
        (acc, row) => ({
          ...acc,
          [row.orderSource]: { count: num(row.count), value: round2(num(row.value)) },
        }),
        {}
      ),
      byPaymentMethod: paymentRows.map((row) => ({
        code: row.paymentMethodCode,
        name: row.paymentMethodName,
        count: num(row.orderCount),
        value: round2(num(row.value)),
      })),
      lowStockProducts,
      recentOrders,
      topProducts,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
  });
});

/* --------------------------- Customer management ---------------------------- */

/** Order history figures, computed per customer without an N+1 of queries. */
const CUSTOMER_AGGREGATES = [
  [literal('(SELECT COUNT(*) FROM orders o WHERE o.userId = `User`.`id`)'), 'orderCount'],
  [
    literal(
      "(SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.userId = `User`.`id` AND o.status <> 'cancelled')"
    ),
    'totalSpent',
  ],
  [
    literal(
      "(SELECT COUNT(*) FROM orders o WHERE o.userId = `User`.`id` AND o.status = 'cancelled')"
    ),
    'cancelledOrders',
  ],
  [literal('(SELECT MAX(o.placedAt) FROM orders o WHERE o.userId = `User`.`id`)'), 'lastOrderAt'],
];

const CUSTOMER_SORTS = {
  newest: [['createdAt', 'DESC']],
  name: [['name', 'ASC']],
  orders_desc: [[literal('orderCount'), 'DESC']],
  spend_desc: [[literal('totalSpent'), 'DESC']],
};

// GET /api/admin/customers
exports.listCustomers = asyncHandler(async (req, res) => {
  const { q, status, sort = 'newest' } = req.query;
  const page = paging(req.query);

  const where = { role: 'customer' };
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { email: { [Op.like]: term } },
      { phone: { [Op.like]: term } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: [
      'id',
      'name',
      'email',
      'phone',
      'isActive',
      'createdAt',
      ...CUSTOMER_AGGREGATES,
    ],
    order: CUSTOMER_SORTS[sort] || CUSTOMER_SORTS.newest,
    limit: page.limit,
    offset: page.offset,
  });

  res.json({
    success: true,
    data: {
      customers: rows.map((row) => {
        const plain = row.toJSON();
        return {
          ...plain,
          orderCount: num(plain.orderCount),
          cancelledOrders: num(plain.cancelledOrders),
          totalSpent: round2(num(plain.totalSpent)),
        };
      }),
      pagination: pagination(count, page),
    },
  });
});

/** Loads a user of the given role or fails with a clear message. */
async function findUserOfRole(id, role, attributes) {
  const user = await User.findOne({ where: { id, role }, ...(attributes ? { attributes } : {}) });
  if (!user) throw ApiError.notFound(`${role === 'seller' ? 'Seller' : 'Customer'} not found`);
  return user;
}

// GET /api/admin/customers/:id
exports.getCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({
    where: { id: req.params.id, role: 'customer' },
    attributes: ['id', 'name', 'email', 'phone', 'avatar', 'isActive', 'createdAt', ...CUSTOMER_AGGREGATES],
    include: [
      { model: Address, as: 'addresses', separate: true, order: [['isDefault', 'DESC'], ['id', 'ASC']] },
    ],
  });
  if (!customer) throw ApiError.notFound('Customer not found');

  const [statusRows, purchased] = await Promise.all([
    Order.findAll({
      attributes: ['status', [fn('COUNT', col('Order.id')), 'count']],
      where: { userId: customer.id },
      group: ['Order.status'],
      raw: true,
    }),

    // What they actually buy, which is the useful half of a purchase history.
    OrderItem.findAll({
      attributes: [
        'productId',
        'productName',
        [fn('SUM', col('OrderItem.quantity')), 'quantity'],
        [fn('SUM', col('OrderItem.lineTotal')), 'spent'],
        [fn('MAX', col('order.placedAt')), 'lastBoughtAt'],
      ],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [],
          where: { userId: customer.id, ...LIVE_ORDER_WHERE },
          required: true,
        },
      ],
      group: ['OrderItem.productId', 'OrderItem.productName'],
      order: [[literal('quantity'), 'DESC']],
      limit: 10,
      raw: true,
    }),
  ]);

  const plain = customer.toJSON();

  res.json({
    success: true,
    data: {
      customer: {
        ...plain,
        orderCount: num(plain.orderCount),
        cancelledOrders: num(plain.cancelledOrders),
        totalSpent: round2(num(plain.totalSpent)),
      },
      ordersByStatus: statusRows.reduce(
        (acc, row) => ({ ...acc, [row.status]: num(row.count) }),
        {}
      ),
      purchaseHistory: purchased.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        quantity: num(row.quantity),
        spent: round2(num(row.spent)),
        lastBoughtAt: row.lastBoughtAt,
      })),
    },
  });
});

// GET /api/admin/customers/:id/orders
exports.getCustomerOrders = asyncHandler(async (req, res) => {
  const customer = await findUserOfRole(req.params.id, 'customer', ['id']);
  const page = paging(req.query, 10);

  const where = { userId: customer.id };
  if (req.query.status) where.status = req.query.status;

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [{ model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] }],
    order: [['placedAt', 'DESC'], ['id', 'DESC']],
    limit: page.limit,
    offset: page.offset,
    distinct: true,
  });

  res.json({ success: true, data: { orders: rows, pagination: pagination(count, page) } });
});

// PATCH /api/admin/customers/:id/status
exports.setCustomerStatus = asyncHandler(async (req, res) => {
  const customer = await findUserOfRole(req.params.id, 'customer');

  customer.isActive = req.body.isActive === undefined ? !customer.isActive : Boolean(req.body.isActive);
  await customer.save();

  res.json({
    success: true,
    message: customer.isActive
      ? `${customer.name} can sign in again`
      : `${customer.name} has been deactivated and can no longer sign in`,
    data: { customer: { id: customer.id, isActive: customer.isActive } },
  });
});

/* ---------------------------- Seller management ----------------------------- */

// GET /api/admin/sellers
exports.listSellers = asyncHandler(async (req, res) => {
  const page = paging(req.query);

  const where = { role: 'seller' };
  if (req.query.status === 'active') where.isActive = true;
  if (req.query.status === 'inactive') where.isActive = false;
  if (req.query.q && String(req.query.q).trim()) {
    const term = `%${String(req.query.q).trim()}%`;
    where[Op.or] = [{ name: { [Op.like]: term } }, { email: { [Op.like]: term } }];
  }

  // Aggregates are the same ones the seller report uses, so both screens agree.
  const [sellers, count] = await Promise.all([
    sellerPerformance(
      { ...req.query, status: req.query.status },
      { limit: page.limit + page.offset }
    ),
    User.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      sellers: sellers.slice(page.offset, page.offset + page.limit),
      pagination: pagination(count, page),
      range: describeRange(req.query),
    },
  });
});

// POST /api/admin/sellers
exports.createSeller = asyncHandler(async (req, res) => {
  const { name, email, password, phone, isActive } = req.body;

  const existing = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const seller = await User.create({
    name,
    email,
    password,
    phone: phone || null,
    role: 'seller',
    isActive: isActive === undefined ? true : Boolean(isActive),
  });

  res.status(201).json({
    success: true,
    message: `${seller.name} can now sign in to the seller panel`,
    data: { seller: { id: seller.id, name: seller.name, email: seller.email, phone: seller.phone, isActive: seller.isActive, createdAt: seller.createdAt } },
  });
});

// PATCH /api/admin/sellers/:id
exports.updateSeller = asyncHandler(async (req, res) => {
  const seller = await findUserOfRole(req.params.id, 'seller');
  const { name, email, phone, password, isActive } = req.body;

  if (email && String(email).toLowerCase() !== seller.email) {
    const clash = await User.findOne({ where: { email: String(email).toLowerCase() } });
    if (clash) throw ApiError.conflict('Another account already uses this email');
    seller.email = email;
  }

  if (name !== undefined) seller.name = name;
  if (phone !== undefined) seller.phone = phone || null;
  if (isActive !== undefined) seller.isActive = Boolean(isActive);
  // Set only when a new one was typed, so saving the form does not wipe the login.
  if (password) seller.password = password;

  await seller.save();

  res.json({
    success: true,
    message: 'Seller updated',
    data: {
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        isActive: seller.isActive,
      },
    },
  });
});

// PATCH /api/admin/sellers/:id/status
exports.setSellerStatus = asyncHandler(async (req, res) => {
  const seller = await findUserOfRole(req.params.id, 'seller');

  seller.isActive = req.body.isActive === undefined ? !seller.isActive : Boolean(req.body.isActive);
  await seller.save();

  res.json({
    success: true,
    message: seller.isActive
      ? `${seller.name} can sign in again`
      : `${seller.name} has been deactivated. Their products stay listed until you disable them.`,
    data: { seller: { id: seller.id, isActive: seller.isActive } },
  });
});

// GET /api/admin/sellers/:id
exports.getSeller = asyncHandler(async (req, res) => {
  await findUserOfRole(req.params.id, 'seller', ['id']);

  const [performance] = await sellerPerformance(
    { range: req.query.range, from: req.query.from, to: req.query.to, sellerId: req.params.id },
    { limit: 1 }
  );

  const [topProducts, recentOrders, categoryRows] = await Promise.all([
    productPerformance({ ...req.query, sellerId: req.params.id }, { limit: 5, direction: 'DESC' }),

    Order.findAll({
      attributes: ['id', 'orderNumber', 'total', 'status', 'paymentStatus', 'orderSource', 'placedAt'],
      include: [
        {
          model: OrderItem,
          as: 'sellerLines',
          attributes: [],
          where: { sellerId: req.params.id },
          required: true,
        },
        { model: User, as: 'customer', attributes: ['id', 'name'] },
      ],
      order: [['placedAt', 'DESC'], ['id', 'DESC']],
      limit: 6,
    }),

    Product.findAll({
      attributes: [[fn('COUNT', col('Product.id')), 'productCount']],
      where: { sellerId: req.params.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      group: ['category.id', 'category.name'],
      order: [[literal('productCount'), 'DESC']],
      raw: true,
      nest: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      seller: performance,
      range: describeRange(req.query),
      topProducts,
      recentOrders,
      byCategory: categoryRows
        .filter((row) => row.category && row.category.id)
        .map((row) => ({ category: row.category, count: num(row.productCount) })),
    },
  });
});

// GET /api/admin/sellers/:id/products
exports.getSellerProducts = asyncHandler(async (req, res) => {
  await findUserOfRole(req.params.id, 'seller', ['id']);
  const page = paging(req.query, 10);

  const where = { sellerId: req.params.id };
  if (req.query.q && String(req.query.q).trim()) {
    where.name = { [Op.like]: `%${String(req.query.q).trim()}%` };
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    attributes: ['id', 'name', 'slug', 'price', 'discountPrice', 'stock', 'isActive', 'soldCount'],
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: Brand, as: 'brand', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: page.limit,
    offset: page.offset,
    distinct: true,
  });

  res.json({ success: true, data: { products: rows, pagination: pagination(count, page) } });
});

// GET /api/admin/sellers/:id/orders
exports.getSellerOrders = asyncHandler(async (req, res) => {
  await findUserOfRole(req.params.id, 'seller', ['id']);
  const page = paging(req.query, 10);

  const where = { ...dateWhere(req.query) };
  if (req.query.status) where.status = req.query.status;

  const { rows, count } = await Order.findAndCountAll({
    where,
    attributes: [
      'id',
      'orderNumber',
      'total',
      'status',
      'paymentStatus',
      'paymentMethodName',
      'orderSource',
      'placedAt',
      'shippingFullName',
    ],
    include: [
      {
        model: OrderItem,
        as: 'sellerLines',
        attributes: [],
        where: { sellerId: req.params.id },
        required: true,
      },
      { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
    ],
    order: [['placedAt', 'DESC'], ['id', 'DESC']],
    limit: page.limit,
    offset: page.offset,
    distinct: true,
    col: 'id',
  });

  // The seller's own share of each order, so the totals match their panel.
  const sellerTotals = await OrderItem.findAll({
    attributes: [
      'orderId',
      [fn('SUM', col('lineTotal')), 'sellerSubtotal'],
      [fn('SUM', col('quantity')), 'sellerItemCount'],
    ],
    where: { sellerId: req.params.id, orderId: { [Op.in]: rows.map((row) => row.id) } },
    group: ['orderId'],
    raw: true,
  });
  const totalsByOrder = sellerTotals.reduce(
    (acc, row) => ({
      ...acc,
      [row.orderId]: {
        sellerSubtotal: round2(num(row.sellerSubtotal)),
        sellerItemCount: num(row.sellerItemCount),
      },
    }),
    {}
  );

  res.json({
    success: true,
    data: {
      orders: rows.map((row) => ({
        ...row.toJSON(),
        ...(totalsByOrder[row.id] || { sellerSubtotal: 0, sellerItemCount: 0 }),
      })),
      pagination: pagination(count, page),
    },
  });
});

/* --------------------------- Inventory overview ----------------------------- */

// GET /api/admin/inventory
exports.listInventory = asyncHandler(async (req, res) => {
  const { q, sellerId, categoryId, stockLevel } = req.query;
  const page = paging(req.query);

  const where = {};
  if (q && String(q).trim()) where.name = { [Op.like]: `%${String(q).trim()}%` };
  if (sellerId === 'none') where.sellerId = null;
  else if (sellerId) where.sellerId = Number(sellerId);
  if (categoryId) where.categoryId = Number(categoryId);
  if (stockLevel === 'out') where.stock = { [Op.lte]: 0 };
  if (stockLevel === 'low') where.stock = { [Op.gt]: 0, [Op.lte]: LOW_STOCK_THRESHOLD };
  if (stockLevel === 'in') where.stock = { [Op.gt]: LOW_STOCK_THRESHOLD };

  const [{ rows, count }, summary] = await Promise.all([
    Product.findAndCountAll({
      where,
      attributes: [
        'id',
        'name',
        'slug',
        'stock',
        'isActive',
        'price',
        'discountPrice',
        'soldCount',
        [
          literal(
            '(SELECT MAX(sm.createdAt) FROM stock_movements sm WHERE sm.productId = `Product`.`id`)'
          ),
          'lastMovementAt',
        ],
      ],
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Brand, as: 'brand', attributes: ['id', 'name'] },
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
      limit: page.limit,
      offset: page.offset,
      distinct: true,
      subQuery: false,
    }),

    Product.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'products'],
        [fn('SUM', literal('CASE WHEN stock <= 0 THEN 1 ELSE 0 END')), 'outOfStock'],
        [
          fn(
            'SUM',
            literal(`CASE WHEN stock > 0 AND stock <= ${LOW_STOCK_THRESHOLD} THEN 1 ELSE 0 END`)
          ),
          'lowStock',
        ],
        [fn('COALESCE', fn('SUM', col('stock')), 0), 'units'],
        [
          fn('COALESCE', fn('SUM', literal('stock * COALESCE(NULLIF(discountPrice, 0), price)')), 0),
          'inventoryValue',
        ],
      ],
      raw: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      products: rows,
      summary: {
        products: num(summary?.products),
        outOfStock: num(summary?.outOfStock),
        lowStock: num(summary?.lowStock),
        units: num(summary?.units),
        inventoryValue: round2(num(summary?.inventoryValue)),
      },
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      pagination: pagination(count, page),
    },
  });
});

// GET /api/admin/inventory/:productId/history
exports.getStockHistory = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.productId, {
    attributes: ['id', 'name', 'stock'],
    include: [{ model: User, as: 'seller', attributes: ['id', 'name'] }],
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

  res.json({ success: true, data: { product, movements } });
});

/**
 * PATCH /api/admin/inventory/:productId
 * The admin equivalent of the seller's stock adjustment: same ledger, no
 * ownership restriction, and the movement records who actually made the change.
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
    const next = adjustment !== undefined ? current + Number(adjustment) : Number(stock);

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
        sellerId: product.sellerId,
        type: 'adjustment',
        quantityChange: change,
        resultingStock: next,
        reason: reason || `Adjusted by admin ${req.user.name}`,
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

/* ------------------------- Attributes and variants -------------------------- */

/**
 * GET /api/admin/attributes
 * The size and colour values in use across the catalogue. Variants are created
 * per product, so this is the one place the admin can see the vocabulary the
 * whole shop has settled on, and which values barely get used.
 */
exports.getAttributes = asyncHandler(async (req, res) => {
  const attributeRows = (field) =>
    ProductVariant.findAll({
      attributes: [
        [col(field), 'value'],
        [fn('COUNT', col('ProductVariant.id')), 'variantCount'],
        [fn('COUNT', fn('DISTINCT', col('ProductVariant.productId'))), 'productCount'],
        [fn('COALESCE', fn('SUM', col('ProductVariant.stock')), 0), 'stock'],
      ],
      where: { [field]: { [Op.ne]: null } },
      group: [col(field)],
      order: [[literal('productCount'), 'DESC']],
      raw: true,
    });

  const [sizes, colors, counts] = await Promise.all([
    attributeRows('size'),
    attributeRows('color'),
    Product.findOne({
      attributes: [
        [fn('COUNT', col('Product.id')), 'products'],
        [
          literal(
            '(SELECT COUNT(DISTINCT v.productId) FROM product_variants v)'
          ),
          'withVariants',
        ],
        [literal('(SELECT COUNT(*) FROM product_variants)'), 'variants'],
      ],
      raw: true,
    }),
  ]);

  const shape = (rows) =>
    rows
      .filter((row) => row.value)
      .map((row) => ({
        value: row.value,
        variantCount: num(row.variantCount),
        productCount: num(row.productCount),
        stock: num(row.stock),
      }));

  res.json({
    success: true,
    data: {
      sizes: shape(sizes),
      colors: shape(colors),
      summary: {
        products: num(counts?.products),
        withVariants: num(counts?.withVariants),
        withoutVariants: num(counts?.products) - num(counts?.withVariants),
        variants: num(counts?.variants),
      },
    },
  });
});
