const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Variation = sequelize.define(
  'Variation',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    values: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
      get() {
        const raw = this.getDataValue('values');
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      set(val) {
        if (Array.isArray(val)) {
          this.setDataValue('values', JSON.stringify(val));
        } else if (typeof val === 'string') {
          try {
            JSON.parse(val);
            this.setDataValue('values', val);
          } catch {
            const arr = val.split(',').map((s) => s.trim()).filter(Boolean);
            this.setDataValue('values', JSON.stringify(arr));
          }
        } else {
          this.setDataValue('values', '[]');
        }
      },
    },
  },
  {
    tableName: 'variations',
    timestamps: true,
  }
);

module.exports = Variation;
