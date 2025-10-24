import React, { useState, useEffect } from "react"; 
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import Orders from "./components/Orders";

// Admin Panel Components
import AdminLogin from "./admin/AdminLogin"; 
import AdminDashboard from "./admin/AdminDashboard";
import AdminOrders from "./admin/AdminOrders";
import AdminMenu from "./admin/AdminMenu";
import OrderHistory from "./admin/OrderHistory";

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Check admin login status from localStorage
  useEffect(() => {
    setIsAdminLoggedIn(localStorage.getItem("isAdminLoggedIn") === "true");
  }, []);

  // Handle admin login
  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem("isAdminLoggedIn", "true");
  };

  return (
    <Router>
      <Navbar cartCount={cartCount} />
      <Routes>
        {/* Customer Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu setCartCount={setCartCount} />} />
        <Route path="/cart" element={<Cart cartCount={cartCount} setCartCount={setCartCount} />} />
        <Route path="/orders" element={<Orders />} />

        {/* Admin Login */}
        <Route 
          path="/admin" 
          element={isAdminLoggedIn ? <Navigate to="/admin/dashboard" /> : <AdminLogin onLoginSuccess={handleAdminLogin} />} 
        />

        {/* Admin Panel (Protected Routes) */}
        {isAdminLoggedIn ? (
          <>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/menu" element={<AdminMenu />} />
            <Route path="/admin/history" element={<OrderHistory />} />
          </>
        ) : (
          <>
            {/* Redirect any access to admin routes to the login page if not logged in */}
            <Route path="/admin/*" element={<Navigate to="/admin" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
