import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaFileMedical,
  FaFlask,
  FaCalendarAlt,
  FaUserMd,
  FaBell,
  FaFileInvoiceDollar,
  FaHeartbeat,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaCog,
  FaStethoscope,
  FaThermometerHalf,
  FaChartLine,
  FaPills,
} from "react-icons/fa";

import "./PatientDashboard.css";

import MedicalRecords from "./MedicalRecords";
import LabReports from "./LabReports";
import Appointments from "./Appointments";
import DoctorsList from "./DoctorsList";
import PredictDisease from "./PredictDisease";
import RiskScore from "./RiskScore";
import Notifications from "./Notifications";
import Insurance from "./Insurance";
import ProfileSettings from "./ProfileSettings";
import Visits from "./Visits";
import VitalsEntry from "./VitalsEntry";
import HealthTrends from "./HealthTrends";
import Prescriptions from "./Prescriptions";
import Patient360 from "./Patient360";
import PatientAccessRequests from "./PatientAccessRequests";
import ApprovedDoctorAccess from "./ApprovedDoctorAccess";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "patient") {
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
            <FaHome /> Patient 360
          </li>
          <li
            className={activeSection === "approvedDoctors" ? "active" : ""}
            onClick={() => setActiveSection("approvedDoctors")}
          >
            <FaUserMd /> Doctors with Access
          </li>
          <li
            className={activeSection === "accessRequests" ? "active" : ""}
            onClick={() => setActiveSection("accessRequests")}
          >
            <FaUserMd /> Doctor Access Requests
          </li>
          <li
            className={activeSection === "medical" ? "active" : ""}
            onClick={() => setActiveSection("medical")}
          >
            <FaFileMedical /> Medical Records
          </li>
          <li
            className={activeSection === "labs" ? "active" : ""}
            onClick={() => setActiveSection("labs")}
          >
            <FaFlask /> Lab Reports
          </li>
          <li
            className={activeSection === "appointments" ? "active" : ""}
            onClick={() => setActiveSection("appointments")}
          >
            <FaCalendarAlt /> Appointments
          </li>
          <li
            className={activeSection === "doctors" ? "active" : ""}
            onClick={() => setActiveSection("doctors")}
          >
            <FaUserMd /> Doctors List
          </li>
          <li
            className={activeSection === "visits" ? "active" : ""}
            onClick={() => setActiveSection("visits")}
          >
            <FaStethoscope /> My Visits
          </li>
          <li
            className={activeSection === "prescriptions" ? "active" : ""}
            onClick={() => setActiveSection("prescriptions")}
          >
            <FaPills /> Prescriptions
          </li>
          <li
            className={activeSection === "vitals" ? "active" : ""}
            onClick={() => setActiveSection("vitals")}
          >
            <FaThermometerHalf /> Record Vitals
          </li>
          <li
            className={activeSection === "trends" ? "active" : ""}
            onClick={() => setActiveSection("trends")}
          >
            <FaChartLine /> Health Trends
          </li>
          <li
            className={activeSection === "ai" ? "active" : ""}
            onClick={() => setActiveSection("ai")}
          >
            <FaHeartbeat /> AI Health Insights
          </li>
          <li
            className={activeSection === "risk" ? "active" : ""}
            onClick={() => setActiveSection("risk")}
          >
            <FaExclamationTriangle /> Risk Score
          </li>
          <li
            className={activeSection === "notifications" ? "active" : ""}
            onClick={() => setActiveSection("notifications")}
          >
            <FaBell /> Notifications
          </li>
          <li
            className={activeSection === "insurance" ? "active" : ""}
            onClick={() => setActiveSection("insurance")}
          >
            <FaFileInvoiceDollar /> Insurance & Billing
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
          <h1>Welcome, {user.name}</h1>
          <div className="topbar-right">
            <FaBell className="topbar-icon" />
            <span>{user.email}</span>
          </div>
        </header>

        <section className="section-content">
          {/* PATIENT 360 DASHBOARD */}
          {activeSection === "dashboard" && (
            <Patient360 
              token={token} 
              patientId={user._id} 
              onNavigate={setActiveSection}
            />
          )}
          {activeSection === "approvedDoctors" && <ApprovedDoctorAccess token={token} />}
          {activeSection === "accessRequests" && <PatientAccessRequests token={token} />}

          {activeSection === "medical" && <MedicalRecords token={token} patientId={user._id} />}
          {activeSection === "labs" && <LabReports token={token} patientId={user._id} />}
          {activeSection === "appointments" && <Appointments token={token} patientId={user._id} />}
          {activeSection === "doctors" && <DoctorsList token={token} patientId={user._id} />}
          {activeSection === "visits" && <Visits token={token} patientId={user._id} />}
          {activeSection === "prescriptions" && <Prescriptions token={token} patientId={user._id} />}
          {activeSection === "vitals" && <VitalsEntry token={token} patientId={user._id} />}
          {activeSection === "trends" && <HealthTrends token={token} patientId={user._id} />}
          {activeSection === "ai" && <PredictDisease token={token} patientId={user._id} />}
          {activeSection === "risk" && <RiskScore token={token} patientId={user._id} />}
          {activeSection === "notifications" && <Notifications token={token} patientId={user._id} />}
          {activeSection === "insurance" && <Insurance token={token} patientId={user._id} />}
          {activeSection === "profile" && <ProfileSettings token={token} patientId={user._id} />}
        </section>
      </main>
    </div>
  );
};

export default PatientDashboard;