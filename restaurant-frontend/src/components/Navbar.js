import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ cartCount }) => {
  return (
    <nav className="navbar">
      <div className="logo-container">
        <img src="logo.png" className="logo2" alt="Logo" />
        <h1 className="logo-text">Gourmet Haven</h1>
      </div>

      <div className="nav-links">
        <Link to="/" className="nav-item">Home</Link>
        <Link to="/menu" className="nav-item">Menu</Link>
        <Link to="/cart" className="nav-item">
          Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>
        <Link to="/orders" className="nav-item">Orders</Link>
        <Link to="/admin" className="nav-item admin-link">Admin</Link>
      </div>
    </nav>
  );
};

export default Navbar;
