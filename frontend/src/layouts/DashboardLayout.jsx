// DashboardLayout.jsx
import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const DashboardLayout = ({ children }) => {
  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", background: "#f7fafc" }}>
      {/* Navbar at the top */}
      <Navbar />

      {/* Main content area with Sidebar */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar on the left */}
        <Sidebar />

        {/* Dashboard content */}
        <div
          style={{
            flex: 1,
            padding: "32px",
            background: "linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)",
            minHeight: "calc(100vh - 70px - 60px)",
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default DashboardLayout;
