require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/test", (req, res) => res.send("Backend is running!"));

// ✅ Fetch menu items (for customers)
app.get("/menu", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM Menu WHERE in_stock = 1");
    res.json(results);
  } catch (err) {
    console.error("❌ Database error (menu):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Place an order
app.post("/orders", async (req, res) => {
  const { customerName, tableNumber, items, totalPrice } = req.body;

  if (!customerName || !tableNumber || !items?.length) {
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

    const orderItemsValues = items.map((i) => [orderId, i.item_id, i.quantity]);
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
    console.error("❌ Database error (orders):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Fetch customer orders
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
    console.error("❌ Database error (fetch orders):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ ================= ADMIN AUTH =================
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  try {
    const [rows] = await db.query("SELECT * FROM admin_users WHERE username = ?", [
      username,
    ]);

    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid username or password" });

    const validPassword = await bcrypt.compare(password, rows[0].password_hash);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid username or password" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ ================= ADMIN MENU MANAGEMENT =================
app.get("/api/admin/menu", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM Menu");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching menu:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

app.post("/api/admin/menu/add", async (req, res) => {
  const { name, category, price, image, in_stock } = req.body;
  try {
    await db.query(
      "INSERT INTO Menu (name, category, price, image, in_stock) VALUES (?, ?, ?, ?, ?)",
      [name, category, price, image, in_stock ?? 1]
    );
    res.json({ message: "Item added successfully" });
  } catch (err) {
    console.error("❌ Error adding menu item:", err);
    res.status(500).json({ error: "Failed to add menu item" });
  }
});

app.put("/api/admin/menu/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, image, in_stock } = req.body;
  try {
    await db.query(
      "UPDATE Menu SET name=?, category=?, price=?, image=?, in_stock=? WHERE item_id=?",
      [name, category, price, image, in_stock, id]
    );
    res.json({ message: "Item updated successfully" });
  } catch (err) {
    console.error("❌ Error updating menu item:", err);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

app.delete("/api/admin/menu/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM Menu WHERE item_id=?", [id]);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting menu item:", err);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

app.put("/api/admin/menu/toggle-stock/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE Menu SET in_stock = NOT in_stock WHERE item_id=?", [id]);
    res.json({ message: "Stock status toggled" });
  } catch (err) {
    console.error("❌ Error toggling stock:", err);
    res.status(500).json({ error: "Failed to toggle stock" });
  }
});

// ✅ ================= ADMIN ORDERS =================
app.get("/api/admin/orders", async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT 
        o.order_id, 
        c.name AS customer_name, 
        c.table_no, 
        o.order_status, 
        o.order_time, 
        p.total_amount
      FROM Orders o
      JOIN Customers c ON o.customer_id = c.customer_id
      LEFT JOIN Payments p ON o.order_id = p.order_id
      ORDER BY o.order_time DESC
    `);

    const [items] = await db.query(`
      SELECT 
        oi.order_id, 
        m.name AS item_name, 
        oi.quantity 
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
    console.error("❌ Database error (admin orders):", err);
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
});

app.post("/api/admin/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

  if (!id || !newStatus)
    return res.status(400).json({ error: "Missing order ID or status" });

  try {
    const [result] = await db.query(
      "UPDATE Orders SET order_status = ? WHERE order_id = ?",
      [newStatus, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Order not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ✅ ================= DASHBOARD STATS =================
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [completedOrders] = await db.query(
      "SELECT COUNT(*) AS completedOrders FROM PaidOrders"
    );
    const [totalOrders] = await db.query(
      "SELECT COUNT(*) AS totalOrders FROM Orders"
    );
    const [pendingOrders] = await db.query(
      "SELECT COUNT(*) AS pendingOrders FROM Orders WHERE order_status != 'Paid'"
    );
    const [totalRevenue] = await db.query(
      "SELECT SUM(total_amount) AS totalRevenue FROM Payments"
    );
    const [menuItemsCount] = await db.query(
      "SELECT COUNT(*) AS menuItemsCount FROM Menu"
    );
    const [orderHistoryCount] = await db.query(
      "SELECT COUNT(*) AS orderHistoryCount FROM OrderHistory"
    );

    res.json({
      completedOrders: completedOrders[0].completedOrders || 0,
      totalOrders: totalOrders[0].totalOrders || 0,
      pendingOrders: pendingOrders[0].pendingOrders || 0,
      totalRevenue: totalRevenue[0].totalRevenue || 0,
      menuItemsCount: menuItemsCount[0].menuItemsCount || 0,
      orderHistoryCount: orderHistoryCount[0].orderHistoryCount || 0,
    });
  } catch (err) {
    console.error("❌ Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ✅ Serve images
app.use("/images", express.static(path.join(__dirname, "screenshots")));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
