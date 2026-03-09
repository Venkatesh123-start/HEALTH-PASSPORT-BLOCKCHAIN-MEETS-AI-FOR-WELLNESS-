// AuthLayout.jsx
import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const AuthLayout = ({ children }) => {
  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Navbar at top */}
      <Navbar />

      {/* Main content area */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Page content */}
        <div style={{ flex: 1, padding: "20px", backgroundColor: "#f9f9f9" }}>
          {children}
        </div>
      </div>

      {/* Footer at bottom */}
      <Footer />
    </div>
  );
};

export default AuthLayout;