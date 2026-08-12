const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { slugHook } = require('../utils/slug');

const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    image: { type: DataTypes.STRING(500), allowNull: true },
    // A category with a parentId is a subcategory.
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'categories',
    timestamps: true,
    hooks: {
      beforeValidate: slugHook(() => Category),
    },
  }
);

module.exports = Category;
