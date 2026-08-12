const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
/** Where the order came from: the storefront, or a seller raising it directly. */
const ORDER_SOURCES = ['customer', 'seller'];

/** Forward progression a live order can take, plus cancellation. */
const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function decimalGetter(field) {
  return function get() {
    const raw = this.getDataValue(field);
    return raw === null || raw === undefined ? null : Number(raw);
  };
}

const money = (field) => ({
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,
  defaultValue: 0,
  get: decimalGetter(field),
});

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    // Human-facing reference, e.g. ORD-20260811-00007.
    orderNumber: { type: DataTypes.STRING(32), allowNull: true, unique: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    subtotal: money('subtotal'),
    productDiscount: money('productDiscount'),
    couponDiscount: money('couponDiscount'),
    discount: money('discount'),
    deliveryCharge: money('deliveryCharge'),
    total: money('total'),

    couponId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    couponCode: { type: DataTypes.STRING(40), allowNull: true },

    paymentMethodId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Snapshotted so history survives a method being renamed or deleted.
    paymentMethodCode: { type: DataTypes.STRING(40), allowNull: false },
    paymentMethodName: { type: DataTypes.STRING(80), allowNull: false },
    paymentStatus: {
      type: DataTypes.ENUM(...PAYMENT_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },

    status: { type: DataTypes.ENUM(...ORDER_STATUSES), allowNull: false, defaultValue: 'pending' },

    orderSource: {
      type: DataTypes.ENUM(...ORDER_SOURCES),
      allowNull: false,
      defaultValue: 'customer',
    },
    // The seller who raised a direct order; null for storefront checkouts.
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    // Delivery address is copied onto the order; editing the address book later
    // must not rewrite where a past order was sent.
    addressId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    shippingFullName: { type: DataTypes.STRING(120), allowNull: false },
    shippingPhone: { type: DataTypes.STRING(20), allowNull: false },
    shippingAddressLine1: { type: DataTypes.STRING(200), allowNull: false },
    shippingAddressLine2: { type: DataTypes.STRING(200), allowNull: true },
    shippingLandmark: { type: DataTypes.STRING(150), allowNull: true },
    shippingCity: { type: DataTypes.STRING(100), allowNull: false },
    shippingState: { type: DataTypes.STRING(100), allowNull: false },
    shippingPostalCode: { type: DataTypes.STRING(12), allowNull: false },
    shippingCountry: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'India' },

    customerNote: { type: DataTypes.STRING(500), allowNull: true },
    cancelReason: { type: DataTypes.STRING(255), allowNull: true },

    placedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    shippedAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['paymentStatus'] },
      { fields: ['orderNumber'] },
      { fields: ['orderSource'] },
      { fields: ['createdById'] },
    ],
  }
);

Order.ORDER_STATUSES = ORDER_STATUSES;
Order.PAYMENT_STATUSES = PAYMENT_STATUSES;
Order.ORDER_SOURCES = ORDER_SOURCES;
Order.STATUS_FLOW = STATUS_FLOW;

/** Statuses this order can legally move to next. */
Order.prototype.allowedNextStatuses = function allowedNextStatuses() {
  if (this.status === 'delivered' || this.status === 'cancelled') return [];

  const index = STATUS_FLOW.indexOf(this.status);
  const next = index >= 0 && index < STATUS_FLOW.length - 1 ? [STATUS_FLOW[index + 1]] : [];
  return [...next, 'cancelled'];
};

/** Customers may back out only before the order has been picked for packing. */
Order.prototype.isCustomerCancellable = function isCustomerCancellable() {
  return this.status === 'pending' || this.status === 'confirmed';
};

module.exports = Order;
