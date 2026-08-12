const { Op, fn, col, literal } = require('sequelize');
const { Product, Order, OrderItem, User, Category, Brand } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const {
  LIVE_ORDER_WHERE,
  dateWhere,
  describeRange,
  fillGaps,
  normaliseGroupBy,
  periodSql,
  resolveDateWindow,
  sqlDateWindow,
} = require('../utils/reporting');

/**
 * Two different numbers get called "sales" in a shop, so the whole admin panel
 * settles on one meaning and sticks to it:
 *
 *   sales   -> value of every live (non-cancelled) order, i.e. business written
 *   revenue -> value of the orders whose payment has actually been settled
 *
 * Cash orders therefore count toward sales the moment they are placed, and toward
 * revenue only once they are delivered and marked paid.
 */
const PAID_SALES = "CASE WHEN `Order`.`paymentStatus` = 'paid' THEN `Order`.`total` ELSE 0 END";
const PAID_LINES =
  "CASE WHEN `order`.`paymentStatus` = 'paid' THEN `OrderItem`.`lineTotal` ELSE 0 END";

const num = (value) => Number(value || 0);
const round2 = (value) => Math.round(value * 100) / 100;

/** Filters shared by every report: date window, seller and order source. */
function reportFilters(query) {
  const where = { ...dateWhere(query) };
  if (query.source) where.orderSource = query.source;
  return where;
}

/* ------------------------------- Sales series ------------------------------- */

/**
 * Orders and money bucketed by day / week / month / year.
 * With a sellerId the figures come from that seller's own order lines, so a
 * shared order is never credited twice.
 */
async function salesSeries(query) {
  const groupBy = normaliseGroupBy(query.groupBy);
  const sellerId = query.sellerId ? Number(query.sellerId) : null;
  const orderWhere = { ...reportFilters(query), ...LIVE_ORDER_WHERE };

  if (sellerId) {
    const expr = periodSql(groupBy, '`order`.`placedAt`');

    const rows = await OrderItem.findAll({
      attributes: [
        [literal(expr), 'period'],
        [fn('COUNT', literal('DISTINCT `OrderItem`.`orderId`')), 'orders'],
        [fn('COALESCE', fn('SUM', col('OrderItem.quantity')), 0), 'units'],
        [fn('COALESCE', fn('SUM', col('OrderItem.lineTotal')), 0), 'sales'],
        [fn('COALESCE', fn('SUM', literal(PAID_LINES)), 0), 'revenue'],
      ],
      where: { sellerId },
      include: [{ model: Order, as: 'order', attributes: [], where: orderWhere, required: true }],
      group: [literal(expr)],
      order: [[literal(expr), 'ASC']],
      raw: true,
    });

    return {
      groupBy,
      rows: rows.map((row) => ({
        period: row.period,
        orders: num(row.orders),
        units: num(row.units),
        sales: round2(num(row.sales)),
        revenue: round2(num(row.revenue)),
        discount: 0,
      })),
    };
  }

  const orderExpr = periodSql(groupBy, '`Order`.`placedAt`');
  const itemExpr = periodSql(groupBy, '`order`.`placedAt`');

  const [orderRows, unitRows] = await Promise.all([
    Order.findAll({
      attributes: [
        [literal(orderExpr), 'period'],
        [fn('COUNT', col('Order.id')), 'orders'],
        [fn('COALESCE', fn('SUM', col('Order.total')), 0), 'sales'],
        [fn('COALESCE', fn('SUM', col('Order.discount')), 0), 'discount'],
        [fn('COALESCE', fn('SUM', literal(PAID_SALES)), 0), 'revenue'],
      ],
      where: orderWhere,
      group: [literal(orderExpr)],
      order: [[literal(orderExpr), 'ASC']],
      raw: true,
    }),

    // Units live on the lines, so they need their own pass over order_items.
    OrderItem.findAll({
      attributes: [
        [literal(itemExpr), 'period'],
        [fn('COALESCE', fn('SUM', col('OrderItem.quantity')), 0), 'units'],
      ],
      include: [{ model: Order, as: 'order', attributes: [], where: orderWhere, required: true }],
      group: [literal(itemExpr)],
      raw: true,
    }),
  ]);

  const unitsByPeriod = unitRows.reduce(
    (acc, row) => ({ ...acc, [row.period]: num(row.units) }),
    {}
  );

  return {
    groupBy,
    rows: orderRows.map((row) => ({
      period: row.period,
      orders: num(row.orders),
      units: unitsByPeriod[row.period] || 0,
      sales: round2(num(row.sales)),
      revenue: round2(num(row.revenue)),
      discount: round2(num(row.discount)),
    })),
  };
}

function totalsFor(rows) {
  return rows.reduce(
    (acc, row) => ({
      orders: acc.orders + row.orders,
      units: acc.units + row.units,
      sales: round2(acc.sales + row.sales),
      revenue: round2(acc.revenue + row.revenue),
      discount: round2(acc.discount + row.discount),
    }),
    { orders: 0, units: 0, sales: 0, revenue: 0, discount: 0 }
  );
}

// GET /api/admin/reports/sales
exports.getSalesReport = asyncHandler(async (req, res) => {
  const { groupBy, rows } = await salesSeries(req.query);
  const totals = totalsFor(rows);

  res.json({
    success: true,
    data: {
      groupBy,
      range: describeRange(req.query),
      rows: fillGaps(rows, groupBy, {
        orders: 0,
        units: 0,
        sales: 0,
        revenue: 0,
        discount: 0,
      }),
      totals: {
        ...totals,
        averageOrderValue: totals.orders ? round2(totals.sales / totals.orders) : 0,
      },
    },
  });
});

/* ------------------------------ Product report ------------------------------ */

/**
 * Sales per product, built from the product side so items that sold nothing in
 * the window still appear — which is the whole point of a low-sellers list.
 */
async function productPerformance(query, { limit = 20, direction = 'DESC' } = {}) {
  const window = sqlDateWindow(query, 'o.placedAt');
  const sourceClause = query.source
    ? ` AND o.orderSource = ${query.source === 'seller' ? "'seller'" : "'customer'"}`
    : '';
  const scope = `JOIN orders o ON o.id = oi.orderId WHERE oi.productId = \`Product\`.\`id\` AND o.status <> 'cancelled'${window}${sourceClause}`;

  const where = {};
  if (query.sellerId) where.sellerId = Number(query.sellerId);
  if (query.categoryId) where.categoryId = Number(query.categoryId);
  if (query.q && String(query.q).trim()) {
    where.name = { [Op.like]: `%${String(query.q).trim()}%` };
  }

  const rows = await Product.findAll({
    where,
    attributes: [
      'id',
      'name',
      'slug',
      'stock',
      'price',
      'discountPrice',
      'isActive',
      [literal(`(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi ${scope})`), 'unitsSold'],
      [literal(`(SELECT COALESCE(SUM(oi.lineTotal), 0) FROM order_items oi ${scope})`), 'revenue'],
      [literal(`(SELECT COUNT(DISTINCT oi.orderId) FROM order_items oi ${scope})`), 'orderCount'],
    ],
    include: [
      { model: User, as: 'seller', attributes: ['id', 'name'] },
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: Brand, as: 'brand', attributes: ['id', 'name'] },
    ],
    order: [
      [literal('unitsSold'), direction],
      [literal('revenue'), direction],
      ['name', 'ASC'],
    ],
    limit,
    subQuery: false,
  });

  return rows.map((row) => {
    const plain = row.toJSON();
    return {
      ...plain,
      unitsSold: num(plain.unitsSold),
      revenue: round2(num(plain.revenue)),
      orderCount: num(plain.orderCount),
    };
  });
}

// GET /api/admin/reports/products
exports.getProductReport = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 15));

  const [best, low] = await Promise.all([
    productPerformance(req.query, { limit, direction: 'DESC' }),
    productPerformance(req.query, { limit, direction: 'ASC' }),
  ]);

  res.json({
    success: true,
    data: {
      range: describeRange(req.query),
      bestSelling: best,
      lowSelling: low,
      totals: {
        unitsSold: best.reduce((sum, row) => sum + row.unitsSold, 0),
        revenue: round2(best.reduce((sum, row) => sum + row.revenue, 0)),
      },
    },
  });
});

/* ------------------------------- Seller report ------------------------------ */

/** How a seller list can be ordered; every option falls back to the name. */
const SELLER_SORTS = {
  sales: [[literal('sales'), 'DESC']],
  revenue: [[literal('revenue'), 'DESC']],
  orders: [[literal('orderCount'), 'DESC']],
  products: [[literal('productCount'), 'DESC']],
  newest: [['createdAt', 'DESC']],
  name: [['name', 'ASC']],
};

/** Per-seller performance, credited from that seller's own order lines. */
async function sellerPerformance(query, { limit = 100 } = {}) {
  const window = sqlDateWindow(query, 'o.placedAt');
  const join = `FROM order_items oi JOIN orders o ON o.id = oi.orderId WHERE oi.sellerId = \`User\`.\`id\`${window}`;
  const live = `${join} AND o.status <> 'cancelled'`;

  const where = { role: 'seller' };
  if (query.sellerId) where.id = Number(query.sellerId);
  if (query.q && String(query.q).trim()) {
    const term = `%${String(query.q).trim()}%`;
    where[Op.or] = [{ name: { [Op.like]: term } }, { email: { [Op.like]: term } }];
  }
  if (query.status === 'active') where.isActive = true;
  if (query.status === 'inactive') where.isActive = false;

  const rows = await User.findAll({
    where,
    attributes: [
      'id',
      'name',
      'email',
      'phone',
      'isActive',
      'createdAt',
      [literal('(SELECT COUNT(*) FROM products p WHERE p.sellerId = `User`.`id`)'), 'productCount'],
      [
        literal(
          '(SELECT COUNT(*) FROM products p WHERE p.sellerId = `User`.`id` AND p.isActive = 1)'
        ),
        'activeProducts',
      ],
      [literal(`(SELECT COUNT(DISTINCT oi.orderId) ${join})`), 'orderCount'],
      [
        literal(
          `(SELECT COUNT(DISTINCT oi.orderId) ${join} AND o.status IN ('pending','confirmed','processing'))`
        ),
        'pendingOrders',
      ],
      [
        literal(`(SELECT COUNT(DISTINCT oi.orderId) ${join} AND o.status = 'delivered')`),
        'completedOrders',
      ],
      [
        literal(`(SELECT COUNT(DISTINCT oi.orderId) ${join} AND o.status = 'cancelled')`),
        'cancelledOrders',
      ],
      [literal(`(SELECT COALESCE(SUM(oi.quantity), 0) ${live})`), 'unitsSold'],
      [literal(`(SELECT COALESCE(SUM(oi.lineTotal), 0) ${live})`), 'sales'],
      [
        literal(`(SELECT COALESCE(SUM(oi.lineTotal), 0) ${live} AND o.paymentStatus = 'paid')`),
        'revenue',
      ],
    ],
    order: [...(SELLER_SORTS[query.sort] || SELLER_SORTS.sales), ['name', 'ASC']],
    limit,
  });

  return rows.map((row) => {
    const plain = row.toJSON();
    return {
      ...plain,
      productCount: num(plain.productCount),
      activeProducts: num(plain.activeProducts),
      orderCount: num(plain.orderCount),
      pendingOrders: num(plain.pendingOrders),
      completedOrders: num(plain.completedOrders),
      cancelledOrders: num(plain.cancelledOrders),
      unitsSold: num(plain.unitsSold),
      sales: round2(num(plain.sales)),
      revenue: round2(num(plain.revenue)),
    };
  });
}

// GET /api/admin/reports/sellers
exports.getSellerReport = asyncHandler(async (req, res) => {
  const sellers = await sellerPerformance(req.query);

  res.json({
    success: true,
    data: {
      range: describeRange(req.query),
      sellers,
      totals: {
        sellers: sellers.length,
        orders: sellers.reduce((sum, row) => sum + row.orderCount, 0),
        unitsSold: sellers.reduce((sum, row) => sum + row.unitsSold, 0),
        sales: round2(sellers.reduce((sum, row) => sum + row.sales, 0)),
        revenue: round2(sellers.reduce((sum, row) => sum + row.revenue, 0)),
      },
    },
  });
});

/* ------------------------------ Payment report ------------------------------ */

/** Orders and money grouped by the payment method they were placed with. */
async function paymentBreakdown(query) {
  const where = reportFilters(query);

  const [rows, statusRows] = await Promise.all([
    Order.findAll({
      attributes: [
        'paymentMethodCode',
        'paymentMethodName',
        [fn('COUNT', col('Order.id')), 'orderCount'],
        [
          fn(
            'COALESCE',
            fn('SUM', literal("CASE WHEN `Order`.`status` <> 'cancelled' THEN `Order`.`total` ELSE 0 END")),
            0
          ),
          'sales',
        ],
        [fn('COALESCE', fn('SUM', literal(PAID_SALES)), 0), 'revenue'],
        [
          fn('SUM', literal("CASE WHEN `Order`.`paymentStatus` = 'paid' THEN 1 ELSE 0 END")),
          'paidCount',
        ],
        [
          fn('SUM', literal("CASE WHEN `Order`.`paymentStatus` = 'pending' THEN 1 ELSE 0 END")),
          'pendingCount',
        ],
        [
          fn('SUM', literal("CASE WHEN `Order`.`paymentStatus` = 'refunded' THEN 1 ELSE 0 END")),
          'refundedCount',
        ],
        [
          fn('SUM', literal("CASE WHEN `Order`.`paymentStatus` = 'failed' THEN 1 ELSE 0 END")),
          'failedCount',
        ],
      ],
      where,
      group: ['Order.paymentMethodCode', 'Order.paymentMethodName'],
      order: [[literal('orderCount'), 'DESC']],
      raw: true,
    }),

    Order.findAll({
      attributes: ['paymentStatus', [fn('COUNT', col('Order.id')), 'count']],
      where,
      group: ['Order.paymentStatus'],
      raw: true,
    }),
  ]);

  return {
    methods: rows.map((row) => ({
      code: row.paymentMethodCode,
      name: row.paymentMethodName,
      orderCount: num(row.orderCount),
      sales: round2(num(row.sales)),
      revenue: round2(num(row.revenue)),
      paidCount: num(row.paidCount),
      pendingCount: num(row.pendingCount),
      refundedCount: num(row.refundedCount),
      failedCount: num(row.failedCount),
    })),
    byStatus: statusRows.reduce(
      (acc, row) => ({ ...acc, [row.paymentStatus]: num(row.count) }),
      {}
    ),
  };
}

// GET /api/admin/reports/payments
exports.getPaymentReport = asyncHandler(async (req, res) => {
  const breakdown = await paymentBreakdown(req.query);
  const orderTotal = breakdown.methods.reduce((sum, row) => sum + row.orderCount, 0);

  res.json({
    success: true,
    data: {
      range: describeRange(req.query),
      ...breakdown,
      totals: {
        orders: orderTotal,
        sales: round2(breakdown.methods.reduce((sum, row) => sum + row.sales, 0)),
        revenue: round2(breakdown.methods.reduce((sum, row) => sum + row.revenue, 0)),
      },
    },
  });
});

/* ---------------------------- Order source report --------------------------- */

/** Storefront checkouts against orders a seller raised directly. */
async function sourceBreakdown(query) {
  const where = dateWhere(query);

  const rows = await Order.findAll({
    attributes: [
      'orderSource',
      [fn('COUNT', col('Order.id')), 'orderCount'],
      [
        fn(
          'COALESCE',
          fn('SUM', literal("CASE WHEN `Order`.`status` <> 'cancelled' THEN `Order`.`total` ELSE 0 END")),
          0
        ),
        'sales',
      ],
      [fn('COALESCE', fn('SUM', literal(PAID_SALES)), 0), 'revenue'],
      [
        fn('SUM', literal("CASE WHEN `Order`.`status` = 'cancelled' THEN 1 ELSE 0 END")),
        'cancelledCount',
      ],
    ],
    where,
    group: ['Order.orderSource'],
    raw: true,
  });

  const sources = ['customer', 'seller'].map((source) => {
    const row = rows.find((entry) => entry.orderSource === source);
    return {
      source,
      orderCount: num(row?.orderCount),
      sales: round2(num(row?.sales)),
      revenue: round2(num(row?.revenue)),
      cancelledCount: num(row?.cancelledCount),
    };
  });

  const total = sources.reduce((sum, row) => sum + row.orderCount, 0);
  return sources.map((row) => ({
    ...row,
    share: total ? Math.round((row.orderCount / total) * 1000) / 10 : 0,
  }));
}

// GET /api/admin/reports/order-source
exports.getOrderSourceReport = asyncHandler(async (req, res) => {
  const sources = await sourceBreakdown(req.query);

  // Which seller raised the direct orders, so the split is actionable.
  const window = sqlDateWindow(req.query, 'o.placedAt');
  const creators = await User.findAll({
    where: { role: 'seller' },
    attributes: [
      'id',
      'name',
      [
        literal(
          `(SELECT COUNT(*) FROM orders o WHERE o.createdById = \`User\`.\`id\` AND o.orderSource = 'seller'${window})`
        ),
        'orderCount',
      ],
      [
        literal(
          `(SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.createdById = \`User\`.\`id\` AND o.orderSource = 'seller' AND o.status <> 'cancelled'${window})`
        ),
        'sales',
      ],
    ],
    order: [[literal('orderCount'), 'DESC']],
  });

  res.json({
    success: true,
    data: {
      range: describeRange(req.query),
      sources,
      totals: {
        orders: sources.reduce((sum, row) => sum + row.orderCount, 0),
        sales: round2(sources.reduce((sum, row) => sum + row.sales, 0)),
      },
      byCreator: creators
        .map((row) => ({
          id: row.id,
          name: row.name,
          orderCount: num(row.get('orderCount')),
          sales: round2(num(row.get('sales'))),
        }))
        .filter((row) => row.orderCount > 0),
    },
  });
});

/* -------------------------------- Analytics --------------------------------- */

/** New sign-ups per period for one role, plus a running total. */
async function growthSeries(role, query, groupBy) {
  const expr = periodSql(groupBy, '`User`.`createdAt`');
  const window = resolveDateWindow(query);

  const [rows, priorCount] = await Promise.all([
    User.findAll({
      attributes: [[literal(expr), 'period'], [fn('COUNT', col('User.id')), 'joined']],
      where: { role, ...(window ? { createdAt: window } : {}) },
      group: [literal(expr)],
      order: [[literal(expr), 'ASC']],
      raw: true,
    }),
    // Everyone who signed up before the window still counts toward the running total.
    window && window[Op.gte]
      ? User.count({ where: { role, createdAt: { [Op.lt]: window[Op.gte] } } })
      : Promise.resolve(0),
  ]);

  let running = priorCount;
  return fillGaps(
    rows.map((row) => {
      running += num(row.joined);
      return { period: row.period, joined: num(row.joined), total: running };
    }),
    groupBy,
    { joined: 0, total: running }
  );
}

// GET /api/admin/reports/analytics
exports.getAnalytics = asyncHandler(async (req, res) => {
  const groupBy = normaliseGroupBy(req.query.groupBy);
  const where = reportFilters(req.query);

  const [sales, statusRows, payments, sources, customerGrowth, sellerGrowth, topProducts] =
    await Promise.all([
      salesSeries({ ...req.query, groupBy }),
      Order.findAll({
        attributes: ['status', [fn('COUNT', col('Order.id')), 'count']],
        where,
        group: ['Order.status'],
        raw: true,
      }),
      paymentBreakdown(req.query),
      sourceBreakdown(req.query),
      growthSeries('customer', req.query, groupBy),
      growthSeries('seller', req.query, groupBy),
      productPerformance(req.query, { limit: 8, direction: 'DESC' }),
    ]);

  const salesRows = fillGaps(sales.rows, groupBy, {
    orders: 0,
    units: 0,
    sales: 0,
    revenue: 0,
    discount: 0,
  });

  res.json({
    success: true,
    data: {
      groupBy,
      range: describeRange(req.query),
      salesTrend: salesRows,
      orderTrend: salesRows.map((row) => ({ period: row.period, orders: row.orders })),
      statusDistribution: Order.ORDER_STATUSES.map((status) => ({
        status,
        count: num(statusRows.find((row) => row.status === status)?.count),
      })),
      paymentUsage: payments.methods.map((row) => ({
        code: row.code,
        name: row.name,
        orderCount: row.orderCount,
        sales: row.sales,
      })),
      orderSources: sources,
      customerGrowth,
      sellerGrowth,
      topProducts: topProducts.map((row) => ({
        id: row.id,
        name: row.name,
        unitsSold: row.unitsSold,
        revenue: row.revenue,
        seller: row.seller,
      })),
      totals: totalsFor(sales.rows),
    },
  });
});

exports.salesSeries = salesSeries;
exports.productPerformance = productPerformance;
exports.sellerPerformance = sellerPerformance;
exports.paymentBreakdown = paymentBreakdown;
exports.sourceBreakdown = sourceBreakdown;
