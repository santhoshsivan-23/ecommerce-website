const { CartItem, Product, ProductVariant, WishlistItem } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { availableStock } = require('../utils/pricing');
const { getOrCreateCart, quoteCart } = require('../services/cartService');

/**
 * Coupon codes ride along on the query string so the cart can preview them.
 * Express 5 leaves `req.body` undefined on requests that carry no body.
 */
function couponFrom(req) {
  return req.query.coupon || (req.body && req.body.couponCode) || null;
}

/** Shared validation for adding to / updating a cart line. */
async function loadPurchasable(productId, variantId, quantity) {
  const product = await Product.findByPk(productId, {
    include: [{ model: ProductVariant, as: 'variants' }],
  });
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.isActive) throw ApiError.badRequest('This product is not available right now');

  const hasVariants = product.variants && product.variants.length > 0;

  let variant = null;
  if (variantId) {
    variant = product.variants.find((v) => v.id === Number(variantId)) || null;
    if (!variant) throw ApiError.badRequest('Selected variant does not belong to this product');
    if (!variant.isActive) throw ApiError.badRequest('Selected variant is not available');
  } else if (hasVariants) {
    // Variant products cannot be added without a concrete choice.
    throw ApiError.badRequest('Please select a variant before adding this product to the cart');
  }

  const stock = availableStock(product, variant);
  if (stock <= 0) throw ApiError.badRequest('This product is out of stock');
  if (quantity > stock) throw ApiError.badRequest(`Only ${stock} unit(s) available in stock`);

  return { product, variant };
}

// GET /api/cart
exports.getCart = asyncHandler(async (req, res) => {
  const payload = await quoteCart(req.user.id, { couponCode: couponFrom(req) });
  res.json({ success: true, data: payload });
});

// POST /api/cart/items
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId = null, quantity = 1 } = req.body;
  const qty = Math.max(1, Number(quantity) || 1);

  const cart = await getOrCreateCart(req.user.id);

  const existing = await CartItem.findOne({
    where: { cartId: cart.id, productId, variantId: variantId || null },
  });

  // Adding an item already in the cart tops up the existing line.
  const targetQuantity = existing ? existing.quantity + qty : qty;
  await loadPurchasable(productId, variantId, targetQuantity);

  if (existing) {
    existing.quantity = targetQuantity;
    await existing.save();
  } else {
    await CartItem.create({ cartId: cart.id, productId, variantId: variantId || null, quantity: qty });
  }

  const payload = await quoteCart(req.user.id, { couponCode: couponFrom(req) });
  res.status(201).json({ success: true, message: 'Added to cart', data: payload });
});

// PATCH /api/cart/items/:id
exports.updateCartItem = asyncHandler(async (req, res) => {
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 1) throw ApiError.badRequest('Quantity must be at least 1');

  const cart = await getOrCreateCart(req.user.id);
  const item = await CartItem.findOne({ where: { id: req.params.id, cartId: cart.id } });
  if (!item) throw ApiError.notFound('Cart item not found');

  await loadPurchasable(item.productId, item.variantId, qty);

  item.quantity = qty;
  await item.save();

  const payload = await quoteCart(req.user.id, { couponCode: couponFrom(req) });
  res.json({ success: true, message: 'Cart updated', data: payload });
});

// DELETE /api/cart/items/:id
exports.removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const item = await CartItem.findOne({ where: { id: req.params.id, cartId: cart.id } });
  if (!item) throw ApiError.notFound('Cart item not found');

  await item.destroy();

  const payload = await quoteCart(req.user.id, { couponCode: couponFrom(req) });
  res.json({ success: true, message: 'Item removed from cart', data: payload });
});

// DELETE /api/cart
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await CartItem.destroy({ where: { cartId: cart.id } });

  const payload = await quoteCart(req.user.id);
  res.json({ success: true, message: 'Cart cleared', data: payload });
});

// POST /api/cart/move-from-wishlist  -> wishlist item becomes a cart line
exports.moveFromWishlist = asyncHandler(async (req, res) => {
  const { productId, variantId = null, quantity = 1 } = req.body;
  const qty = Math.max(1, Number(quantity) || 1);

  const wishlistItem = await WishlistItem.findOne({ where: { userId: req.user.id, productId } });
  if (!wishlistItem) throw ApiError.notFound('This product is not in your wishlist');

  const cart = await getOrCreateCart(req.user.id);
  const existing = await CartItem.findOne({
    where: { cartId: cart.id, productId, variantId: variantId || null },
  });

  const targetQuantity = existing ? existing.quantity + qty : qty;
  await loadPurchasable(productId, variantId, targetQuantity);

  if (existing) {
    existing.quantity = targetQuantity;
    await existing.save();
  } else {
    await CartItem.create({ cartId: cart.id, productId, variantId: variantId || null, quantity: qty });
  }

  await wishlistItem.destroy();

  const payload = await quoteCart(req.user.id, { couponCode: couponFrom(req) });
  res.json({ success: true, message: 'Moved to cart', data: payload });
});

// POST /api/cart/coupon -> validates a code against the current cart
exports.applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code || !String(code).trim()) throw ApiError.badRequest('Enter a coupon code');

  const payload = await quoteCart(req.user.id, {
    couponCode: code,
    strictCoupon: true,
  });

  res.json({
    success: true,
    message: `Coupon ${payload.coupon.code} applied`,
    data: payload,
  });
});
