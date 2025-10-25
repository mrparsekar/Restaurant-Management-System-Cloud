// routes/adminAuth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

// Use the same DB pool from server.js
const db = require("../server");

// ✅ Admin Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Fetch admin user
    const [results] = await db.query(
      "SELECT * FROM admin_users WHERE username = ?",
      [username]
    );

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const admin = results[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // ✅ Successful login
    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
