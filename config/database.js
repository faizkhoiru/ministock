const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASS, 
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres', // Kita pakai postgresql
        logging: false,      // Agar terminal tidak terlalu penuh dengan teks SQL
    }
);

module.exports = sequelize;