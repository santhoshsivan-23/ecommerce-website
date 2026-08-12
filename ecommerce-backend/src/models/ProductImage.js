const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    url: { type: DataTypes.STRING(1000), allowNull: false, validate: { notEmpty: true } },
    alt: { type: DataTypes.STRING(200), allowNull: true },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'product_images',
    timestamps: true,
    indexes: [{ fields: ['productId'] }],
  }
);

module.exports = ProductImage;
