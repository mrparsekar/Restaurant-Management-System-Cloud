// src/admin/AdminMenu.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminMenu.css";

const AdminMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "Starters",
    image: ""
  });
  const [editItem, setEditItem] = useState(null);
  const backendURL = process.env.REACT_APP_BACKEND_URL;
  console.log("🔍 Backend URL in use:", backendURL);


  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${backendURL}/api/admin/menu`);
      setMenuItems(res.data || []);
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      setMenuItems([]);
    }
  };

  const handleToggleStock = async (itemId) => {
    try {
      // Correct endpoint is /api/admin/menu/toggle-stock/:id
      await axios.put(`${backendURL}/api/admin/menu/toggle-stock/${itemId}`);
      await fetchMenuItems();
    } catch (err) {
      console.error("Error updating stock:", err);
      alert("Failed to toggle stock. Check console for details.");
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      // coerce price to number
      const payload = { ...newItem, price: Number(newItem.price), in_stock: 1 };
      await axios.post(`${backendURL}/api/admin/menu/add`, payload);
      setShowAddForm(false);
      setNewItem({ name: "", price: "", category: "Starters", image: "" });
      await fetchMenuItems();
    } catch (err) {
      console.error("Failed to add item:", err);
      alert("Failed to add item. Check console for details.");
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await axios.delete(`${backendURL}/api/admin/menu/delete/${itemId}`);
      await fetchMenuItems();
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item. Check console for details.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      const payload = {
        name: editItem.name,
        price: Number(editItem.price),
        category: editItem.category,
        image: editItem.image,
        in_stock: editItem.in_stock ?? 1,
      };
      await axios.put(`${backendURL}/api/admin/menu/update/${editItem.item_id}`, payload);
      setEditItem(null);
      await fetchMenuItems();
    } catch (err) {
      console.error("Failed to update item:", err);
      alert("Failed to update item. Check console for details.");
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="admin-menu-container">
      <h2 className="admin-menu-heading">Manage Menu</h2>

      <button className="add-item-btn" onClick={() => setShowAddForm(true)}>
        + Add New Item
      </button>

      {showAddForm && (
        <form className="add-form" onSubmit={handleAddItem}>
          <input
            type="text"
            placeholder="Item Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Price"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            required
          />
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
          >
            <option value="Starters">Starters</option>
            <option value="Main Course">Main Course</option>
            <option value="Desserts">Desserts</option>
            <option value="Drinks">Drinks</option>
            <option value="Beverages">Beverages</option>
          </select>
          <input
            type="text"
            placeholder="Image URL"
            value={newItem.image}
            onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
          />
          <div className="form-buttons">
            <button type="submit" className="submit-btn">Add Item</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="cancel-btn">Cancel</button>
          </div>
        </form>
      )}

      {editItem && (
        <form className="add-form" onSubmit={handleEditSubmit}>
          <input
            type="text"
            value={editItem.name}
            onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
            required
          />
          <input
            type="number"
            value={editItem.price}
            onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
            required
          />
          <select
            value={editItem.category}
            onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
          >
            <option value="Starters">Starters</option>
            <option value="Main Course">Main Course</option>
            <option value="Desserts">Desserts</option>
            <option value="Drinks">Drinks</option>
            <option value="Beverages">Beverages</option>
          </select>
          <input
            type="text"
            placeholder="Image URL"
            value={editItem.image}
            onChange={(e) => setEditItem({ ...editItem, image: e.target.value })}
          />
          <div className="form-buttons">
            <button type="submit" className="submit-btn">Update</button>
            <button type="button" onClick={() => setEditItem(null)} className="cancel-btn">Cancel</button>
          </div>
        </form>
      )}

      <div className="filter-controls">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="category-select"
        >
          <option value="All">All Categories</option>
          <option value="Starters">Starters</option>
          <option value="Main Course">Main Course</option>
          <option value="Desserts">Desserts</option>
          <option value="Drinks">Drinks</option>
          <option value="Beverages">Beverages</option>
        </select>
      </div>

      <div className="menu-items-grid">
        {filteredItems.map((item) => (
          <div key={item.item_id} className="menu-item-card">
            <img
              src={item.image || "https://via.placeholder.com/150x100?text=No+Image"}
              alt={item.name}
              className="menu-item-image"
            />
            <div>
              <h4 className="menu-item-name">{item.name}</h4>
              <p>₹{item.price} | {item.category}</p>
              {!item.in_stock && <span className="out-of-stock-label">Out of Stock</span>}
            </div>
            <div className="button-group">
              <button
                onClick={() => handleToggleStock(item.item_id)}
                className={`stock-toggle-btn ${!item.in_stock ? "in-stock" : "out-stock"}`}
              >
                {item.in_stock ? "Mark Out of Stock" : "Mark In Stock"}
              </button>
              <button onClick={() => setEditItem(item)} className="edit-btn">Edit</button>
              <button onClick={() => handleDelete(item.item_id)} className="delete-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMenu;
