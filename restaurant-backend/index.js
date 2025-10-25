const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/admin", adminRoutes);

// ✅ Use MySQL connection pool (Azure SSL required)
const db = mysql.createPool({
  host: "restaurantdb-server.mysql.database.azure.com",
  user: "rmsadmin",
  password: "Sheejal1@", // replace with your actual password
  database: "restaurantdb",
  port: 3306,
  ssl: { rejectUnauthorized: true },
  connectionLimit: 10,
});

// ✅ Check DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL Database!");
  connection.release();
});

// ✅ Root route (to confirm server running)
app.get("/", (req, res) => {
  res.send("Restaurant Backend is running!");
});


// ✅ Fetch menu items — FIXED VERSION (with in_stock filter)
app.get("/menu", (req, res) => {
  const query = "SELECT * FROM menu WHERE in_stock = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Database error while fetching menu:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ✅ Place an order
app.post("/orders", (req, res) => {
  const { customerName, tableNumber, items, totalPrice } = req.body;

  if (!customerName || !tableNumber || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data." });
  }

  const customerQuery = "INSERT INTO Customers (name, table_no) VALUES (?, ?)";
  db.query(customerQuery, [customerName, tableNumber], (err, result) => {
    if (err) {
      console.error("Error inserting customer:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const customerId = result.insertId;
    const orderQuery = "INSERT INTO Orders (customer_id, order_status, order_time) VALUES (?, 'Pending', NOW())";

    db.query(orderQuery, [customerId], (err, result) => {
      if (err) {
        console.error("Error inserting order:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const orderId = result.insertId;
      const orderItemsQuery = "INSERT INTO Order_Items (order_id, item_id, quantity) VALUES ?";
      const orderItemsValues = items.map(item => [orderId, item.item_id, item.quantity]);

      db.query(orderItemsQuery, [orderItemsValues], (err) => {
        if (err) {
          console.error("Error inserting order items:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const paymentQuery = "INSERT INTO Payments (order_id, total_amount, payment_status, payment_time) VALUES (?, ?, 'Pending', NOW())";
        db.query(paymentQuery, [orderId, totalPrice], (err) => {
          if (err) {
            console.error("Error inserting payment:", err);
            return res.status(500).json({ error: "Database error" });
          }

          res.json({ message: "Order placed successfully!" });
        });
      });
    });
  });
});

// ✅ Fetch customer orders
app.get("/orders", (req, res) => {
  const { name, table_no } = req.query;

  if (!name || !table_no) {
    return res.status(400).json({ error: "Customer name and table number are required" });
  }

  const query = `
    SELECT o.order_id, o.order_status, o.order_time, oi.item_id, m.name AS item_name, 
           oi.quantity, m.price 
    FROM Orders o
    JOIN Customers c ON o.customer_id = c.customer_id
    JOIN Order_Items oi ON o.order_id = oi.order_id
    JOIN Menu m ON oi.item_id = m.item_id
    WHERE c.name = ? AND c.table_no = ?
    ORDER BY o.order_time DESC
  `;

  db.query(query, [name, table_no], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});

// ✅ Admin orders and status update endpoints
app.get("/api/admin/orders", async (req, res) => {
  try {
    const [orders] = await db.promise().query(`
      SELECT 
        o.order_id, 
        c.name AS customer_name, 
        c.table_no AS table_no, 
        o.order_status, 
        o.order_time, 
        p.total_amount
      FROM Orders o
      JOIN Customers c ON o.customer_id = c.customer_id
      LEFT JOIN Payments p ON o.order_id = p.order_id
      ORDER BY o.order_time DESC
    `);

    const [items] = await db.promise().query(`
      SELECT oi.order_id, m.name AS item_name, oi.quantity 
      FROM Order_Items oi 
      JOIN Menu m ON oi.item_id = m.item_id
    `);

    const itemsByOrder = {};
    items.forEach((item) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        name: item.item_name,
        quantity: item.quantity,
      });
    });

    const fullOrders = orders.map((order) => ({
      ...order,
      items: itemsByOrder[order.order_id] || [],
    }));

    res.json(fullOrders);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ✅ Update order status
app.post("/api/admin/orders/:id/status", (req, res) => {
  const orderId = req.params.id;
  const { newStatus } = req.body;

  if (!orderId || !newStatus) {
    return res.status(400).json({ error: "Missing order ID or new status" });
  }

  const query = `UPDATE Orders SET order_status = ? WHERE order_id = ?`;
  db.query(query, [newStatus, orderId], (err, result) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).json({ error: "Failed to update status" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  });
});

// ✅ Serve images folder
app.use("/images", express.static("public/images"));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
