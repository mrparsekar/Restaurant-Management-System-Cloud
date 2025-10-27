// routes/adminMenuRoutes.js
import express from "express";
import multer from "multer";
import { uploadToBlob } from "./blobServices.js";
import db from "../db.js";

const router = express.Router();
const upload = multer(); // in-memory upload (no local file save)

// ✅ Fetch all menu items
router.get("/menu", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching menu:", err);
    res.status(500).send("Server error");
  }
});

// ✅ Add new menu item (with optional image upload)
router.post("/menu/add", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price } = req.body;
    let imageUrl = null;

    // If image file present, upload to Azure Blob
    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      imageUrl = await uploadToBlob(req.file.buffer, fileName, req.file.mimetype);
    }

    const [result] = await db.query(
      "INSERT INTO menu (name, category, price, image, in_stock) VALUES (?, ?, ?, ?, 1)",
      [name, category, price, imageUrl]
    );

    res.json({ message: "Item added", itemId: result.insertId });
  } catch (err) {
    console.error("Error adding item:", err);
    res.status(500).send("Failed to add item");
  }
});

// ✅ Update existing menu item
router.put("/menu/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price } = req.body;
    let imageUrl = req.body.image || null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      imageUrl = await uploadToBlob(req.file.buffer, fileName, req.file.mimetype);
    }

    await db.query(
      "UPDATE menu SET name = ?, category = ?, price = ?, image = ? WHERE item_id = ?",
      [name, category, price, imageUrl, req.params.id]
    );

    res.json({ message: "Item updated" });
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).send("Failed to update item");
  }
});

// ✅ Toggle stock availability
router.put("/menu/toggle-stock/:id", async (req, res) => {
  try {
    await db.query("UPDATE menu SET in_stock = NOT in_stock WHERE item_id = ?", [req.params.id]);
    res.json({ message: "Stock toggled" });
  } catch (err) {
    console.error("Error toggling stock:", err);
    res.status(500).send("Failed to toggle stock");
  }
});

// ✅ Delete menu item
router.delete("/menu/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM menu WHERE item_id = ?", [req.params.id]);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).send("Failed to delete item");
  }
});

export default router;
