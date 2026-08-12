const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

function decimalGetter(field) {
  return function get() {
    const raw = this.getDataValue(field);
    return raw === null || raw === undefined ? null : Number(raw);
  };
}

const ProductVariant = sequelize.define(
  'ProductVariant',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sku: { type: DataTypes.STRING(80), allowNull: true, unique: true },
    size: { type: DataTypes.STRING(50), allowNull: true },
    color: { type: DataTypes.STRING(50), allowNull: true },
    // Null price means "inherit the parent product's price".
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: true, get: decimalGetter('price') },
    discountPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get: decimalGetter('discountPrice'),
    },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    image: { type: DataTypes.STRING(1000), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'product_variants',
    timestamps: true,
    indexes: [{ fields: ['productId'] }],
  }
);

module.exports = ProductVariant;
