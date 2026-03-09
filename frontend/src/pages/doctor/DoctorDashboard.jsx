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

  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "doctor") {
      navigate("/login");
      return;
    }
    setUser(storedUser);
    setLoading(false);
  }, [navigate]);

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
            <FaBell className="topbar-icon" />
            <span>{user.email}</span>
          </div>
        </header>

        <section className="section-content">
          {/* DASHBOARD GUIDE */}
          {activeSection === "dashboard" && (
            <div className="guide-container">
              <h2>How to Use Your Doctor Dashboard</h2>

              <div className="guide-card">
                <h3>1️⃣ Patients List</h3>
                <p>
                  View all patients who have granted you access. Check their profile, medical history, and last visit details.
                </p>
              </div>

              <div className="guide-card">
                <h3>2️⃣ Medical Records Access</h3>
                <p>
                  Access authorized patient records. Preview reports, download PDFs/images, and upload new prescriptions or lab results. Blockchain ensures security.
                </p>
              </div>

              <div className="guide-card">
                <h3>3️⃣ Appointments</h3>
                <p>
                  View upcoming and past appointments. Accept, reject, reschedule, or cancel consultations. Calendar view helps plan your schedule efficiently.
                </p>
              </div>

              <div className="guide-card">
                <h3>4️⃣ AI Insights</h3>
                <p>
                  Check AI-generated patient health predictions and risk scores. Use insights for preventive care recommendations.
                </p>
              </div>

              <div className="guide-card">
                <h3>5️⃣ Access Requests</h3>
                <p>
                  Approve or revoke patient access requests. Track access history to know who has permission to view medical records.
                </p>
              </div>

              <div className="guide-card">
                <h3>6️⃣ Notifications</h3>
                <p>
                  Stay updated on new appointments, uploaded patient reports, and access changes in real-time.
                </p>
              </div>

              <div className="guide-card">
                <h3>7️⃣ Profile / Settings</h3>
                <p>
                  Update your personal info, specialty, consultation hours, and manage notification preferences.
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