// routes/adminRoutes.js
const express = require("express");
const router = express.Router();

// Import the shared DB pool from server.js
const db = require("../server"); // server.js must export the MySQL pool

// ✅ Mark order as Paid
router.post("/orders/:orderId/pay", async (req, res) => {
  const orderId = req.params.orderId;

  try {
    // Fetch order details
    const [results] = await db
      .promise()
      .query(
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

    // Insert into Order_History
    await db
      .promise()
      .query(
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

    // Update order status
    await db
      .promise()
      .query("UPDATE Orders SET order_status = 'Paid' WHERE order_id = ?", [orderId]);

    res.json({ success: true, message: "Order marked as Paid and moved to history." });
  } catch (err) {
    console.error("❌ Error marking order as paid:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
