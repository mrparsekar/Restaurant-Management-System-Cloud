// src/admin/AdminOrders.js
import React, { useEffect, useState } from "react";
import "./AdminOrders.css";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingOrderId, setProcessingOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/orders`);
    const data = await res.json();

    if (res.ok && Array.isArray(data)) {
      console.log("✅ Fetched orders:", data);
      setOrders(data);
    } else {
      setError("Failed to fetch orders.");
      setOrders([]);
    }
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    setError("Failed to fetch orders.");
    setOrders([]);
  } finally {
    setLoading(false);
  }
};


  const getNextStatus = (currentStatus) => {
    const statusFlow = ["Pending", "Approved", "Preparing", "Ready", "Served"];
    const index = statusFlow.indexOf(currentStatus);
    return index >= 0 && index < statusFlow.length - 1
      ? statusFlow[index + 1]
      : null;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/orders/${orderId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStatus }),
        }
      );

      if (res.ok) {
        console.log(`✅ Status updated to ${newStatus} for Order ${orderId}`);
        fetchOrders();
      } else {
        alert("❌ Failed to update status");
      }
    } catch (err) {
      console.error("❌ Status update error:", err);
      alert("❌ Error updating order status");
    } finally {
      setProcessingOrderId(null);
    }
  };

  const markAsPaid = async (orderId) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/orders/${orderId}/pay`,
        {
          method: "POST",
        }
      );

      const data = await res.json();
      console.log("💰 Payment Response:", data);

      if (res.ok && data.success) {
        alert("✅ Order marked as paid!");
        fetchOrders();
      } else {
        alert("❌ Failed to mark as paid: " + (data?.error || "Unknown error"));
      }
    } catch (err) {
      console.error("❌ Payment error:", err);
      alert("❌ Payment failed (network/server error)");
    } finally {
      setProcessingOrderId(null);
    }
  };

  return (
    <div className="admin-orders">
      <h2>📋 Manage Orders</h2>

      {loading ? (
        <p>Loading orders...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : orders.length === 0 ? (
        <p>No orders available.</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Table No</th>
              <th>Items</th>
              <th>Status</th>
              <th>Time</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.order_status);
              const itemsFormatted =
                order.items?.map((item) => `${item.name} (x${item.quantity})`).join(", ") || "—";

              return (
                <tr key={order.order_id}>
                  <td>{order.order_id}</td>
                  <td>{order.customer_name}</td>
                  <td>{order.table_no}</td>
                  <td>{itemsFormatted}</td>
                  <td>{order.order_status}</td>
                  <td>{new Date(order.order_time).toLocaleString()}</td>
                  <td>₹{order.total_amount}</td>
                  <td>
                    {nextStatus ? (
                      <button
                        className="status-btn"
                        onClick={() => updateOrderStatus(order.order_id, nextStatus)}
                        disabled={processingOrderId === order.order_id}
                      >
                        Mark as {nextStatus}
                      </button>
                    ) : (
                      <span className="done-status">✅ Completed</span>
                    )}

                    {order.order_status === "Served" && (
                      <button
                        className="pay-btn"
                        onClick={() => markAsPaid(order.order_id)}
                        disabled={processingOrderId === order.order_id}
                      >
                        💰 Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminOrders;
