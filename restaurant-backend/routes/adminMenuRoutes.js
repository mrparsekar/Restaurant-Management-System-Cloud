// backend/routes/adminMenuRoutes.js
const express = require("express");
const multer = require("multer");
const db = require("../db.js");
const { uploadToBlob, deleteFromBlob, generateSasUrl } = require("./blobServices.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /add
 * multipart/form-data (image optional)
 * fields: name, category, price, in_stock
 */
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

    res.status(200).json({ message: "Menu item added" });
  } catch (err) {
    console.error("adminMenuRoutes.add error:", err);
    res.status(500).send("Server error while adding item");
  }
});

/**
 * GET /
 * returns all in-stock menu items; generates SAS URLs if needed
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu WHERE in_stock = 1 ORDER BY category");
    const items = rows.map((item) => {
      if (item.image) {
        try {
          const blobName = item.image.split("/").pop().split("?")[0];
          item.image = generateSasUrl(blobName);
        } catch (e) {
          // keep stored URL if parsing fails
        }
      }
      return item;
    });
    res.json(items);
  } catch (err) {
    console.error("adminMenuRoutes.get error:", err);
    res.status(500).send("Server error while fetching menu");
  }
});

/**
 * DELETE /delete/:id
 * deletes database record AND blob (if present)
 */
router.delete("/delete/:id", async (req, res) => {
  try {
    const [[item]] = await db.query("SELECT image FROM menu WHERE item_id = ?", [req.params.id]);
    if (item && item.image) {
      const blobName = item.image.split("/").pop().split("?")[0];
      await deleteFromBlob(blobName);
    }

    await db.query("DELETE FROM menu WHERE item_id = ?", [req.params.id]);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("adminMenuRoutes.delete error:", err);
    res.status(500).send("Failed to delete item");
  }
});

/**
 * PUT /toggle-stock/:id
 * toggles stock availability
 */
router.put("/toggle-stock/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT in_stock FROM menu WHERE item_id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).send("Item not found");

    const current = rows[0].in_stock;
    const newStock = current ? 0 : 1;
    await db.query("UPDATE menu SET in_stock = ? WHERE item_id = ?", [newStock, req.params.id]);

    res.json({ message: "Stock updated", in_stock: newStock });
  } catch (err) {
    console.error("adminMenuRoutes.toggle-stock error:", err);
    res.status(500).send("Error updating stock");
  }
});

module.exports = router;
