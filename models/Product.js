const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    min_stock: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Hubungan FK sengaja dimatikan sementara agar database reset dulu
    },
  },
  {
    tableName: "products",
    timestamps: true,
    underscored: true, // Menggunakan created_at dan updated_at
  },
);

// Associations - harus didefinisikan agar include/join berfungsi
const Category = require("./Category");
Product.belongsTo(Category, { foreignKey: "category_id", as: "Category" });
Category.hasMany(Product, { foreignKey: "category_id", as: "Products" });

module.exports = Product;
