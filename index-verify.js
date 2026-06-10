const path = require("path");
const express = require("express");
const sequelize = require("./config/database");
const { Client } = require('pg');
require("dotenv").config();

// Import Model & Routes
const Product = require("./models/Product");
const StockHistory = require("./models/StockHistory");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const historyRoutes = require("./routes/historyRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk membaca JSON
app.use(express.json());

// Folder Public
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/history", historyRoutes);

// Function to verify schema
async function verifySchema() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL for schema verification');

    // Check StockHistory columns
    const stockHistoryResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock_history'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 StockHistory table columns:');
    const stockColumns = stockHistoryResult.rows.map(row => row.column_name);
    stockHistoryResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Check Product columns
    const productResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Product table columns:');
    const productColumns = productResult.rows.map(row => row.column_name);
    productResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Verify required fields
    console.log('\n🔍 Verification Results:');
    const requiredStockHistoryFields = ['unit_price', 'total_value', 'changed_by', 'deleted_at'];
    const requiredProductFields = ['category'];
    
    let allGood = true;
    const addedColumns = [];
    
    for (const field of requiredStockHistoryFields) {
      if (stockColumns.includes(field)) {
        console.log(`  ✅ StockHistory.${field} - ADDED`);
        addedColumns.push(`StockHistory.${field}`);
      } else {
        console.log(`  ❌ StockHistory.${field} - MISSING`);
        allGood = false;
      }
    }
    
    for (const field of requiredProductFields) {
      if (productColumns.includes(field)) {
        console.log(`  ✅ Product.${field} - ADDED`);
        addedColumns.push(`Product.${field}`);
      } else {
        console.log(`  ❌ Product.${field} - MISSING`);
        allGood = false;
      }
    }

    console.log('\n' + '='.repeat(50));
    if (allGood) {
      console.log('✅ SUCCESS: All required columns exist!');
      console.log('\nAdded columns:');
      addedColumns.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('❌ FAILURE: Some columns are missing!');
    }
    console.log('='.repeat(50));

    await client.end();
    return allGood;
  } catch (error) {
    console.error('❌ Verification Error:', error.message);
    return false;
  }
}

// Start Server & Sync DB
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ KONEKSI BERHASIL: Terhubung ke PostgreSQL!");
    
    // Sinkronisasi tabel
    await sequelize.sync({ alter: true });
    console.log("📊 DATABASE: Tabel Produk berhasil disinkronkan.");
    
    // Verify schema
    const isValid = await verifySchema();
    
    app.listen(PORT, () => {
      console.log(`🚀 SERVER MENYALA: http://localhost:${PORT}`);
      if (isValid) {
        console.log("\n✅ Database schema verification PASSED");
      } else {
        console.log("\n❌ Database schema verification FAILED");
      }
    });
  } catch (error) {
    console.error("❌ KONEKSI GAGAL:", error.message);
    process.exit(1);
  }
};

startServer();
