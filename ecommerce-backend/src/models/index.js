const { sequelize } = require('../config/db');

const User = require('./User');
const Category = require('./Category');
const Brand = require('./Brand');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductVariant = require('./ProductVariant');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const WishlistItem = require('./WishlistItem');
const Address = require('./Address');
const PaymentMethod = require('./PaymentMethod');
const Coupon = require('./Coupon');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderStatusHistory = require('./OrderStatusHistory');
const StockMovement = require('./StockMovement');
const Setting = require('./Setting');
const Variation = require('./Variation');

/* ---------------------------------- Catalog --------------------------------- */

// Category self-reference: parent category -> subcategories.
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId', onDelete: 'SET NULL' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

Category.hasMany(Product, { as: 'products', foreignKey: 'categoryId', onDelete: 'RESTRICT' });
Product.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

Brand.hasMany(Product, { as: 'products', foreignKey: 'brandId', onDelete: 'SET NULL' });
Product.belongsTo(Brand, { as: 'brand', foreignKey: 'brandId' });

User.hasMany(Product, { as: 'listings', foreignKey: 'sellerId', onDelete: 'SET NULL' });
Product.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });

Product.hasMany(ProductImage, { as: 'images', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

/* ----------------------------- Customer -> Cart ----------------------------- */

// Customer -> Cart -> CartItems -> Products
User.hasOne(Cart, { as: 'cart', foreignKey: 'userId', onDelete: 'CASCADE' });
Cart.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Cart.hasMany(CartItem, { as: 'items', foreignKey: 'cartId', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { as: 'cart', foreignKey: 'cartId' });

Product.hasMany(CartItem, { as: 'cartItems', foreignKey: 'productId', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

ProductVariant.hasMany(CartItem, { as: 'cartItems', foreignKey: 'variantId', onDelete: 'CASCADE' });
CartItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' });

/* --------------------------- Customer -> Wishlist --------------------------- */

// Customer -> Wishlist -> Products
User.hasMany(WishlistItem, { as: 'wishlistItems', foreignKey: 'userId', onDelete: 'CASCADE' });
WishlistItem.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Product.hasMany(WishlistItem, { as: 'wishlistItems', foreignKey: 'productId', onDelete: 'CASCADE' });
WishlistItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

User.belongsToMany(Product, {
  as: 'wishlistProducts',
  through: WishlistItem,
  foreignKey: 'userId',
  otherKey: 'productId',
});

/* --------------------------- Customer -> Addresses -------------------------- */

User.hasMany(Address, { as: 'addresses', foreignKey: 'userId', onDelete: 'CASCADE' });
Address.belongsTo(User, { as: 'user', foreignKey: 'userId' });

/* ----------------------------- Customer -> Orders --------------------------- */

// Order -> Customer, Address, OrderItems -> Products
User.hasMany(Order, { as: 'orders', foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { as: 'customer', foreignKey: 'userId' });

// The order keeps its own copy of the address, so removing one from the address
// book must not delete order history.
Address.hasMany(Order, { as: 'orders', foreignKey: 'addressId', onDelete: 'SET NULL' });
Order.belongsTo(Address, { as: 'address', foreignKey: 'addressId' });

PaymentMethod.hasMany(Order, { as: 'orders', foreignKey: 'paymentMethodId', onDelete: 'SET NULL' });
Order.belongsTo(PaymentMethod, { as: 'paymentMethod', foreignKey: 'paymentMethodId' });

Coupon.hasMany(Order, { as: 'orders', foreignKey: 'couponId', onDelete: 'SET NULL' });
Order.belongsTo(Coupon, { as: 'coupon', foreignKey: 'couponId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });

// A second alias used purely as a filter: joining on it restricts a query to
// orders that contain a given seller's lines, without replacing `items`.
Order.hasMany(OrderItem, { as: 'sellerLines', foreignKey: 'orderId' });

// The snapshotted owner of a line, so the admin can see which seller supplied
// each item of a mixed order. Declared without a constraint on purpose: the
// column is a snapshot that must outlive the seller row, so it stays a plain
// indexed value rather than gaining a foreign key that would null it.
User.hasMany(OrderItem, { as: 'soldItems', foreignKey: 'sellerId', constraints: false });
OrderItem.belongsTo(User, { as: 'seller', foreignKey: 'sellerId', constraints: false });

Product.hasMany(OrderItem, { as: 'orderItems', foreignKey: 'productId', onDelete: 'SET NULL' });
OrderItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

ProductVariant.hasMany(OrderItem, { as: 'orderItems', foreignKey: 'variantId', onDelete: 'SET NULL' });
OrderItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' });

Order.hasMany(OrderStatusHistory, {
  as: 'statusHistory',
  foreignKey: 'orderId',
  onDelete: 'CASCADE',
});
OrderStatusHistory.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });

User.hasMany(OrderStatusHistory, { as: 'statusChanges', foreignKey: 'changedById', onDelete: 'SET NULL' });
OrderStatusHistory.belongsTo(User, { as: 'changedBy', foreignKey: 'changedById' });

// Seller-raised orders record who created them.
User.hasMany(Order, { as: 'createdOrders', foreignKey: 'createdById', onDelete: 'SET NULL' });
Order.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

/* ------------------------------ Stock ledger -------------------------------- */

Product.hasMany(StockMovement, { as: 'stockMovements', foreignKey: 'productId', onDelete: 'CASCADE' });
StockMovement.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

ProductVariant.hasMany(StockMovement, {
  as: 'stockMovements',
  foreignKey: 'variantId',
  onDelete: 'CASCADE',
});
StockMovement.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' });

User.hasMany(StockMovement, { as: 'stockChanges', foreignKey: 'createdById', onDelete: 'SET NULL' });
StockMovement.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

Order.hasMany(StockMovement, { as: 'stockMovements', foreignKey: 'orderId', onDelete: 'SET NULL' });
StockMovement.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });

module.exports = {
  sequelize,
  User,
  Category,
  Brand,
  Product,
  ProductImage,
  ProductVariant,
  Cart,
  CartItem,
  WishlistItem,
  Address,
  PaymentMethod,
  Coupon,
  Order,
  OrderItem,
  OrderStatusHistory,
  StockMovement,
  Setting,
  Variation,
};
