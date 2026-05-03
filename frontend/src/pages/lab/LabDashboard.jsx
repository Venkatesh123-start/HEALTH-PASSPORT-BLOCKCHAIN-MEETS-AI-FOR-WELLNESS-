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
import AllReports from "./AllReports";
import Patients from "./Patients";
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
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    if (user?._id) {
      fetchNotifications(true); // Fetch notifications on initial load
    }
  }, [user?._id]);

  useEffect(() => {
    if (activeSection === "notifications" && user?._id) {
      fetchNotifications();
    }
  }, [activeSection, user?._id]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/labs/dashboard`, {
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

  const fetchNotifications = async (initialFetch = false) => {
    if (!user?._id) return;
    try {
      setNotifLoading(!initialFetch);
      setNotifError(null);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/notifications/${user._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        const newNotifications = data.data || [];
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
      } else {
        setNotifError(data.message || "Failed to load notifications");
      }
    } catch (err) {
      setNotifError("Network error while loading notifications");
    } finally {
      setNotifLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/login");
    setTimeout(() => window.location.reload(), 100);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/auth/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("Password updated successfully");
        setShowPasswordForm(false);
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(data.message || "Failed to update password");
      }
    } catch (error) {
      alert("An error occurred while updating the password.");
    }
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
            {notifications.filter(n => !n.read).length > 0 && 
              <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
            }
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
            <div className="notification-icon-wrapper" onClick={() => setActiveSection("notifications")}>
              <FaBell className="topbar-icon" />
              {notifications.filter(n => !n.read).length > 0 && 
                <span className="notification-badge-topbar">{notifications.filter(n => !n.read).length}</span>
              }
            </div>
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
          {activeSection === "reports" && <AllReports token={token} />}

          {/* Patients Section */}
          {activeSection === "patients" && <Patients token={token} />}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="notifications-section">
              <h2>Notifications</h2>
              {notifLoading && <div className="loading">Loading notifications...</div>}
              {notifError && <div className="notifications-error">{notifError}</div>}
              {(!notifications || notifications.length === 0) && !notifLoading ? (
                <p className="no-data">No notifications</p>
              ) : (
                <ul className="notifications-list">
                  {notifications.map((n) => (
                    <li key={n._id} className={n.read ? "read" : "unread"}>
                      <div className="notif-title">{n.title || "Notification"}</div>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-date">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
              {!showPasswordForm ? (
                <button onClick={() => setShowPasswordForm(true)} className="change-password-btn">Change Password</button>
              ) : (
                <div className="password-form">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button onClick={handleChangePassword}>Update Password</button>
                  <button onClick={() => setShowPasswordForm(false)} className="cancel-btn">Cancel</button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default LabDashboard;
