router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("🟡 Login attempt:", username); // <--- Add this

  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  try {
    const [rows] = await db.query("SELECT * FROM admin_users WHERE username = ?", [username]);
    console.log("🟢 DB rows:", rows.length); // <--- Add this

    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid username or password" });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    console.log("🟣 Password match:", match); // <--- Add this

    if (!match)
      return res.status(401).json({ error: "Invalid username or password" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
