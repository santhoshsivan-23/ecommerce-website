const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CartItem = sequelize.define(
  'CartItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    cartId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
  },
  {
    tableName: 'cart_items',
    timestamps: true,
    indexes: [
      // The same product in two different variants is two distinct lines.
      { unique: true, fields: ['cartId', 'productId', 'variantId'], name: 'cart_items_unique_line' },
    ],
  }
);

module.exports = CartItem;
