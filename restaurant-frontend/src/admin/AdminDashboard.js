// src/admin/AdminDashboard.js
import React, { useEffect, useState } from "react";
import AdminNavbar from "./AdminNavbar";
import {
  FaUtensils,
  FaClipboardList,
  FaHistory,
  FaChartLine,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    menuItemsCount: 0,
    pendingOrders: 0,
    completedOrders: 0,
    orderHistoryCount: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dummy chart data (replace with dynamic later)
  const revenueData = [
    { date: "Apr 1", revenue: 800 },
    { date: "Apr 2", revenue: 1200 },
    { date: "Apr 3", revenue: 1500 },
    { date: "Apr 4", revenue: 1000 },
    { date: "Apr 5", revenue: 1800 },
  ];

  const statusData = [
    { status: "Pending", count: 5 },
    { status: "Approved", count: 8 },
    { status: "Preparing", count: 4 },
    { status: "Ready", count: 3 },
    { status: "Served", count: 6 },
  ];

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const backendURL =
          process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

        const res = await fetch(`${backendURL}/dashboard/stats`);

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        // Ensure response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format (not JSON)");
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(
          "Failed to fetch dashboard stats. Please check backend deployment."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div>
      <AdminNavbar />
      <div className="admin-dashboard">
        <h1 className="dashboard-title">Dashboard Overview</h1>

        {loading && <p>Loading stats...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <>
            <div className="dashboard-cards">
              <div className="card">
                <FaClipboardList className="card-icon" />
                <div className="card-info">
                  <p>Total Orders</p>
                  <h3>{stats.totalOrders}</h3>
                </div>
              </div>
              <div className="card">
                <FaChartLine className="card-icon" />
                <div className="card-info">
                  <p>Revenue</p>
                  <h3>₹{stats.totalRevenue}</h3>
                </div>
              </div>
              <div className="card">
                <FaUtensils className="card-icon" />
                <div className="card-info">
                  <p>Menu Items</p>
                  <h3>{stats.menuItemsCount}</h3>
                </div>
              </div>
              <div className="card">
                <FaCheckCircle className="card-icon" />
                <div className="card-info">
                  <p>Completed Orders</p>
                  <h3>{stats.completedOrders}</h3>
                </div>
              </div>
              <div className="card">
                <FaClock className="card-icon" />
                <div className="card-info">
                  <p>Pending Orders</p>
                  <h3>{stats.pendingOrders}</h3>
                </div>
              </div>
              <div className="card">
                <FaHistory className="card-icon" />
                <div className="card-info">
                  <p>Order History</p>
                  <h3>{stats.orderHistoryCount}</h3>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              {/* Revenue Line Chart */}
              <div className="chart-card">
                <h3 className="chart-title">📈 Revenue Trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4CAF50"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Order Status Bar Chart */}
              <div className="chart-card">
                <h3 className="chart-title">📊 Orders by Status</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#2196F3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
