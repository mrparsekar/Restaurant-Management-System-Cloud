import React, { useState, useEffect } from "react";
import "./Cart.css";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(storedCart);
  }, []);

  const removeFromCart = (index) => {
    const updatedCart = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleOrder = async () => {
    if (!customerName || !tableNumber) {
      alert("Please enter your name and table number.");
      return;
    }

    const orderData = {
      customerName,
      tableNumber,
      items: cartItems,
      totalPrice: getTotalPrice(),
      status: "Pending",
    };

    try {
      const response = await fetch("http://localhost:5000/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        alert("Order placed successfully!");
        localStorage.removeItem("cart");
        setCartItems([]);
        navigate("/orders");
      } else {
        alert("Failed to place order. Try again later.");
      }
    } catch (error) {
      console.error("Order submission error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="cart-container">
      <h2>Cart</h2>
      {cartItems.length > 0 ? (
        <div>
          {cartItems.map((item, index) => (
            <div key={index} className="cart-item">
              <img src={item.image} alt={item.name} className="cart-image" />
              <div className="cart-details">
                <h4>{item.name}</h4>
                <p>₹{item.price} x {item.quantity}</p>
                <button onClick={() => removeFromCart(index)} className="remove-btn">Remove</button>
              </div>
            </div>
          ))}
          <h3>Total: ₹{getTotalPrice()}</h3>
          <div className="order-form">
            <input
              type="text"
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="number"
              placeholder="Enter table number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="input-field"
              required
            />
            <button className="order-btn" onClick={handleOrder}>Submit Order</button>
          </div>
        </div>
      ) : (
        <p>Your cart is empty.</p>
      )}
    </div>
  );
};

export default Cart;
