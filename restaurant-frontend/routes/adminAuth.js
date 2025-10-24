const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

// Create MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "restaurant_db",
});

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM admin_users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const admin = results[0];

    bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
      if (err) {
        console.error("Bcrypt error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Successful login
      res.status(200).json({ message: "Login successful" });
    });
  });
});

module.exports = router;
