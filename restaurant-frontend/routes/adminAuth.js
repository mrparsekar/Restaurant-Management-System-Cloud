const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

// ✅ Use the same Azure MySQL connection
const db = mysql.createPool({
  host: "restaurantdb-server.mysql.database.azure.com",
  user: "rmsadmin",
  password: "Sheejal1@", // replace with your actual password
  database: "restaurantdb",
  port: 3306,
  ssl: { rejectUnauthorized: true },
  connectionLimit: 10,
});

// ✅ Admin Login Route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM admin_users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("❌ Query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const admin = results[0];

    bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
      if (err) {
        console.error("❌ Bcrypt error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // ✅ Successful login
      res.status(200).json({ message: "Login successful" });
    });
  });
});

module.exports = router;
