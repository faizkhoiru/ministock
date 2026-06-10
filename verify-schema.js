const { Client } = require('pg');
require('dotenv').config();

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
    console.log('✅ Connected to PostgreSQL');

    // Check StockHistory columns
    const stockHistoryResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock_history'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 StockHistory columns:');
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
    
    console.log('\n📊 Product columns:');
    const productColumns = productResult.rows.map(row => row.column_name);
    productResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Verify required fields
    console.log('\n🔍 Verification:');
    const requiredStockHistoryFields = ['unit_price', 'total_value', 'changed_by', 'deleted_at'];
    const requiredProductFields = ['category'];
    
    let allGood = true;
    
    for (const field of requiredStockHistoryFields) {
      if (stockColumns.includes(field)) {
        console.log(`  ✅ StockHistory.${field} exists`);
      } else {
        console.log(`  ❌ StockHistory.${field} MISSING`);
        allGood = false;
      }
    }
    
    for (const field of requiredProductFields) {
      if (productColumns.includes(field)) {
        console.log(`  ✅ Product.${field} exists`);
      } else {
        console.log(`  ❌ Product.${field} MISSING`);
        allGood = false;
      }
    }

    if (allGood) {
      console.log('\n✅ All required columns exist!');
    } else {
      console.log('\n❌ Some columns are missing!');
    }

    await client.end();
    process.exit(allGood ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySchema();
