import React, { useState, useEffect } from "react";
import "./Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customerName, setCustomerName] = useState(localStorage.getItem("customerName") || "");
  const [tableNumber, setTableNumber] = useState(localStorage.getItem("tableNumber") || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customerName && tableNumber) {
      fetchOrders();
    }
  }, []);

 const fetchOrders = async () => {
  if (!customerName || !tableNumber) {
    alert("Please enter your name and table number.");
    return;
  }

  localStorage.setItem("customerName", customerName);
  localStorage.setItem("tableNumber", tableNumber);

  setLoading(true);

  try {
    const response = await fetch(
      `https://restaurant-cloud-backend.azurewebsites.net/orders?name=${customerName}&table_no=${tableNumber}`
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      const groupedOrders = data.reduce((acc, order) => {
        if (!acc[order.order_id]) {
          acc[order.order_id] = {
            order_id: order.order_id,
            order_status: order.order_status,
            order_time: order.order_time,
            total_price: 0,
            items: []
          };
        }
        acc[order.order_id].items.push({
          item_name: order.item_name,
          quantity: order.quantity,
          price: order.price
        });
        acc[order.order_id].total_price += order.quantity * order.price;
        return acc;
      }, {});

      setOrders(Object.values(groupedOrders));
    } else {
      setOrders([]);
      alert("Failed to fetch orders: Invalid data format.");
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    alert("Error fetching orders. Try again later.");
    setOrders([]);
  }

  setLoading(false);
};


  return (
    <div className="orders-container">
      <h2>Your Orders</h2>

      <div className="input-group">
        <input
          type="text"
          placeholder="Enter your name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Enter table number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />
        <button onClick={fetchOrders}>Fetch Orders</button>
      </div>

      {loading && <div className="loading-indicator">Loading orders...</div>}

      {orders.length > 0 ? (
        <div>
          {orders.map((order) => (
            <div key={order.order_id} className="order-card">
              <h3>Order ID: {order.order_id}</h3>
              <p className="order-time">Time: {new Date(order.order_time).toLocaleString()}</p>
              <p className="order-status">Status: {order.order_status}</p>

              <h4>Ordered Items:</h4>
              <ul className="ordered-items">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.item_name} (x{item.quantity}) - ₹{(item.quantity * item.price).toFixed(2)}
                  </li>
                ))}
              </ul>

              <p className="total-price">Total Price: ₹{order.total_price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-orders-message">No orders found.</p>
      )}
    </div>
  );
};

export default Orders;
