const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const StockHistory = sequelize.define(
  "StockHistory",
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    transaction_type: {
      type: DataTypes.ENUM("in", "out"),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    total_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
    },
    stock_awal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    stock_akhir: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    reference_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    changed_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "stock_history",
    underscored: true,
    timestamps: true,
  },
);

module.exports = StockHistory;
