import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaFlask,
  FaUpload,
  FaBell,
  FaSignOutAlt,
  FaCog,
  FaUsers,
  FaFileAlt,
  FaCheckCircle,
  FaSearch,
} from "react-icons/fa";
import UploadReport from "./UploadReport";
import "./LabDashboard.css";

const LabDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
  });
  const [recentReports, setRecentReports] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "lab") {
      navigate("/login");
      return;
    }
    setUser(storedUser);
    fetchDashboardData();
    setLoading(false);
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/labs/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStats(result.data.stats);
          setRecentReports(result.data.recentReports || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
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
      <aside className="sidebar lab-sidebar">
        <div className="logo">MediVault Lab</div>
        <ul>
          <li
            className={activeSection === "dashboard" ? "active" : ""}
            onClick={() => setActiveSection("dashboard")}
          >
            <FaHome /> Dashboard
          </li>
          <li
            className={activeSection === "upload" ? "active" : ""}
            onClick={() => setActiveSection("upload")}
          >
            <FaUpload /> Upload Report
          </li>
          <li
            className={activeSection === "reports" ? "active" : ""}
            onClick={() => setActiveSection("reports")}
          >
            <FaFileAlt /> All Reports
          </li>
          <li
            className={activeSection === "patients" ? "active" : ""}
            onClick={() => setActiveSection("patients")}
          >
            <FaUsers /> Patients
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
          <h1>Welcome, {user?.labName || user?.name}</h1>
          <div className="topbar-right">
            <FaBell className="topbar-icon" />
            <span>{user?.email}</span>
          </div>
        </header>

        <section className="section-content">
          {/* Dashboard Overview */}
          {activeSection === "dashboard" && (
            <div className="lab-dashboard-content">
              <h2>Laboratory Dashboard</h2>
              
              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <FaFlask className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalReports}</span>
                    <span className="stat-label">Total Reports</span>
                  </div>
                </div>
                <div className="stat-card pending">
                  <FaFileAlt className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.pendingReports}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                </div>
                <div className="stat-card completed">
                  <FaCheckCircle className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-value">{stats.completedReports}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                  <button onClick={() => setActiveSection("upload")}>
                    <FaUpload /> Upload New Report
                  </button>
                  <button onClick={() => setActiveSection("patients")}>
                    <FaSearch /> Find Patient
                  </button>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="recent-reports">
                <h3>Recent Reports</h3>
                {recentReports.length > 0 ? (
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Test Type</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReports.map((report, idx) => (
                        <tr key={idx}>
                          <td>{report.patientName || "N/A"}</td>
                          <td>{report.testType || report.type}</td>
                          <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${report.status || "completed"}`}>
                              {report.status || "Completed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">No reports uploaded yet</p>
                )}
              </div>
            </div>
          )}

          {/* Upload Report Section */}
          {activeSection === "upload" && <UploadReport token={token} />}

          {/* All Reports Section */}
          {activeSection === "reports" && (
            <div className="all-reports">
              <h2>All Lab Reports</h2>
              <p>View and manage all uploaded lab reports here.</p>
              {/* Reports list would go here */}
            </div>
          )}

          {/* Patients Section */}
          {activeSection === "patients" && (
            <div className="patients-section">
              <h2>Patient Management</h2>
              <p>Search and manage patient records for lab tests.</p>
              {/* Patient search and list would go here */}
            </div>
          )}

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
              <h2>Lab Settings</h2>
              <div className="settings-info">
                <p><strong>Lab Name:</strong> {user?.labName}</p>
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

export default LabDashboard;