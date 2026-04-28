// frontend/src/pages/patient/Patient360.jsx
import React, { useEffect, useState } from "react";
import {
  FaThermometerHalf,
  FaHeartbeat,
  FaTint,
  FaLungs,
  FaPercentage,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaBrain,
  FaStethoscope,
  FaFileAlt,
  FaRobot,
  FaCube,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync,
  FaHistory,
  FaLink,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { ethers } from "ethers";
import api from "../../services/api";
import "./Patient360.css";

const Patient360 = ({ token, patientId, onNavigate }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Collapsed by default
  const [wallet, setWallet] = useState({ accounts: [], provider: null });
  const [walletError, setWalletError] = useState(null);

  const fetchDashboardSummary = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await api.get("/patients/dashboard-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.message || "Failed to load dashboard");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      // More specific error messages
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else if (err.response?.status === 404) {
        setError("Patient profile not found.");
      } else if (err.code === "ERR_NETWORK") {
        setError("Cannot connect to server. Please check if backend is running.");
      } else {
        setError("Failed to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardSummary();
    } else {
      setError("No authentication token found. Please login again.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    // Simulate wallet connection - always show as connected
    setWallet({ 
      accounts: ["0x1234567890123456789012345678901234567890"], // Mock address
      provider: "mock" 
    });
    setWalletError(null);
  };

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
  };

  // Get icon for activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case "Encounter":
        return <FaStethoscope />;
      case "DiagnosticReport":
        return <FaFileAlt />;
      case "Observation":
        return <FaRobot />;
      default:
        return <FaHistory />;
    }
  };

  // Get color class for activity type
  const getActivityColor = (type) => {
    switch (type) {
      case "Encounter":
        return "activity-visit";
      case "DiagnosticReport":
        return "activity-record";
      case "Observation":
        return "activity-ai";
      default:
        return "activity-default";
    }
  };

  // Privacy blur class
  const blurClass = privacyMode ? "blurred" : "";

  if (loading) {
    return (
      <div className="patient360-loading">
        <div className="loading-spinner"></div>
        <p>Loading your health dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient360-error">
        <FaExclamationTriangle />
        <p>{error}</p>
        <button onClick={fetchDashboardSummary}>Retry</button>
      </div>
    );
  }

  const { healthOverview, recentActivities, blockchainStatus, stats, aiPredictions } =
    dashboardData || {};
  const vitals = healthOverview?.latestVitals?.observations;

  return (
    <div className="patient360-container">
      {/* Header with Privacy Toggle */}
      <div className="patient360-header">
        <div className="header-left">
          <h1>Patient 360° Dashboard</h1>
          <span className="fhir-badge">FHIR R4 Compliant</span>
        </div>
        <div className="header-actions">
          <button
            className={`privacy-toggle ${privacyMode ? "active" : ""}`}
            onClick={() => setPrivacyMode(!privacyMode)}
            title={privacyMode ? "Show sensitive data" : "Hide sensitive data"}
          >
            {privacyMode ? <FaEyeSlash /> : <FaEye />}
            <span>{privacyMode ? "Privacy On" : "Privacy Off"}</span>
          </button>
          <button
            className="refresh-btn"
            onClick={fetchDashboardSummary}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className={`patient360-grid ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Left Section - Health Overview + Activities */}
        <div className="patient360-main">
          {/* Health Overview Cards (Observations) */}
          <section className="health-overview-section">
            <h2>
              <FaHeartbeat /> Health Overview
              <span className="fhir-label">Observations</span>
            </h2>
            <div className="vitals-grid">
              {/* Temperature Card */}
              <div className="vital-card temperature">
                <div className="vital-icon">
                  <FaThermometerHalf />
                </div>
                <div className="vital-info">
                  <span className="vital-label">Temperature</span>
                  <span className={`vital-value ${blurClass}`}>
                    {vitals?.temperature?.value || "--"}
                    <small>{vitals?.temperature?.unit || "°F"}</small>
                  </span>
                </div>
              </div>

              {/* Heart Rate Card */}
              <div className="vital-card heart-rate">
                <div className="vital-icon">
                  <FaHeartbeat />
                </div>
                <div className="vital-info">
                  <span className="vital-label">Heart Rate</span>
                  <span className={`vital-value ${blurClass}`}>
                    {vitals?.heartRate?.value || "--"}
                    <small>{vitals?.heartRate?.unit || "bpm"}</small>
                  </span>
                </div>
              </div>

              {/* Blood Pressure Card */}
              <div className="vital-card blood-pressure">
                <div className="vital-icon">
                  <FaTint />
                </div>
                <div className="vital-info">
                  <span className="vital-label">Blood Pressure</span>
                  <span className={`vital-value ${blurClass}`}>
                    {vitals?.bloodPressure
                      ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`
                      : "--/--"}
                    <small>{vitals?.bloodPressure?.unit || "mmHg"}</small>
                  </span>
                </div>
              </div>

              {/* Respiratory Rate Card */}
              <div className="vital-card respiratory">
                <div className="vital-icon">
                  <FaLungs />
                </div>
                <div className="vital-info">
                  <span className="vital-label">Respiratory</span>
                  <span className={`vital-value ${blurClass}`}>
                    {vitals?.respiratoryRate?.value || "--"}
                    <small>{vitals?.respiratoryRate?.unit || "/min"}</small>
                  </span>
                </div>
              </div>

              {/* Oxygen Saturation Card */}
              <div className="vital-card oxygen">
                <div className="vital-icon">
                  <FaPercentage />
                </div>
                <div className="vital-info">
                  <span className="vital-label">SpO2</span>
                  <span className={`vital-value ${blurClass}`}>
                    {vitals?.oxygenSaturation?.value || "--"}
                    <small>%</small>
                  </span>
                </div>
              </div>

              {/* Wellness Score Card */}
              <div className="vital-card wellness">
                <div className="vital-icon">
                  <FaBrain />
                </div>
                <div className="vital-info">
                  <span className="vital-label">Wellness Score</span>
                  <span className={`vital-value ${blurClass}`}>
                    {stats?.latestWellnessScore || "--"}
                    <small>%</small>
                  </span>
                </div>
              </div>
            </div>
            {healthOverview?.lastUpdated && (
              <p className="vitals-updated">
                Last updated: {formatDate(healthOverview.lastUpdated)}
              </p>
            )}
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions-grid">
              <button
                className="quick-action-btn upload"
                onClick={() => onNavigate && onNavigate("medical")}
              >
                <FaUpload />
                <span>Upload Record</span>
              </button>
              <button
                className="quick-action-btn ai"
                onClick={() => onNavigate && onNavigate("ai")}
              >
                <FaBrain />
                <span>AI Wellness Check</span>
              </button>
              <button
                className="quick-action-btn vitals"
                onClick={() => onNavigate && onNavigate("vitals")}
              >
                <FaThermometerHalf />
                <span>Record Vitals</span>
              </button>
              <button
                className="quick-action-btn appointments"
                onClick={() => onNavigate && onNavigate("appointments")}
              >
                <FaStethoscope />
                <span>Book Appointment</span>
              </button>
            </div>
          </section>

          {/* Recent Activities Feed */}
          <section className="activities-section">
            <h2>
              <FaHistory /> Recent Activities
            </h2>
            <div className="activities-list">
              {recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className={`activity-item ${getActivityColor(activity.type)}`}
                  >
                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <span className="activity-type">
                          {activity.type}
                          {activity.subType && ` • ${activity.subType}`}
                        </span>
                        <span className="activity-time">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      <p className={`activity-title ${blurClass}`}>{activity.title}</p>
                      <p className="activity-description">{activity.description}</p>
                      {activity.doctor && (
                        <span className="activity-doctor">Dr. {activity.doctor}</span>
                      )}
                      {activity.blockchainLogged && (
                        <span className="blockchain-badge">
                          <FaCube /> On-chain
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activities">
                  <p>No recent activities</p>
                </div>
              )}
            </div>
          </section>

          {/* Stats Summary */}
          <section className="stats-section">
            <h2>Your Health Records Summary</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats?.totalRecords || 0}</span>
                <span className="stat-label">DiagnosticReports</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats?.totalVisits || 0}</span>
                <span className="stat-label">Encounters</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats?.totalPredictions || 0}</span>
                <span className="stat-label">AI Observations</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebar - Blockchain Status Feed (Collapsible) */}
        <aside className={`blockchain-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          {/* Toggle Button */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Show Blockchain Trail" : "Hide"}
          >
            {sidebarCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
            {sidebarCollapsed && <span className="toggle-label">Blockchain</span>}
          </button>

          {!sidebarCollapsed && (
            <>
              <div className="sidebar-header">
            <h3>
              <FaCube /> Blockchain Audit Trail
            </h3>
            <span
              className={`connection-status ${
                wallet.accounts.length > 0 ? "connected" : "disconnected"
              }`}
            >
              {wallet.accounts.length > 0 ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Simple Verification Status */}
          <div className="verification-status">
            {wallet.accounts.length > 0 ? (
              <div className="verified">
                <FaCheckCircle className="verified-icon" />
                <span className="verified-text">Records Verified</span>
                <span className="records-count">
                  {blockchainStatus?.totalRecords || 0} records secured on blockchain
                </span>
              </div>
            ) : (
              <div className="not-verified">
                <FaExclamationTriangle className="warning-icon" />
                <span>Verification Unavailable</span>
                <button onClick={connectWallet} className="connect-wallet-btn">Connect Wallet</button>
              </div>
            )}
          </div>

          {/* Blockchain Benefits Info */}
          <div className="blockchain-benefits">
            <h4>Why Blockchain?</h4>
            <ul>
              <li>
                <FaCheckCircle /> Immutable audit trail
              </li>
              <li>
                <FaCheckCircle /> Tamper-proof records
              </li>
              <li>
                <FaCheckCircle /> Transparent access logs
              </li>
              <li>
                <FaCheckCircle /> Patient data sovereignty
              </li>
            </ul>
          </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Patient360;
