// backend/routes/adminMenuRoutes.js
const express = require("express");
const multer = require("multer");
const db = require("../db.js");
const { uploadToBlob, deleteFromBlob, generateSasUrl } = require("./blobServices.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Add new menu item
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price, in_stock } = req.body;
    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadToBlob(req.file);
    }

    await db.query(
      "INSERT INTO menu (name, category, price, image, in_stock) VALUES (?, ?, ?, ?, ?)",
      [name, category, price, imageUrl, in_stock ?? 1]
    );

    res.status(200).json({ message: "✅ Menu item added successfully!" });
  } catch (err) {
    console.error("❌ Error adding menu item:", err);
    res.status(500).send("Server error while adding item");
  }
});

// ✅ Get all menu items
router.get("/menu", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu");

    const itemsWithSas = rows.map((item) => {
      if (item.image) {
        const blobName = item.image.split("/").pop();
        item.image = generateSasUrl(blobName);
      }
      return item;
    });

    res.json(itemsWithSas);
  } catch (err) {
    console.error("❌ Error fetching menu:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Delete menu item
router.delete("/delete/:id", async (req, res) => {
  try {
    const [[item]] = await db.query("SELECT image FROM menu WHERE item_id = ?", [req.params.id]);

    if (item && item.image) {
      const blobName = item.image.split("/").pop();
      await deleteFromBlob(blobName);
    }

    await db.query("DELETE FROM menu WHERE item_id = ?", [req.params.id]);
    res.json({ message: "🗑️ Item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting item:", err);
    res.status(500).send("Failed to delete item");
  }
});

// ✅ Update stock availability
router.put("/toggle-stock/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT in_stock FROM menu WHERE item_id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).send("Item not found");

    const currentStock = rows[0].in_stock;
    const newStock = currentStock ? 0 : 1;

    await db.query("UPDATE menu SET in_stock = ? WHERE item_id = ?", [newStock, req.params.id]);
    res.json({ message: "✅ Stock status updated" });
  } catch (err) {
    console.error("❌ Error updating stock:", err);
    res.status(500).send("Error updating stock");
  }
});

module.exports = router;
