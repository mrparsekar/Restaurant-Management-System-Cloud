import React, { useState } from "react";
import axios from "axios";
import "./AdminLogin.css";

function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5000/api/admin/login", {
        username,
        password,
      });

      if (res.data.message === "Login successful") {
        localStorage.setItem("isAdminLoggedIn", "true");
        onLoginSuccess();
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Admin Panel</h2>
        <p className="login-subtitle">Please enter your credentials</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
  <div className="input-group" data-icon="👤">
    <label>Username</label>
    <input
      type="text"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      placeholder="Enter your username"
      required
    />
  </div>

  <div className="input-group" data-icon="🔒">
    <label>Password</label>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Enter your password"
      required
    />
  </div>

  <button type="submit" className="login-btn">
    Login
  </button>
</form>

      </div>
    </div>
  );
}

export default AdminLogin;
