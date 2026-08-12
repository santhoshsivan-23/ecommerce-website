const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

function decimalGetter(field) {
  return function get() {
    const raw = this.getDataValue(field);
    return raw === null || raw === undefined ? null : Number(raw);
  };
}

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    // Kept for "buy again" links; nulled rather than blocking a product deletion.
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Snapshotted owner, so a seller's order view survives the product being
    // reassigned or deleted and needs no join to filter.
    sellerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    // Everything below is a snapshot taken at purchase time.
    productName: { type: DataTypes.STRING(200), allowNull: false },
    productSlug: { type: DataTypes.STRING(240), allowNull: true },
    brandName: { type: DataTypes.STRING(120), allowNull: true },
    variantLabel: { type: DataTypes.STRING(120), allowNull: true },
    sku: { type: DataTypes.STRING(80), allowNull: true },
    image: { type: DataTypes.STRING(1000), allowNull: true },

    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get: decimalGetter('originalPrice'),
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get: decimalGetter('unitPrice'),
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    lineTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get: decimalGetter('lineTotal'),
    },
  },
  {
    tableName: 'order_items',
    timestamps: true,
    indexes: [{ fields: ['orderId'] }, { fields: ['productId'] }, { fields: ['sellerId'] }],
  }
);

module.exports = OrderItem;
