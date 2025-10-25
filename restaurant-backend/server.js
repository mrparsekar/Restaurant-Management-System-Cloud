require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/test", (req, res) => res.send("Backend is running!"));

// ✅ Customer menu route
app.get("/menu", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM menu WHERE in_stock = 1");
    res.json(results);
  } catch (err) {
    console.error("❌ DB error (menu):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Order placement route
app.post("/orders", async (req, res) => {
  const { customerName, tableNumber, items, totalPrice } = req.body;
  if (!customerName || !tableNumber || !items?.length)
    return res.status(400).json({ error: "Invalid order data." });

  try {
    const [customerResult] = await db.query(
      "INSERT INTO Customers (name, table_no) VALUES (?, ?)",
      [customerName, tableNumber]
    );
    const customerId = customerResult.insertId;

    const [orderResult] = await db.query(
      "INSERT INTO Orders (customer_id, order_status, order_time) VALUES (?, 'Pending', NOW())",
      [customerId]
    );
    const orderId = orderResult.insertId;

    const orderItems = items.map((i) => [orderId, i.item_id, i.quantity]);
    await db.query("INSERT INTO Order_Items (order_id, item_id, quantity) VALUES ?", [orderItems]);

    await db.query(
      "INSERT INTO Payments (order_id, total_amount, payment_status, payment_time) VALUES (?, ?, 'Pending', NOW())",
      [orderId, totalPrice]
    );

    res.json({ message: "Order placed successfully!" });
  } catch (err) {
    console.error("❌ DB error (orders):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Fetch orders
app.get("/orders", async (req, res) => {
  const { name, table_no } = req.query;
  if (!name || !table_no)
    return res.status(400).json({ error: "Missing parameters" });

  try {
    const [results] = await db.query(
      `SELECT o.order_id, o.order_status, o.order_time, m.name AS item_name, oi.quantity, m.price
       FROM Orders o
       JOIN Customers c ON o.customer_id = c.customer_id
       JOIN Order_Items oi ON o.order_id = oi.order_id
       JOIN Menu m ON oi.item_id = m.item_id
       WHERE c.name = ? AND c.table_no = ?
       ORDER BY o.order_time DESC`,
      [name, table_no]
    );
    res.json(results);
  } catch (err) {
    console.error("❌ DB error (fetch orders):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Serve images
app.use("/images", express.static(path.join(__dirname, "screenshots")));

// ✅ Start server
const PORT = process.env.PORT || 5000;

try {
  const adminRoutes = require("./routes/admin");
  app.use("/api/admin", adminRoutes);
  console.log("✅ Admin routes enabled");
} catch (err) {
  console.error("⚠️ Admin routes failed to load:", err.message);
}


app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
