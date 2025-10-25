// routes/admin.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

// ✅ Admin login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  try {
    const [rows] = await db.query("SELECT * FROM admin_users WHERE username = ?", [username]);

    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid username or password" });

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch)
      return res.status(401).json({ error: "Invalid username or password" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;
