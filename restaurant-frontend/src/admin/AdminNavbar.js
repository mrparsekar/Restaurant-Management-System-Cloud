// src/admin/AdminNavbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./admin.css";

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    window.location.href = "/admin";
  };

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-left">
        <h2 className="admin-title">🍽️ Admin Panel</h2>
        <ul className="admin-links">
          <li><Link to="/admin">Dashboard</Link></li>
          <li><Link to="/admin/orders">Manage Orders</Link></li>
          <li><Link to="/admin/menu">Manage Menu</Link></li>
          <li><Link to="/admin/history">Order History</Link></li>
        </ul>
      </div>
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
};

export default AdminNavbar;
