const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/** One row per status change, so the customer can see a tracking timeline. */
const OrderStatusHistory = sequelize.define(
  'OrderStatusHistory',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false },
    note: { type: DataTypes.STRING(255), allowNull: true },
    // Null when the system set the status rather than a person.
    changedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: 'order_status_history',
    timestamps: true,
    indexes: [{ fields: ['orderId'] }],
  }
);

module.exports = OrderStatusHistory;
