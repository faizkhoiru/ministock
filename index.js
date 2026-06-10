const path = require("path");
const express = require("express");
const sequelize = require("./config/database");
require("dotenv").config();

// Import Model
const Product = require("./models/Product");
const StockHistory = require("./models/StockHistory");
const Category = require("./models/Category");
const AuditLog = require("./models/AuditLog");
const User = require("./models/User");

// Import Routes
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const historyRoutes = require("./routes/historyRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const exportRoutes = require("./routes/exportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);

function startListening(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 SERVER MENYALA PADA PORT: ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(
        `⚠️ Port ${port} sudah dipakai, mencoba port ${nextPort}...`,
      );
      startListening(nextPort);
      return;
    }
    console.error("❌ GAGAL MENYALAKAN SERVER:", error.message);
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/users", userRoutes);

// Jalankan Server & Sinkronisasi DB secara normal
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ KONEKSI BERHASIL: Terhubung ke PostgreSQL!");

    // Sinkronisasi aman ke tabel baru 'product_categories'
    await sequelize.sync();
    console.log("Database synced successfully");

    startListening(DEFAULT_PORT);
  } catch (error) {
    console.error("❌ KONEKSI GAGAL:", error.message);
  }
};

startServer();
