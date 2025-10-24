// create-admin-user.js
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

// 🔐 Admin credentials
const username = "admin";
const plainPassword = "gourmethaven@123";

// Create connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",     // ← replace this
  password: "root", // ← replace this
  database: "restaurant_db",  // ← replace this
});

db.connect(async (err) => {
  if (err) {
    console.error("Connection error:", err);
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const query = "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)";
    db.query(query, [username, hashedPassword], (error, results) => {
      if (error) {
        console.error("Insert error:", error);
      } else {
        console.log("Admin user created successfully!");
      }
      db.end();
    });
  } catch (err) {
    console.error("Hashing error:", err);
    db.end();
  }
});
