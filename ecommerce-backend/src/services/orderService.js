const {
  Product,
  ProductImage,
  ProductVariant,
  Brand,
  Coupon,
  OrderItem,
  OrderStatusHistory,
  StockMovement,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { resolveUnitPrice, availableStock, calculateTotals, round2 } = require('../utils/pricing');

const PRODUCT_LINE_INCLUDES = [
  { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
  {
    model: ProductImage,
    as: 'images',
    separate: true,
    order: [['isPrimary', 'DESC'], ['sortOrder', 'ASC']],
  },
];

function variantLabel(variant) {
  if (!variant) return null;
  return [variant.color, variant.size].filter(Boolean).join(' / ') || null;
}

/**
 * Prices one selection and states plainly whether it can be bought.
 * Cart lines and seller-picked lines both become this shape, so the rest of the
 * ordering code never needs to know where a line came from.
 */
function toLine({ product, variant, quantity, id = null }) {
  const { originalPrice, effectivePrice } = resolveUnitPrice(product, variant);
  const stock = availableStock(product, variant);

  const issues = [];
  if (!product.isActive) issues.push('This product is no longer available');
  if (variant && !variant.isActive) issues.push('This variant is no longer available');
  if (stock <= 0) issues.push('Out of stock');
  else if (quantity > stock) issues.push(`Only ${stock} left in stock`);

  return {
    id,
    quantity,
    productId: product.id,
    variantId: variant ? variant.id : null,
    sellerId: product.sellerId ?? null,
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      isActive: product.isActive,
      sellerId: product.sellerId ?? null,
      brand: product.brand,
      image: product.images?.[0]?.url || null,
    },
    variant: variant
      ? { id: variant.id, size: variant.size, color: variant.color, sku: variant.sku }
      : null,
    variantLabel: variantLabel(variant),
    originalPrice,
    effectivePrice,
    lineTotal: round2(effectivePrice * quantity),
    availableStock: stock,
    isAvailable: issues.length === 0,
    issues,
  };
}

/**
 * Looks up a coupon for an order value.
 * `strict` throws on an unusable coupon (placing an order); otherwise the reason
 * comes back so a preview can show it without blocking the page.
 */
async function resolveCoupon(code, goodsTotal, { strict = false, transaction } = {}) {
  if (!code) return { coupon: null, couponError: null };

  const coupon = await Coupon.findOne({
    where: { code: String(code).trim().toUpperCase() },
    transaction,
  });

  if (!coupon) {
    if (strict) throw ApiError.badRequest('That coupon code is not valid');
    return { coupon: null, couponError: 'That coupon code is not valid' };
  }

  const reason = coupon.rejectionReason(goodsTotal);
  if (reason) {
    if (strict) throw ApiError.badRequest(reason);
    return { coupon: null, couponError: reason };
  }

  return { coupon, couponError: null };
}

/**
 * The single quote used by the cart, customer checkout and seller order creation:
 *
 *   product total -> product discounts -> coupon -> delivery charge -> final total
 */
async function quoteSelections(selections, { couponCode = null, strictCoupon = false, transaction } = {}) {
  const items = selections.map(toLine);

  // The coupon minimum is judged on the goods total, before delivery.
  const provisional = calculateTotals(items);
  const { coupon, couponError } = await resolveCoupon(
    couponCode,
    round2(provisional.subtotal - provisional.productDiscount),
    { strict: strictCoupon, transaction }
  );

  return {
    items,
    summary: calculateTotals(items, { coupon }),
    coupon: coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        }
      : null,
    couponError,
    hasUnavailableItems: items.some((item) => !item.isAvailable),
  };
}

/**
 * Turns raw `{ productId, variantId, quantity }` input into loaded selections.
 * Passing `sellerId` restricts the pick list to that seller's own catalogue.
 */
async function loadSelections(rawItems, { transaction, sellerId = null } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw ApiError.badRequest('Add at least one product to the order');
  }

  // The same product and variant listed twice is one line with the total quantity.
  const merged = new Map();
  rawItems.forEach((raw) => {
    const productId = Number(raw.productId);
    const variantId = raw.variantId ? Number(raw.variantId) : null;
    const quantity = Math.max(1, Number(raw.quantity) || 1);
    const key = `${productId}:${variantId ?? 'none'}`;

    const existing = merged.get(key);
    if (existing) existing.quantity += quantity;
    else merged.set(key, { productId, variantId, quantity });
  });

  const selections = [];
  for (const entry of merged.values()) {
    const product = await Product.findByPk(entry.productId, {
      include: [...PRODUCT_LINE_INCLUDES, { model: ProductVariant, as: 'variants' }],
      transaction,
    });
    if (!product) throw ApiError.badRequest(`Product ${entry.productId} does not exist`);

    if (!product.isActive) throw ApiError.badRequest(`"${product.name}" is disabled`);

    const hasVariants = product.variants && product.variants.length > 0;
    let variant = null;

    if (entry.variantId) {
      variant = product.variants.find((v) => v.id === entry.variantId) || null;
      if (!variant) {
        throw ApiError.badRequest(`Selected variant does not belong to "${product.name}"`);
      }
      if (!variant.isActive) throw ApiError.badRequest(`That variant of "${product.name}" is disabled`);
    } else if (hasVariants) {
      throw ApiError.badRequest(`Please choose a variant for "${product.name}"`);
    }

    selections.push({ product, variant, quantity: entry.quantity });
  }

  return selections;
}

/**
 * Locks the stock rows behind an order and re-checks them against the locked
 * values, so two orders cannot sell the same last unit.
 */
async function lockAndValidateStock(lines, transaction) {
  for (const line of lines) {
    if (line.variantId) {
      const variant = await ProductVariant.findByPk(line.variantId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!variant || !variant.isActive) {
        throw ApiError.badRequest(`${line.product.name} is no longer available`);
      }
      if (variant.stock < line.quantity) {
        throw ApiError.badRequest(
          `Only ${variant.stock} unit(s) of ${line.product.name} (${line.variantLabel}) left in stock`
        );
      }
    } else {
      const product = await Product.findByPk(line.productId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!product || !product.isActive) {
        throw ApiError.badRequest(`${line.product.name} is no longer available`);
      }
      if (product.stock < line.quantity) {
        throw ApiError.badRequest(`Only ${product.stock} unit(s) of ${line.product.name} left in stock`);
      }
    }
  }
}

/**
 * Applies a stock delta for every line of an order and writes the ledger rows
 * the seller's stock history reads.
 * `direction` is -1 when placing an order and +1 when returning stock on cancel.
 */
async function adjustStock(
  items,
  direction,
  transaction,
  { type = 'order', reason = null, orderId = null, userId = null } = {}
) {
  for (const item of items) {
    let sellerId = null;
    let product = null;

    if (item.productId) {
      product = await Product.findByPk(item.productId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (product) sellerId = product.sellerId;
    }

    if (item.variantId) {
      const variant = await ProductVariant.findByPk(item.variantId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (variant) {
        variant.stock = Math.max(0, variant.stock + direction * item.quantity);
        await variant.save({ transaction });

        await StockMovement.create(
          {
            productId: item.productId,
            variantId: item.variantId,
            sellerId,
            type,
            quantityChange: direction * item.quantity,
            resultingStock: variant.stock,
            reason,
            orderId,
            createdById: userId,
          },
          { transaction }
        );
      }
    }

    if (product) {
      // The parent stock mirrors the variant totals, so it moves either way.
      product.stock = Math.max(0, product.stock + direction * item.quantity);
      product.soldCount = Math.max(0, product.soldCount - direction * item.quantity);
      await product.save({ transaction });

      // Variant lines already logged the detail; this keeps product-level history clean.
      if (!item.variantId) {
        await StockMovement.create(
          {
            productId: item.productId,
            variantId: null,
            sellerId,
            type,
            quantityChange: direction * item.quantity,
            resultingStock: product.stock,
            reason,
            orderId,
            createdById: userId,
          },
          { transaction }
        );
      }
    }
  }
}

/** Copies priced lines onto the order so later catalogue edits cannot rewrite history. */
function snapshotOrderItems(orderId, lines, transaction) {
  return OrderItem.bulkCreate(
    lines.map((line) => ({
      orderId,
      productId: line.productId,
      variantId: line.variantId,
      sellerId: line.sellerId,
      productName: line.product.name,
      productSlug: line.product.slug,
      brandName: line.product.brand ? line.product.brand.name : null,
      variantLabel: line.variantLabel,
      sku: line.variant ? line.variant.sku : null,
      image: line.product.image,
      originalPrice: line.originalPrice,
      unitPrice: line.effectivePrice,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
    })),
    { transaction }
  );
}

/** Readable reference, assigned once the row has an id. */
async function assignOrderNumber(order, transaction) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  order.orderNumber = `ORD-${datePart}-${String(order.id).padStart(5, '0')}`;
  await order.save({ transaction });
  return order.orderNumber;
}

function recordStatus(orderId, status, { note = null, changedById = null, transaction }) {
  return OrderStatusHistory.create({ orderId, status, note, changedById }, { transaction });
}

module.exports = {
  PRODUCT_LINE_INCLUDES,
  variantLabel,
  toLine,
  resolveCoupon,
  quoteSelections,
  loadSelections,
  lockAndValidateStock,
  adjustStock,
  snapshotOrderItems,
  assignOrderNumber,
  recordStatus,
};
