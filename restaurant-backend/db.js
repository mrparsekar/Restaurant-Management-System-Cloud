const mysql = require('mysql2/promise');

async function connectDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306,
      ssl: { rejectUnauthorized: true }
    });
    console.log('✅ Connected to Azure MySQL Database successfully!');
    return connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

module.exports = connectDB;
