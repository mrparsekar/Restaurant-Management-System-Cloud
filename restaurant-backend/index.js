const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
const adminRoutes = require("./routes/adminRoutes"); // 👈 path to router file

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/admin", adminRoutes);

// ✅ Use MySQL connection pool
const db = mysql.createPool({
  host: "restaurantdb-server.mysql.database.azure.com",
  user: "rmsadmin",
  password: "Sheejal1@", // replace with your actual password
  database: "restaurantdb",
  port: 3306,
  ssl: {
    rejectUnauthorized: true, // Required for Azure SSL
  },
  connectionLimit: 10,
});


// ✅ Check DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL Database!");
  connection.release();
});

// ====================== ADMIN LOGIN ======================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const sql = "SELECT * FROM admin_users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Query error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const admin = results[0];

    bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
      if (err) {
        console.error("Bcrypt error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      res.status(200).json({ message: "Login successful" });
    });
  });
});

// ✅ Fetch menu items
app.get("/menu", (req, res) => {
  const query = "SELECT * FROM menu";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
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

// ✅ Admin: Fetch full order details (✅ FIXED ROUTE)
app.get("/api/admin/orders", async (req, res) => {
  try {
    // Fetch all orders with customer and payment details
    const [orders] = await db
      .promise()
      .query(
        `SELECT 
          o.order_id, 
          c.name AS customer_name, 
          c.table_no AS table_no, 
          o.order_status, 
          o.order_time, 
          p.total_amount
        FROM Orders o
        JOIN Customers c ON o.customer_id = c.customer_id
        LEFT JOIN Payments p ON o.order_id = p.order_id
        ORDER BY o.order_time DESC`
      );

    // Fetch all order items
    const [items] = await db
      .promise()
      .query(
        `SELECT 
          oi.order_id, 
          m.name AS item_name, 
          oi.quantity 
        FROM Order_Items oi 
        JOIN Menu m ON oi.item_id = m.item_id`
      );

    // Group items by order_id
    const itemsByOrder = {};
    items.forEach((item) => {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push({
        name: item.item_name,
        quantity: item.quantity,
      });
    });

    // Attach items to corresponding orders
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



app.post('/api/admin/orders/:orderId/pay', async (req, res) => {
  const orderId = req.params.orderId;

  try {
    // Step 1: Get order with joined customer and payment info
    const [orderRows] = await db.promise().query(
      `SELECT o.order_id, c.name AS customer_name, c.table_no, o.order_time, p.total_amount
       FROM Orders o
       JOIN Customers c ON o.customer_id = c.customer_id
       JOIN Payments p ON o.order_id = p.order_id
       WHERE o.order_id = ? AND o.order_status = 'Served'`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found or not served" });
    }

    const order = orderRows[0];

    // Step 2: Get order items
    const [itemsRows] = await db.promise().query(
      `SELECT m.name AS item_name, oi.quantity
       FROM Order_Items oi
       JOIN Menu m ON oi.item_id = m.item_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const itemsJSON = JSON.stringify(itemsRows); // Convert to JSON string for DB storage

    // Step 3: Insert into PaidOrders
    await db.promise().query(
      `INSERT INTO PaidOrders 
        (order_id, customer_name, table_no, items, total_amount, order_time) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        order.order_id,
        order.customer_name,
        order.table_no,
        itemsJSON,
        order.total_amount,
        order.order_time
      ]
    );

    // Step 4: Insert into OrderHistory
    await db.promise().query(
      `INSERT INTO OrderHistory 
        (order_id, customer_name, table_no, items, total_amount, status, paid_time) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        order.order_id,
        order.customer_name,
        order.table_no,
        itemsJSON,
        order.total_amount,
        "Paid"
      ]
    );

    // Step 5: Optionally delete or update order
    await db.promise().query("DELETE FROM Orders WHERE order_id = ?", [orderId]);

    res.json({ success: true, message: "Order marked as paid and moved to history." });
  } catch (err) {
    console.error("❌ Backend error while marking as paid:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Dashboard Stats API
app.get("/dashboard/stats", (req, res) => {
  const queries = {
    completedOrders: "SELECT COUNT(*) AS completedOrders FROM Orders WHERE order_status = 'Paid'",
    totalOrders: "SELECT COUNT(*) AS totalOrders FROM Orders",
    pendingOrders: "SELECT COUNT(*) AS pendingOrders FROM Orders WHERE order_status != 'Paid'",
    totalRevenue: "SELECT SUM(total_amount) AS totalRevenue FROM Payments",
    menuItemsCount: "SELECT COUNT(*) AS menuItemsCount FROM Menu",
    orderHistoryCount: "SELECT COUNT(*) AS orderHistoryCount FROM Order_History",
  };

  const results = {};
  let completedQueries = 0;
  const totalQueries = Object.keys(queries).length;

  const checkAndSend = () => {
    completedQueries++;
    if (completedQueries === totalQueries) {
      res.json(results);
    }
  };

  for (let key in queries) {
    db.query(queries[key], (err, result) => {
      if (err) {
        console.error(`Error fetching ${key}:`, err);
        results[key] = 0;
      } else {
        results[key] = Object.values(result[0])[0] || 0;
      }
      checkAndSend();
    });
  }
});

// Example Express.js route for fetching order history
app.get("/order-history", async (req, res) => {
  try {
    const [orders] = await db.promise().query("SELECT * FROM order_history ORDER BY paid_at DESC LIMIT 100");
    res.json(orders);
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route 1: Get all menu items (for Admin)
// Get all menu items
// ✅ Get all menu items
// Backend route — simple direct return
// Add new menu item
app.post("/menu", async (req, res) => {
  const { name, price, category, image } = req.body;
  try {
    await db.query(
      "INSERT INTO menu (name, price, category, image, in_stock) VALUES (?, ?, ?, ?, true)",
      [name, price, category, image]
    );
    res.status(201).json({ message: "Item added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// Edit a menu item
app.put("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, category, image } = req.body;
  try {
    await db.query(
      "UPDATE menu SET name = ?, price = ?, category = ?, image = ? WHERE item_id = ?",
      [name, price, category, image, id]
    );
    res.json({ message: "Item updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete a menu item
app.delete("/menu/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM menu WHERE item_id = ?", [id]);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Toggle in_stock status
app.put("/menu/:id/stock", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE menu SET in_stock = NOT in_stock WHERE item_id = ?", [id]);
    res.json({ message: "Stock status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update stock status" });
  }
});






// ✅ Serve images
app.use("/images", express.static("public/images"));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

