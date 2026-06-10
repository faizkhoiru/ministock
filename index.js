const path = require("path");
const express = require("express");
const sequelize = require("./config/database");
const { Client } = require("pg"); // Tambahan driver PG murni
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

// ====================================================
// FUNGSI PEMBERSIH DATABASE SECARA PAKSA (RAW CLEAN)
// ====================================================
const nukeDatabaseBermasalah = async () => {
  console.log("🧹 Memulai pembersihan database lewat query eksternal...");
  // Membaca string koneksi database dari environment variable Render kamu
  const connectionString = process.env.DATABASE_URL;

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }, // Wajib untuk koneksi Render
  });

  try {
    await client.connect();
    // Hapus paksa semua tabel yang saling mengunci
    await client.query("DROP TABLE IF EXISTS public.products CASCADE;");
    await client.query("DROP TABLE IF EXISTS public.categories CASCADE;");
    await client.query("DROP TABLE IF EXISTS public.stock_histories CASCADE;");
    await client.query("DROP TABLE IF EXISTS public.audit_logs CASCADE;");
    console.log("🗑️ DATABASE SUDAH BERSIH TOTAL!");
  } catch (err) {
    console.error("❌ Gagal membersihkan database secara manual:", err.message);
  } finally {
    await client.end();
  }
};

// Jalankan Server & Sinkronisasi DB
const startServer = async () => {
  try {
    // 1. Jalankan pembersihan paksa terlebih dahulu sebelum Sequelize menyentuh DB
    await nukeDatabaseBermasalah();

    // 2. Baru lakukan otentikasi Sequelize
    await sequelize.authenticate();
    console.log("✅ KONEKSI BERHASIL: Terhubung ke PostgreSQL!");

    // 3. Sinkronisasi tabel baru yang sudah bersih
    await sequelize.sync();
    console.log("Database synced successfully");
    console.log(
      "📊 DATABASE: Semua tabel berhasil disinkronkan kembali dari nol.",
    );

    startListening(DEFAULT_PORT);
  } catch (error) {
    console.error("❌ KONEKSI GAGAL:", error.message);
  }
};

startServer();
