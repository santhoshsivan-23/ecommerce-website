const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WishlistItem = sequelize.define(
  'WishlistItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: 'wishlist_items',
    timestamps: true,
    indexes: [
      // Enforces "no duplicate wishlist entries" at the database level.
      { unique: true, fields: ['userId', 'productId'], name: 'wishlist_items_unique' },
    ],
  }
);

module.exports = WishlistItem;
