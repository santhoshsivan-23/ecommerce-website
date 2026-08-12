const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Address = sequelize.define(
  'Address',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    label: { type: DataTypes.ENUM('home', 'work', 'other'), allowNull: false, defaultValue: 'home' },
    fullName: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { is: { args: /^[0-9+\-\s()]{7,20}$/, msg: 'Phone number is not valid' } },
    },
    addressLine1: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true } },
    addressLine2: { type: DataTypes.STRING(200), allowNull: true },
    landmark: { type: DataTypes.STRING(150), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    state: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    postalCode: {
      type: DataTypes.STRING(12),
      allowNull: false,
      validate: { is: { args: /^[0-9A-Za-z\s-]{4,12}$/, msg: 'Postal code is not valid' } },
    },
    country: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'India' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'addresses',
    timestamps: true,
    indexes: [{ fields: ['userId'] }],
  }
);

module.exports = Address;
