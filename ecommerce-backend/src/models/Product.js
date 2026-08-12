const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { slugHook } = require('../utils/slug');

/** MySQL DECIMAL comes back from the driver as a string; expose it as a number. */
function decimalGetter(field) {
  return function get() {
    const raw = this.getDataValue(field);
    return raw === null || raw === undefined ? null : Number(raw);
  };
}

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true } },
    slug: { type: DataTypes.STRING(240), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      get: decimalGetter('price'),
    },
    // When set, this is the effective selling price and `price` is shown struck through.
    discountPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
      get: decimalGetter('discountPrice'),
    },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    brandId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sellerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
      get: decimalGetter('rating'),
    },
    numReviews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Drives the "Popular" sort option.
    soldCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Free-form spec sheet: [{ key, value }]. Stored as TEXT because MariaDB's JSON
    // type is a LONGTEXT alias and round-trips inconsistently through Sequelize.
    specifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('specifications');
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue('specifications', value ? JSON.stringify(value) : null);
      },
    },
  },
  {
    tableName: 'products',
    timestamps: true,
    indexes: [
      { fields: ['categoryId'] },
      { fields: ['brandId'] },
      { fields: ['isActive'] },
      { fields: ['name'] },
    ],
    hooks: {
      beforeValidate: slugHook(() => Product),
    },
  }
);

/** Effective selling price after any discount. */
Product.prototype.getEffectivePrice = function getEffectivePrice() {
  const discount = this.discountPrice;
  return discount !== null && discount !== undefined && discount > 0 ? discount : this.price;
};

module.exports = Product;
