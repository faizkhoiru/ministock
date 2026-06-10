const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Diubah menjadi true agar log sistem tetap tersimpan jika tidak ada user
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true, // Diubah menjadi true agar log sistem tetap tersimpan jika tidak ada user
    },
    action: {
      type: DataTypes.STRING, // CREATE, READ, UPDATE, DELETE, EXPORT, LOGIN, LOGOUT
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING, // Product, StockHistory, Category, User, etc
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    entity_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING, // SUCCESS, FAILED
      defaultValue: "SUCCESS",
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "audit_logs",
    underscored: true,
    timestamps: true,
    updatedAt: false, // Hanya createdAt
    // Indexing ditambahkan agar query audit trail cepat saat data besar
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { fields: ['entity_type', 'entity_id'] }
    ]
  }
);

module.exports = AuditLog;