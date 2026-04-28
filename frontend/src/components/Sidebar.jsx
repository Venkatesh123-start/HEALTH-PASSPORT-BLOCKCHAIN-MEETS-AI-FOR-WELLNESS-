// Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  const sidebarStyle = {
    width: "260px",
    background: "linear-gradient(180deg, #1a1c2c 0%, #2d3561 100%)",
    padding: "24px 16px",
    minHeight: "calc(100vh - 80px)",
    boxShadow: "4px 0 20px rgba(0, 0, 0, 0.1)",
  };

  const titleStyle = {
    color: "#3b82f6",
    fontSize: "1.25rem",
    fontWeight: "700",
    marginBottom: "24px",
    paddingLeft: "12px",
    letterSpacing: "0.5px",
  };

  const listStyle = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const linkStyle = (active) => ({
    display: "block",
    padding: "14px 16px",
    borderRadius: "12px",
    color: active ? "#fff" : "rgba(255, 255, 255, 0.7)",
    background: active ? "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" : "transparent",
    textDecoration: "none",
    fontWeight: active ? "600" : "500",
    fontSize: "0.95rem",
    transition: "all 0.3s ease",
    boxShadow: active ? "0 4px 15px rgba(59, 130, 246, 0.4)" : "none",
  });

  return (
    <div style={sidebarStyle}>
      <h3 style={titleStyle}>MediVault Menu</h3>
      <ul style={listStyle}>
        <li>
          <Link to="/dashboard" style={linkStyle(isActive("/dashboard"))}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/patient-info" style={linkStyle(isActive("/patient-info"))}>
            Patient Info
          </Link>
        </li>
        <li>
          <Link to="/visits" style={linkStyle(isActive("/visits"))}>
            Medical Records
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
