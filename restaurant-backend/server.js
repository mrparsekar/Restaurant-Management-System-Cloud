require('dotenv').config(); // Load env variables
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const path = require("path");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  ssl: { rejectUnauthorized: true },
  connectionLimit: 10,
});

// Check DB connection
db.getConnection()
  .then(() => console.log("✅ Connected to MySQL Database"))
  .catch(err => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

// ✅ Test route
app.get("/test", (req, res) => {
  res.send("Backend is running!");
});

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Restaurant Backend is running!");
});

// ✅ Fetch menu items
app.get("/menu", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM menu WHERE in_stock = 1");
    res.json(results);
  } catch (err) {
    console.error("❌ Database error while fetching menu:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Place an order
app.post("/orders", async (req, res) => {
  const { customerName, tableNumber, items, totalPrice } = req.body;

  if (!customerName || !tableNumber || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data." });
  }

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

    const orderItemsValues = items.map(item => [orderId, item.item_id, item.quantity]);
    await db.query(
      "INSERT INTO Order_Items (order_id, item_id, quantity) VALUES ?",
      [orderItemsValues]
    );

    await db.query(
      "INSERT INTO Payments (order_id, total_amount, payment_status, payment_time) VALUES (?, ?, 'Pending', NOW())",
      [orderId, totalPrice]
    );

    res.json({ message: "Order placed successfully!" });
  } catch (err) {
    console.error("❌ Database error while placing order:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Fetch customer orders
app.get("/orders", async (req, res) => {
  const { name, table_no } = req.query;

  if (!name || !table_no) {
    return res.status(400).json({ error: "Customer name and table number are required" });
  }

  try {
    const [results] = await db.query(
      `SELECT o.order_id, o.order_status, o.order_time, oi.item_id, m.name AS item_name, 
              oi.quantity, m.price 
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
    console.error("❌ Database error while fetching orders:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Admin routes


// ✅ Serve static images
app.use("/images", express.static(path.join(__dirname, "screenshots")));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = db;
