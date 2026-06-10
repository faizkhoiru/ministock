const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      defaultValue: "admin",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "Aktif",
    },
  },
  {
    tableName: "user",
    timestamps: true, // Membuat kolom createdAt & updatedAt secara otomatis
    underscored: true, // Mengubah format camelCase menjadi snake_case (created_at)
  }
);

module.exports = User;