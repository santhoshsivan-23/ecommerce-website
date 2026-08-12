const FREE_DELIVERY_THRESHOLD = 500;
const DELIVERY_CHARGE = 49;

/** Unit price for a line: the variant overrides the product when it sets one. */
function resolveUnitPrice(product, variant) {
  const originalPrice = variant && variant.price !== null ? variant.price : product.price;

  const variantDiscount = variant && variant.discountPrice ? variant.discountPrice : null;
  const productDiscount = product.discountPrice ? product.discountPrice : null;
  const discountPrice = variant && variant.price !== null ? variantDiscount : productDiscount;

  const effectivePrice = discountPrice && discountPrice > 0 ? discountPrice : originalPrice;
  return { originalPrice: Number(originalPrice), effectivePrice: Number(effectivePrice) };
}

/** Units a customer can actually buy for a line. */
function availableStock(product, variant) {
  return variant ? variant.stock : product.stock;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * The single order calculation used by the cart, the checkout preview and order
 * creation, so all three can never disagree:
 *
 *   product total -> apply discounts and coupon -> add delivery -> final total
 *
 * Only purchasable lines count toward the totals.
 */
function calculateTotals(lines, { coupon = null } = {}) {
  const payable = lines.filter((line) => line.isAvailable);

  const subtotal = payable.reduce((sum, line) => sum + line.originalPrice * line.quantity, 0);
  const productDiscount = payable.reduce(
    (sum, line) => sum + (line.originalPrice - line.effectivePrice) * line.quantity,
    0
  );

  // Coupons apply to what the customer would otherwise pay for the goods.
  const goodsTotal = round2(subtotal - productDiscount);
  const couponDiscount = coupon ? coupon.discountFor(goodsTotal) : 0;

  const itemsTotal = round2(goodsTotal - couponDiscount);
  const deliveryCharge =
    itemsTotal === 0 || itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;

  return {
    itemCount: payable.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: round2(subtotal),
    productDiscount: round2(productDiscount),
    couponDiscount: round2(couponDiscount),
    discount: round2(productDiscount + couponDiscount),
    itemsTotal,
    deliveryCharge: round2(deliveryCharge),
    total: round2(itemsTotal + deliveryCharge),
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  };
}

module.exports = {
  resolveUnitPrice,
  availableStock,
  calculateTotals,
  round2,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_CHARGE,
};
