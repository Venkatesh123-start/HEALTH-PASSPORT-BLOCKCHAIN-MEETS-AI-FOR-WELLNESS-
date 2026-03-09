import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaBell,
  FaSignOutAlt,
  FaCog,
  FaUsers,
  FaShieldAlt,
  FaSearch,
  FaClock,
} from "react-icons/fa";
import FraudDetection from "./FraudDetection";
import "./InsuranceDashboard.css";

const InsuranceDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "insurance") {
      navigate("/login");
      return;
    }
    setUser(storedUser);
    fetchClaims();
    setLoading(false);
  }, [navigate]);

  const fetchClaims = async () => {
    // For now, use mock data since backend doesn't have full claims API
    // In production, this would call the backend API
    const mockClaims = [
      {
        id: 1,
        patientName: "John Doe",
        claimAmount: 5000,
        status: "pending",
        date: new Date().toISOString(),
        type: "Medical Procedure",
      },
      {
        id: 2,
        patientName: "Jane Smith",
        claimAmount: 1500,
        status: "approved",
        date: new Date().toISOString(),
        type: "Lab Tests",
      },
    ];
    setClaims(mockClaims);
    setStats({
      totalClaims: mockClaims.length,
      pendingClaims: mockClaims.filter((c) => c.status === "pending").length,
      approvedClaims: mockClaims.filter((c) => c.status === "approved").length,
      rejectedClaims: mockClaims.filter((c) => c.status === "rejected").length,
    });
  };

  const handleClaimAction = (claimId, action) => {
    setClaims((prev) =>
      prev.map((claim) =>
        claim.id === claimId ? { ...claim, status: action } : claim
      )
    );
    alert(`Claim ${action} successfully!`);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/login");
    setTimeout(() => window.location.reload(), 100);
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className="sidebar insurance-sidebar">
        <div className="logo">MediVault Insurance</div>
        <ul>
          <li
            className={activeSection === "dashboard" ? "active" : ""}
            onClick={() => setActiveSection("dashboard")}
          >
            <FaHome /> Dashboard
          </li>
          <li
            className={activeSection === "claims" ? "active" : ""}
            onClick={() => setActiveSection("claims")}
          >
            <FaFileInvoiceDollar /> Claims
          </li>
          <li
            className={activeSection === "patients" ? "active" : ""}
            onClick={() => setActiveSection("patients")}
          >
            <FaUsers /> Patients
          </li>
          <li
            className={activeSection === "fraud" ? "active" : ""}
            onClick={() => setActiveSection("fraud")}
          >
            <FaShieldAlt /> Fraud Detection
          </li>
          <li
            className={activeSection === "notifications" ? "active" : ""}
            onClick={() => setActiveSection("notifications")}
          >
            <FaBell /> Notifications
          </li>
          <li
            className={activeSection === "settings" ? "active" : ""}
            onClick={() => setActiveSection("settings")}
          >
            <FaCog /> Settings
          </li>
          <li className="logout" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h1>Welcome, {user?.companyName || user?.name}</h1>
          <div className="topbar-right">
            <FaBell className="topbar-icon" />
            <span>{user?.email}</span>
          </div>
        </header>

        <section className="section-content">
          {/* Dashboard Overview */}
          {activeSection === "dashboard" && (
            <div className="insurance-dashboard-content">
              <h2>Insurance Dashboard</h2>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <FaFileInvoiceDollar className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalClaims}</span>
                    <span className="stat-label">Total Claims</span>
                  </div>
                </div>
                <div className="stat-card pending">
                  <FaClock className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.pendingClaims}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                </div>
                <div className="stat-card approved">
                  <FaCheckCircle className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.approvedClaims}</span>
                    <span className="stat-label">Approved</span>
                  </div>
                </div>
                <div className="stat-card rejected">
                  <FaTimesCircle className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.rejectedClaims}</span>
                    <span className="stat-label">Rejected</span>
                  </div>
                </div>
              </div>

              {/* Recent Claims */}
              <div className="recent-claims">
                <h3>Recent Claims</h3>
                {claims.length > 0 ? (
                  <table className="claims-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map((claim) => (
                        <tr key={claim.id}>
                          <td>{claim.patientName}</td>
                          <td>{claim.type}</td>
                          <td>${claim.claimAmount.toLocaleString()}</td>
                          <td>{new Date(claim.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${claim.status}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td>
                            {claim.status === "pending" && (
                              <div className="action-buttons-small">
                                <button
                                  className="approve-btn"
                                  onClick={() => handleClaimAction(claim.id, "approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  className="reject-btn"
                                  onClick={() => handleClaimAction(claim.id, "rejected")}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">No claims found</p>
                )}
              </div>
            </div>
          )}

          {/* Claims Section */}
          {activeSection === "claims" && (
            <div className="claims-section">
              <h2>All Insurance Claims</h2>
              <p>Manage and review all insurance claims.</p>
            </div>
          )}

          {/* Patients Section */}
          {activeSection === "patients" && (
            <div className="patients-section">
              <h2>Patient Records</h2>
              <p>View blockchain-verified patient records for claim validation.</p>
            </div>
          )}

          {/* Fraud Detection */}
          {activeSection === "fraud" && <FraudDetection token={token} />}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="notifications-section">
              <h2>Notifications</h2>
              <p>No new notifications</p>
            </div>
          )}

          {/* Settings */}
          {activeSection === "settings" && (
            <div className="settings-section">
              <h2>Insurance Settings</h2>
              <div className="settings-info">
                <p><strong>Company:</strong> {user?.companyName}</p>
                <p><strong>License:</strong> {user?.licenseNumber}</p>
                <p><strong>Email:</strong> {user?.email}</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default InsuranceDashboard;