import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  const navStyle = {
    background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "70px",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.3)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  };

  const logoStyle = {
    color: "white",
    fontSize: "1.5rem",
    fontWeight: "700",
    letterSpacing: "1px",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const linksContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const linkStyle = (active) => ({
    color: active ? "#fff" : "rgba(255, 255, 255, 0.85)",
    padding: "10px 20px",
    borderRadius: "25px",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.95rem",
    background: active ? "rgba(255, 255, 255, 0.2)" : "transparent",
    backdropFilter: active ? "blur(10px)" : "none",
    transition: "all 0.3s ease",
  });

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>
        <span style={{ fontSize: "1.8rem" }}>⚕️</span>
        MediVault
      </Link>
      <div style={linksContainerStyle}>
        <Link to="/dashboard" style={linkStyle(isActive("/dashboard"))}>
          Dashboard
        </Link>
        <Link to="/upload" style={linkStyle(isActive("/upload"))}>
          Upload
        </Link>
        <Link to="/records" style={linkStyle(isActive("/records"))}>
          Records
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
