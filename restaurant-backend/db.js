// db.js
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "restaurantdb-server.mysql.database.azure.com",
  user: "rmsadmin",
  password: "Sheejal1@",
  database: "restaurantdb",
  port: 3306,
  ssl: { rejectUnauthorized: true },
});

db.getConnection()
  .then(() => console.log("✅ Connected to Azure MySQL"))
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  });

module.exports = db;
