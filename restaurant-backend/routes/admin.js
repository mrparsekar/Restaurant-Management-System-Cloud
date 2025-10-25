// routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

// Import DB pool from server.js
const db = require("../server");

// ✅ Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const [results] = await db.query(
      "SELECT * FROM admin_users WHERE username = ?",
      [username]
    );

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

// ✅ Mark order as Paid
router.post("/orders/:orderId/pay", async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const [results] = await db.query(
      `SELECT 
        o.order_id,
        c.name AS customer_name,
        c.table_no,
        GROUP_CONCAT(CONCAT(m.name, ' (x', oi.quantity, ')') SEPARATOR ', ') AS items,
        o.order_status,
        o.order_time,
        p.total_amount
      FROM Orders o
      JOIN Customers c ON o.customer_id = c.customer_id
      JOIN Order_Items oi ON o.order_id = oi.order_id
      JOIN Menu m ON oi.item_id = m.item_id
      LEFT JOIN Payments p ON o.order_id = p.order_id
      WHERE o.order_id = ?
      GROUP BY o.order_id, c.name, c.table_no, o.order_status, o.order_time, p.total_amount`,
      [orderId]
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = results[0];

    await db.query(
      `INSERT INTO Order_History 
        (order_id, customer_name, table_no, items, order_status, order_time, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order.order_id,
        order.customer_name,
        order.table_no,
        order.items,
        "Paid",
        order.order_time,
        order.total_amount,
      ]
    );

    await db.query("UPDATE Orders SET order_status = 'Paid' WHERE order_id = ?", [orderId]);

    res.json({ success: true, message: "Order marked as Paid and moved to history." });
  } catch (err) {
    console.error("❌ Error marking order as paid:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
