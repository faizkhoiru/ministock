const path = require("path");
const express = require("express");
const sequelize = require("./config/database");
require("dotenv").config();

// Import Model
const Product = require("./models/Product");
const StockHistory = require("./models/StockHistory");
const Category = require("./models/Category");
const AuditLog = require("./models/AuditLog");
const User = require("./models/User"); // Memastikan model User ter-import untuk sinkronisasi DB

// Import Routes
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const historyRoutes = require("./routes/historyRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const exportRoutes = require("./routes/exportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const userRoutes = require("./routes/userRoutes"); // 1. IMPORT RUTE USER BARU

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);

function startListening(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 SERVER MENYALA: http://localhost:${port}`);
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

// 1. Middleware untuk membaca JSON
app.use(express.json());

// 2. AKTIFKAN FOLDER PUBLIC (Kunci agar static file terbaca)
app.use(express.static(path.join(__dirname, "public")));

// RUTE HALAMAN: Arahkan "/" ke login.html secara default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 3. Gunakan API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/users", userRoutes); // 2. DAFTARKAN API USER AGAR FRONTEND BISA AKSES

// Jalankan Server & Sinkronisasi DB
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ KONEKSI BERHASIL: Terhubung ke PostgreSQL!");

    // 🚀 TRICK: Hapus paksa tabel bermasalah yang mengunci database gratis Render
    console.log("🧹 DATABASE: Membersihkan tabel lama yang bermasalah...");
    await sequelize.query("DROP TABLE IF EXISTS public.products CASCADE;");
    await sequelize.query("DROP TABLE IF EXISTS public.categories CASCADE;");
    console.log("🗑️ DATABASE: Tabel lama berhasil dihapus!");

    // Sinkronisasi tabel baru secara bersih
    await sequelize.sync();
    console.log("Database synced successfully");
    console.log(
      "📊 DATABASE: Semua tabel termasuk User berhasil disinkronkan kembali.",
    );

    startListening(DEFAULT_PORT);
  } catch (error) {
    console.error("❌ KONEKSI GAGAL:", error.message);
  }
};

startServer();
