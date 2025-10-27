import React, { useState, useEffect } from "react";
import "./OrderHistory.css";

const OrderHistory = () => {
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/orders`);
        const data = await response.json();

        if (Array.isArray(data)) {
          setOrderHistory(data);
        } else {
          setMessage(data.message || "No order history found.");
        }
      } catch (error) {
        console.error("Error fetching order history:", error);
        setMessage("Failed to load order history.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderHistory();
  }, []);

  if (loading) {
    return <div className="loading-message">Loading order history...</div>;
  }

  if (orderHistory.length === 0) {
    return <div className="no-record-message">{message || "No order history found."}</div>;
  }

  return (
    <div className="order-history-wrapper">
      <h2 className="order-history-heading">Order History</h2>
      <div className="order-history-scroll">
        <table className="order-history-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Table No</th>
              <th>Order Time</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Paid At</th>
              <th>Order Status</th>
            </tr>
          </thead>
          <tbody>
            {orderHistory.map((order) => (
              <tr key={order.history_id}>
                <td>{order.order_id}</td>
                <td>{order.customer_name}</td>
                <td>{order.table_no}</td>
                <td>{order.order_time ? new Date(order.order_time).toLocaleString() : "N/A"}</td>
                <td className="items-cell">{order.items}</td>
                <td>₹{order.total_amount}</td>
                <td>{order.paid_at ? new Date(order.paid_at).toLocaleString() : "N/A"}</td>
                <td className="order-status">{order.order_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;
