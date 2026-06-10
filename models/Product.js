const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Category = require("./Category");
const AuditLog = require("./AuditLog");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
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
   //  GANTI DEFINISI KOLOM category_id KAMU MENJADI SEPERTI INI:
category_id: {
  type: DataTypes.INTEGER,
  allowNull: true
},
  {
    tableName: "products",
    underscored: true, // Otomatis mengubah camelCase ke snake_case di database PostgreSQL (created_at)
  },
);

// Definisikan Relasi antara Product dan Category
Product.belongsTo(Category, { foreignKey: "category_id" });
Category.hasMany(Product, { foreignKey: "category_id" });

Product.afterCreate(async (product, options) => {
  await AuditLog.create({
    action: "TAMBAH",
    entity_type: "PRODUCT",
    entity_id: product.id,
    entity_name: product.name,
    details: `Produk ${product.name} ditambahkan`,
    username: options.username || options.user?.username || "System",
  });
});

Product.afterDestroy(async (product, options) => {
  await AuditLog.create({
    action: "HAPUS",
    entity_type: "PRODUCT",
    entity_id: product.id,
    entity_name: product.name,
    details: `Produk ${product.name} dihapus`,
    username: options.username || options.user?.username || "System",
  });
});
module.exports = Product;
