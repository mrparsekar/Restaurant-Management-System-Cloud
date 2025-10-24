require('dotenv').config(); // Load env variables
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// DB connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  ssl: { rejectUnauthorized: true },
  connectionLimit: 10,
});

db.getConnection()
  .then(() => console.log("✅ Connected to MySQL Database"))
  .catch(err => console.error("❌ Database connection failed:", err));

// Example route
app.get("/", (req, res) => res.send("Restaurant Backend is running!"));

// Routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Serve static images
app.use("/images", express.static(path.join(__dirname, "screenshots")));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = db;
