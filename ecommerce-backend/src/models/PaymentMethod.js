const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/** Code of the method that can never be removed or disabled. */
const CASH_CODE = 'cash';

const PaymentMethod = sequelize.define(
  'PaymentMethod',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false, validate: { notEmpty: true } },
    code: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('code', String(value).trim().toLowerCase().replace(/\s+/g, '_'));
      },
    },
    description: { type: DataTypes.STRING(255), allowNull: true },
    // Shown to the customer under the option, e.g. "Pay the courier on delivery".
    instructions: { type: DataTypes.STRING(255), allowNull: true },
    icon: { type: DataTypes.STRING(500), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Cash is seeded as permanent: it cannot be deleted or disabled.
    isPermanent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    /**
     * Whether choosing this method settles the payment straight away. There is no
     * gateway in this phase, so it only decides the recorded payment status:
     * true -> paid, false -> pending.
     */
    settlesImmediately: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'payment_methods',
    timestamps: true,
  }
);

PaymentMethod.prototype.resolvePaymentStatus = function resolvePaymentStatus() {
  return this.settlesImmediately ? 'paid' : 'pending';
};

PaymentMethod.CASH_CODE = CASH_CODE;

module.exports = PaymentMethod;
