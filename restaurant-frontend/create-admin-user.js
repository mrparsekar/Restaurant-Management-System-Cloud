// create-admin-user.js
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

// 🔐 Admin credentials
const username = "admin";
const plainPassword = "gourmethaven@123";

// ✅ Connect to Azure MySQL
const db = mysql.createConnection({
  host: "restaurantdb-server.mysql.database.azure.com", // Azure host
  user: "rmsadmin", // Azure username
  password: "Sheejal1@", // Azure password
  database: "restaurantdb", // Azure database name
  port: 3306,
  ssl: { rejectUnauthorized: true }, // Important for Azure SSL
});

db.connect(async (err) => {
  if (err) {
    console.error("❌ Database connection error:", err);
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const query = "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)";
    db.query(query, [username, hashedPassword], (error, results) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          console.log("⚠️ Admin user already exists.");
        } else {
          console.error("❌ Insert error:", error);
        }
      } else {
        console.log("✅ Admin user created successfully!");
      }
      db.end();
    });
  } catch (err) {
    console.error("❌ Hashing error:", err);
    db.end();
  }
});
