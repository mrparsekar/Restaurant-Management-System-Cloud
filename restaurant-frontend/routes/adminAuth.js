const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../server"); // import the already created pool from server.js

// ✅ Admin Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [results] = await db.query("SELECT * FROM admin_users WHERE username = ?", [username]);

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const admin = results[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
