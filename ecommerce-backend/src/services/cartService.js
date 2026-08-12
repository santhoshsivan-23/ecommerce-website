const { Cart, CartItem, Product, ProductVariant } = require('../models');
const { PRODUCT_LINE_INCLUDES, quoteSelections, variantLabel } = require('./orderService');

const CART_ITEM_INCLUDES = [
  { model: Product, as: 'product', include: PRODUCT_LINE_INCLUDES },
  { model: ProductVariant, as: 'variant' },
];

async function getOrCreateCart(userId, transaction) {
  const [cart] = await Cart.findOrCreate({ where: { userId }, transaction });
  return cart;
}

/** Cart rows in the shape the shared order pricing understands. */
async function loadCartSelections(userId, transaction) {
  const cart = await getOrCreateCart(userId, transaction);

  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    include: CART_ITEM_INCLUDES,
    order: [['createdAt', 'ASC']],
    transaction,
  });

  return {
    cart,
    selections: items.map((item) => ({
      product: item.product,
      variant: item.variant,
      quantity: item.quantity,
      id: item.id,
    })),
  };
}

/**
 * The full priced view of a customer's cart. Delegates the maths to the shared
 * order service, so the cart, checkout and seller orders all agree.
 */
async function quoteCart(userId, { couponCode = null, strictCoupon = false, transaction } = {}) {
  const { cart, selections } = await loadCartSelections(userId, transaction);
  const quote = await quoteSelections(selections, { couponCode, strictCoupon, transaction });

  return { cartId: cart.id, ...quote };
}

module.exports = {
  CART_ITEM_INCLUDES,
  getOrCreateCart,
  loadCartSelections,
  quoteCart,
  variantLabel,
};
