const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { slugHook } = require('../utils/slug');

const Brand = sequelize.define(
  'Brand',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true, validate: { notEmpty: true } },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    logo: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'brands',
    timestamps: true,
    hooks: {
      beforeValidate: slugHook(() => Brand),
    },
  }
);

module.exports = Brand;
