// backend/routes/adminMenuRoutes.js
const express = require("express");
const multer = require("multer");
const db = require("../db.js");
const { uploadToBlob, deleteFromBlob, generateSasUrl } = require("./blobServices.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/adminmenu/add
 * multipart/form-data (image optional)
 * fields: name, category, price, in_stock
 */
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { name, category, price, in_stock } = req.body;
    let blobName = null;

    // ✅ Upload image to Azure Blob (if any)
    if (req.file) {
      blobName = await uploadToBlob(req.file); // Returns blob name only
    }

    await db.query(
      "INSERT INTO menu (name, category, price, image, in_stock) VALUES (?, ?, ?, ?, ?)",
      [name, category, price, blobName, in_stock ?? 1]
    );

    res.status(200).json({ message: "Menu item added successfully" });
  } catch (err) {
    console.error("adminMenuRoutes.add error:", err);
    res.status(500).send("Server error while adding item");
  }
});

/**
 * GET /api/adminmenu/menu
 * returns all menu items (admin view)
 * generates temporary SAS URLs for private blob access
 */
router.get("/menu", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu ORDER BY item_id DESC");

    const items = rows.map((item) => {
      if (item.image) {
        // item.image now stores only blob name (not URL)
        try {
          item.image = generateSasUrl(item.image);
        } catch (e) {
          console.warn("SAS generation failed:", e.message);
        }
      }
      return item;
    });

    res.json(items);
  } catch (err) {
    console.error("adminMenuRoutes.menu error:", err);
    res.status(500).send("Server error fetching menu");
  }
});

/**
 * GET /api/adminmenu/public-menu
 * for customer menu — only in-stock items
 * also generates SAS URLs
 */
router.get("/public-menu", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu WHERE in_stock = 1 ORDER BY item_id DESC");

    const items = rows.map((item) => {
      if (item.image) {
        try {
          item.image = generateSasUrl(item.image);
        } catch (e) {
          console.warn("SAS generation failed:", e.message);
        }
      }
      return item;
    });

    res.json(items);
  } catch (err) {
    console.error("adminMenuRoutes.public-menu error:", err);
    res.status(500).send("Server error fetching public menu");
  }
});

/**
 * DELETE /api/adminmenu/delete/:id
 * deletes both database record and blob (if image exists)
 */
router.delete("/delete/:id", async (req, res) => {
  try {
    const [[item]] = await db.query("SELECT image FROM menu WHERE item_id = ?", [req.params.id]);
    if (item && item.image) {
      await deleteFromBlob(item.image); // blob name stored directly
    }

    await db.query("DELETE FROM menu WHERE item_id = ?", [req.params.id]);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("adminMenuRoutes.delete error:", err);
    res.status(500).send("Failed to delete item");
  }
});

/**
 * PUT /api/adminmenu/toggle-stock/:id
 * toggles stock status but keeps item visible in admin list
 */
router.put("/toggle-stock/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT in_stock FROM menu WHERE item_id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).send("Item not found");

    const currentStock = rows[0].in_stock;
    const newStock = currentStock ? 0 : 1;

    await db.query("UPDATE menu SET in_stock = ? WHERE item_id = ?", [newStock, req.params.id]);
    res.json({ message: "Stock status updated", in_stock: newStock });
  } catch (err) {
    console.error("adminMenuRoutes.toggle-stock error:", err);
    res.status(500).send("Error updating stock");
  }
});

module.exports = router;
