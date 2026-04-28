import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaUserMd,
  FaCalendarAlt,
  FaFileMedical,
  FaHeartbeat,
  FaExclamationTriangle,
  FaBell,
  FaSignOutAlt,
  FaCog,
  FaStethoscope,
} from "react-icons/fa";

import "./DoctorDashboard.css";

// Child components (assume you will create similar to patient dashboard)
import PatientsList from "./PatientsList";
import Appointments from "./Appointments";
import MedicalRecords from "./MedicalRecords";
import AIInsights from "./AIInsights";
import AccessRequests from "./AccessRequests";
import Notifications from "./Notifications";
import ProfileSettings from "./ProfileSettings";
import Visits from "./Visits";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "doctor") {
      navigate("/login");
      return;
    }
    setUser(storedUser);
    setLoading(false);
    fetchNotifications(true);
  }, [navigate]);

  const fetchNotifications = async (badgeOnly = false) => {
    if (!user?._id) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/notifications/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data || [];
        if (!badgeOnly) {
          setNotifications(list);
        }
        setUnreadCount(list.filter((n) => !n.read).length);
      } else {
        // Handle error silently for badge updates
      }
    } catch (err) {
      // Handle error silently for badge updates
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
      <aside className="sidebar">
        <div className="logo">MediVault</div>
        <ul>
          <li
            className={activeSection === "dashboard" ? "active" : ""}
            onClick={() => setActiveSection("dashboard")}
          >
            <FaHome /> Dashboard Guide
          </li>
          <li
            className={activeSection === "patients" ? "active" : ""}
            onClick={() => setActiveSection("patients")}
          >
            <FaUserMd /> Patients List
          </li>
          <li
            className={activeSection === "appointments" ? "active" : ""}
            onClick={() => setActiveSection("appointments")}
          >
            <FaCalendarAlt /> Appointments
          </li>
          <li
            className={activeSection === "records" ? "active" : ""}
            onClick={() => setActiveSection("records")}
          >
            <FaFileMedical /> Medical Records
          </li>
          <li
            className={activeSection === "visits" ? "active" : ""}
            onClick={() => setActiveSection("visits")}
          >
            <FaStethoscope /> Patient Visits
          </li>
          <li
            className={activeSection === "ai" ? "active" : ""}
            onClick={() => setActiveSection("ai")}
          >
            <FaHeartbeat /> AI Insights
          </li>
          <li
            className={activeSection === "access" ? "active" : ""}
            onClick={() => setActiveSection("access")}
          >
            <FaExclamationTriangle /> Access Requests
          </li>
          <li
            className={activeSection === "notifications" ? "active" : ""}
            onClick={() => setActiveSection("notifications")}
          >
            <FaBell /> Notifications
          </li>
          <li
            className={activeSection === "profile" ? "active" : ""}
            onClick={() => setActiveSection("profile")}
          >
            <FaCog /> Profile / Settings
          </li>
          <li className="logout" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h1>Hi, Dr. {user.name}</h1>
          <div className="topbar-right">
            <div className="notification-icon-wrapper" onClick={() => setActiveSection("notifications")}>
              <FaBell className="topbar-icon" />
              {unreadCount > 0 && 
                <span className="notification-badge-topbar">{unreadCount}</span>
              }
            </div>
            <span>{user.email}</span>
          </div>
        </header>

        <section className="section-content">
          {/* DASHBOARD GUIDE */}
          {activeSection === "dashboard" && (
            <div className="guide-container">
              <h2>Clinical Overview</h2>

              <div className="guide-card">
                <h3>Today at a glance</h3>
                <p>
                  Review today&apos;s appointments, recent patient visits, and any new
                  records shared with you so you can prioritize your clinical work.
                </p>
              </div>

              <div className="guide-card">
                <h3>Patient workload</h3>
                <p>
                  Use the Patients, Visits, and Records sections on the left to move
                  quickly between active cases, check investigations, and update
                  treatment plans.
                </p>
              </div>

              <div className="guide-card">
                <h3>Alerts & follow‑ups</h3>
                <p>
                  Keep an eye on Notifications and AI Insights to spot abnormal trends,
                  missed follow‑ups, or high‑risk patients that may need your attention
                  sooner.
                </p>
              </div>

              <div className="guide-card">
                <h3>Access & collaboration</h3>
                <p>
                  Manage Access Requests to control which records you can see, and use
                  secure, audit‑ready sharing when collaborating with other clinicians.
                </p>
              </div>

              <div className="guide-card">
                <h3>Your practice profile</h3>
                <p>
                  Update your availability, specialties, and notification preferences
                  from Profile / Settings so the system matches your workflow.
                </p>
              </div>
            </div>
          )}

          {activeSection === "patients" && <PatientsList token={token} doctorId={user._id} />}
          {activeSection === "appointments" && <Appointments token={token} doctorId={user._id} />}
          {activeSection === "records" && <MedicalRecords token={token} doctorId={user._id} />}
          {activeSection === "visits" && <Visits token={token} doctorId={user._id} />}
          {activeSection === "ai" && <AIInsights token={token} doctorId={user._id} />}
          {activeSection === "access" && <AccessRequests token={token} doctorId={user._id} />}
          {activeSection === "notifications" && <Notifications token={token} doctorId={user._id} />}
          {activeSection === "profile" && <ProfileSettings token={token} doctorId={user._id} />}
        </section>
      </main>
    </div>
  );
};

export default DoctorDashboard;
