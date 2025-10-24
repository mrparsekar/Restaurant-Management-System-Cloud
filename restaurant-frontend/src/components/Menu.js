import React, { useEffect, useState } from "react";
import "./Menu.css"; // Ensure this file exists

const categories = [
  "All", "Starters", "Main Course", "Desserts", "Drinks & Beverages", "Cocktails", "Mocktails"
];

const Menu = ({ setCartCount }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // Fetch menu items
    fetch("http://localhost:5000/menu")
      .then((res) => res.json())
      .then((data) => {
        console.log("Menu data fetched:", data);
        setMenuItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });

    // Load cart from localStorage only on mount
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(storedCart);
    setCartCount(storedCart.reduce((sum, item) => sum + item.quantity, 0));
  }, [setCartCount]);

  const updateCart = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCartCount(updatedCart.reduce((sum, item) => sum + item.quantity, 0));
  };

  const handleCartChange = (item, action) => {
    let updatedCart = [...cart];
    const itemIndex = updatedCart.findIndex(cartItem => cartItem.item_id === item.item_id);

    if (action === "add") {
      if (itemIndex !== -1) {
        updatedCart[itemIndex].quantity += 1;
      } else {
        updatedCart.push({ ...item, quantity: 1 });
      }
    } else if (action === "increase") {
      updatedCart[itemIndex].quantity += 1;
    } else if (action === "decrease") {
      updatedCart[itemIndex].quantity -= 1;
      if (updatedCart[itemIndex].quantity === 0) {
        updatedCart = updatedCart.filter(cartItem => cartItem.item_id !== item.item_id);
      }
    }

    updateCart(updatedCart);
  };

  const filteredItems = selectedCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <div className="menu-container">
      <h2 className="menu-title">Menu</h2>

      {/* Category Buttons */}
      <div className="category-container">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? "active" : ""}`}
            onClick={() => setSelectedCategory(category)}
            disabled={loading}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading ? (
        <p className="loading-text">Loading menu...</p>
      ) : filteredItems.length === 0 ? (
        <p className="no-items">No items found in this category.</p>
      ) : (
        <div className="menu-grid">
          {filteredItems.map((item) => {
            const cartItem = cart.find(cartItem => cartItem.item_id === item.item_id);

            return (
              <div key={item.item_id} className="menu-card">
                <img src={item.image} alt={item.name} className="menu-image" />
                <h3 className="item-name">{item.name}</h3>
                <p className="item-category"><strong>Category:</strong> {item.category}</p>
                <p className="item-price"><strong>Price:</strong> ₹{item.price}</p>

                {item.in_stock ? (
                  cartItem ? (
                    <div className="quantity-controls">
                      <button onClick={() => handleCartChange(item, "decrease")}>-</button>
                      <span>{cartItem.quantity}</span>
                      <button onClick={() => handleCartChange(item, "increase")}>+</button>
                    </div>
                  ) : (
                    <button className="add-to-cart-btn" onClick={() => handleCartChange(item, "add")}>Add to Cart</button>
                  )
                ) : (
                  <div className="out-of-stock-label">Out of Stock</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Menu;
