const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MOVEMENT_TYPES = ['initial', 'adjustment', 'order', 'cancellation'];

/**
 * Append-only stock ledger. Every change to a product or variant's stock writes
 * a row here, which is what the seller's stock history screen reads.
 */
const StockMovement = sequelize.define(
  'StockMovement',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Copied from the product so a seller's history is one indexed lookup.
    sellerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    type: { type: DataTypes.ENUM(...MOVEMENT_TYPES), allowNull: false, defaultValue: 'adjustment' },
    // Negative when stock leaves, positive when it comes back.
    quantityChange: { type: DataTypes.INTEGER, allowNull: false },
    resultingStock: { type: DataTypes.INTEGER, allowNull: false },

    reason: { type: DataTypes.STRING(255), allowNull: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Who made the change; null when the system did it.
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: 'stock_movements',
    timestamps: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['sellerId'] },
      { fields: ['orderId'] },
      { fields: ['createdAt'] },
    ],
  }
);

StockMovement.MOVEMENT_TYPES = MOVEMENT_TYPES;

module.exports = StockMovement;
