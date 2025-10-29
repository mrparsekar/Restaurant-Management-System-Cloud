require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./db"); // MySQL connection (mysql2/promise)
const adminMenuRoutes = require("./routes/adminMenuRoutes"); // ✅ keep as ES module or convert properly
// ❌ No need for blobService route directly — it’s already imported inside adminMenuRoutes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Helper: try multiple insert targets so we work with different DB schemas
async function tryInsertMultiple(insertFns = []) {
  for (const fn of insertFns) {
    try {
      await fn();
    } catch (err) {
      // ignore and continue — we'll still attempt other targets
      console.warn("Insert variant failed (continuing):", err.message);
    }
  }
}

/* ------------------------------
   Basic customer routes
   ------------------------------ */
// ✅ Admin Menu routes (includes blob upload/delete internally)
app.use("/api/adminmenu", adminMenuRoutes);

app.get("/", (req, res) => {
  res.send("✅ Restaurant Backend API is running successfully!");
});


// test
app.get("/test", (req, res) => res.send("Backend is running!"));

// menu for customers (lowercase 'menu' table - update if your DB uses different name)
app.get("/menu", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM menu WHERE in_stock = 1");
    res.json(results);
  } catch (err) {
    console.error("❌ Database error (menu):", err);
    res.status(500).json({ error: "Database error" });
  }
});

// place order
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
    await db.query("INSERT INTO Order_Items (order_id, item_id, quantity) VALUES ?", [orderItemsValues]);

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

// fetch customer orders
app.get("/orders", async (req, res) => {
  const { name, table_no } = req.query;
  if (!name || !table_no) return res.status(400).json({ error: "Missing parameters" });

  try {
    const [results] = await db.query(
      `SELECT o.order_id, o.order_status, o.order_time, oi.item_id, m.name AS item_name, 
              oi.quantity, m.price 
       FROM Orders o
       JOIN Customers c ON o.customer_id = c.customer_id
       JOIN Order_Items oi ON o.order_id = oi.order_id
       JOIN menu m ON oi.item_id = m.item_id
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

/* ------------------------------
   Admin auth
   ------------------------------ */
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  try {
    const [rows] = await db.query("SELECT * FROM admin_users WHERE username = ?", [username]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid username or password" });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid username or password" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ------------------------------
   Admin: Menu management (CRUD + toggle)
   ------------------------------ */

// get admin menu (full)
app.get("/api/admin/menu", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching menu:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// add item
 app.post("/api/admin/menu/add", async (req, res) => {
  const { name, category, price, image, in_stock } = req.body;
  try {
    await db.query(
      "INSERT INTO menu (name, category, price, image, in_stock) VALUES (?, ?, ?, ?, ?)",
      [name, category, price, image, in_stock ?? 1]
    );
    res.json({ message: "Item added successfully" });
  } catch (err) {
    console.error("❌ Error adding menu item:", err);
    res.status(500).json({ error: "Failed to add menu item" });
  }
});

// update item
app.put("/api/admin/menu/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, image, in_stock } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE menu SET name=?, category=?, price=?, image=?, in_stock=? WHERE item_id=?",
      [name, category, price, image, in_stock, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item updated successfully" });
  } catch (err) {
    console.error("❌ Error updating menu item:", err);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

// delete
app.delete("/api/admin/menu/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM menu WHERE item_id=?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting menu item:", err);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// toggle stock
app.put("/api/admin/menu/toggle-stock/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("UPDATE menu SET in_stock = NOT in_stock WHERE item_id=?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Stock status toggled" });
  } catch (err) {
    console.error("❌ Error toggling stock:", err);
    res.status(500).json({ error: "Failed to toggle stock" });
  }
});

/* ------------------------------
   Admin: Orders (listing + status update)
   ------------------------------ */

// admin orders (full details)
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
      SELECT oi.order_id, m.name AS item_name, oi.quantity
      FROM Order_Items oi
      JOIN menu m ON oi.item_id = m.item_id
    `);

    const itemsByOrder = {};
    items.forEach((item) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({ name: item.item_name, quantity: item.quantity });
    });

    const fullOrders = orders.map((order) => ({ ...order, items: itemsByOrder[order.order_id] || [] }));
    res.json(fullOrders);
  } catch (err) {
    console.error("❌ Database error (admin orders):", err);
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
});

// update order status
app.post("/api/admin/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;
  if (!id || !newStatus) return res.status(400).json({ error: "Missing order ID or status" });

  try {
    const [result] = await db.query("UPDATE Orders SET order_status = ? WHERE order_id = ?", [newStatus, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

/* ------------------------------
   Admin: Mark as Paid (robust)
   Endpoint: POST /api/admin/orders/:orderId/pay
   - Inserts record into history tables (if exist)
   - Updates Orders.order_status => 'Paid'
   ------------------------------ */
app.post("/api/admin/orders/:orderId/pay", async (req, res) => {
  const { orderId } = req.params;
  try {
    // 1) fetch order and payment
    const [orderRows] = await db.query(
      `SELECT o.order_id, o.order_status, o.order_time, c.name AS customer_name, c.table_no, p.total_amount
       FROM Orders o
       JOIN Customers c ON o.customer_id = c.customer_id
       LEFT JOIN Payments p ON o.order_id = p.order_id
       WHERE o.order_id = ?`,
      [orderId]
    );
    if (orderRows.length === 0) return res.status(404).json({ error: "Order not found" });
    const order = orderRows[0];

    // 2) fetch items
    const [itemsRows] = await db.query(
      `SELECT m.name AS item_name, oi.quantity
       FROM Order_Items oi
       JOIN menu m ON oi.item_id = m.item_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const itemsJSON = JSON.stringify(itemsRows);

    // 3) Try inserts into possible history tables (non-fatal)
    await tryInsertMultiple([
      // Order_History
      async () => {
        await db.query(
          `INSERT INTO Order_History (order_id, customer_name, table_no, items, order_status, order_time, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [order.order_id, order.customer_name, order.table_no, itemsJSON, "Paid", order.order_time, order.total_amount]
        );
      },
      // OrderHistory
      async () => {
        await db.query(
          `INSERT INTO OrderHistory (order_id, customer_name, table_no, items, total_amount, status, paid_time)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [order.order_id, order.customer_name, order.table_no, itemsJSON, order.total_amount, "Paid"]
        );
      },
      // PaidOrders
      async () => {
        await db.query(
          `INSERT INTO PaidOrders (order_id, customer_name, table_no, items, total_amount, order_time)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [order.order_id, order.customer_name, order.table_no, itemsJSON, order.total_amount, order.order_time]
        );
      },
    ]);

    // 4) Update Orders status to Paid
    await db.query("UPDATE Orders SET order_status = 'Paid' WHERE order_id = ?", [orderId]);

    res.json({ success: true, message: "Order marked as paid (history updated where possible)" });
  } catch (err) {
    console.error("❌ Error marking as paid:", err);
    res.status(500).json({ error: "Failed to mark order as paid" });
  }
});

/* ------------------------------
   Dashboard stats (two routes: /api/... and /...)
   ------------------------------ */
// ✅ ================= DASHBOARD STATS =================

// Compute stats helper function
async function computeDashboardStats() {
  // Adjust table names if needed (based on your actual DB)
  const results = {
    completedOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    menuItemsCount: 0,
    orderHistoryCount: 0,
  };

  try {
    // Using Order_History instead of PaidOrders since your DB likely has this table
    const [r1] = await db.query(
      "SELECT COUNT(*) AS completedOrders FROM Order_History"
    );
    const [r2] = await db.query(
      "SELECT COUNT(*) AS totalOrders FROM Orders"
    );
    const [r3] = await db.query(
      "SELECT COUNT(*) AS pendingOrders FROM Orders WHERE order_status != 'Paid'"
    );
    const [r4] = await db.query(
      "SELECT IFNULL(SUM(total_amount), 0) AS totalRevenue FROM payments"
    );
    const [r5] = await db.query(
      "SELECT COUNT(*) AS menuItemsCount FROM Menu"
    );
    const [r6] = await db.query(
      "SELECT COUNT(*) AS orderHistoryCount FROM Order_History"
    );

    results.completedOrders = r1[0]?.completedOrders || 0;
    results.totalOrders = r2[0]?.totalOrders || 0;
    results.pendingOrders = r3[0]?.pendingOrders || 0;
    results.totalRevenue = r4[0]?.totalRevenue || 0;
    results.menuItemsCount = r5[0]?.menuItemsCount || 0;
    results.orderHistoryCount = r6[0]?.orderHistoryCount || 0;
  } catch (err) {
    console.warn(
      "⚠️ Some dashboard queries failed (maybe table names differ):",
      err.message
    );
  }

  return results;
}

// Main API route used by frontend
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const stats = await computeDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error("❌ Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Alias for backward compatibility (in case frontend calls /dashboard/stats)
app.get("/dashboard/stats", async (req, res) => {
  try {
    const stats = await computeDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error("❌ Error fetching dashboard stats (alias):", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

/* ------------------------------
   Order history endpoints (alias both)
------------------------------ */
app.get("/api/order-history", async (req, res) => {
  try {
    // Try fetching with paid_at (correct column)
    const [rows] = await db.query(`
      SELECT 
        history_id,
        order_id,
        customer_name,
        table_no,
        order_time,
        items,
        total_amount,
        paid_at,
        order_status
      FROM Order_History
      ORDER BY paid_at DESC
      LIMIT 200
    `);

    if (rows.length === 0) {
      return res.json({ message: "No order history found." });
    }

    res.json(rows);
  } catch (err) {
    console.warn("⚠️ Error fetching from Order_History:", err.message);
    try {
      // fallback to alternative table name if needed
      const [rows2] = await db.query(`
        SELECT 
          history_id,
          order_id,
          customer_name,
          table_no,
          order_time,
          items,
          total_amount,
          paid_at,
          order_status
        FROM OrderHistory
        ORDER BY paid_at DESC
        LIMIT 200
      `);

      if (rows2.length === 0) {
        return res.json({ message: "No order history found." });
      }

      res.json(rows2);
    } catch (err2) {
      console.error("❌ Error fetching order history:", err2);
      res.status(500).json({ error: "Failed to fetch order history" });
    }
  }
});

app.get("/order-history", (req, res) => res.redirect(307, "/api/order-history"));


/* ------------------------------
   Static images
   ------------------------------ */
app.use("/images", express.static(path.join(__dirname, "screenshots")));

/* ------------------------------
   Start server
   ------------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
