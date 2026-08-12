const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

function decimalGetter(field) {
  return function get() {
    const raw = this.getDataValue(field);
    return raw === null || raw === undefined ? null : Number(raw);
  };
}

const Coupon = sequelize.define(
  'Coupon',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('code', String(value).trim().toUpperCase());
      },
    },
    description: { type: DataTypes.STRING(255), allowNull: true },
    discountType: { type: DataTypes.ENUM('percent', 'fixed'), allowNull: false, defaultValue: 'percent' },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      get: decimalGetter('discountValue'),
    },
    minOrderValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      get: decimalGetter('minOrderValue'),
    },
    // Caps a percentage coupon, e.g. "10% off up to ₹500".
    maxDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get: decimalGetter('maxDiscount'),
    },
    startsAt: { type: DataTypes.DATE, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    usageLimit: { type: DataTypes.INTEGER, allowNull: true },
    usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'coupons',
    timestamps: true,
  }
);

/**
 * Checks the coupon against an order value.
 * Returns the reason it cannot be used, or null when it is valid.
 */
Coupon.prototype.rejectionReason = function rejectionReason(itemsTotal) {
  if (!this.isActive) return 'This coupon is no longer active';

  const now = new Date();
  if (this.startsAt && now < this.startsAt) return 'This coupon is not active yet';
  if (this.expiresAt && now > this.expiresAt) return 'This coupon has expired';

  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return 'This coupon has reached its usage limit';
  }
  if (itemsTotal < this.minOrderValue) {
    return `This coupon needs a minimum order of ₹${this.minOrderValue}`;
  }

  return null;
};

/** Discount this coupon takes off the given order value. */
Coupon.prototype.discountFor = function discountFor(itemsTotal) {
  let discount =
    this.discountType === 'percent' ? (itemsTotal * this.discountValue) / 100 : this.discountValue;

  if (this.discountType === 'percent' && this.maxDiscount) {
    discount = Math.min(discount, this.maxDiscount);
  }

  // Never discount more than the order is worth.
  discount = Math.min(discount, itemsTotal);
  return Math.round(discount * 100) / 100;
};

module.exports = Coupon;
