import React, { useState, useEffect, useCallback } from "react";
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
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [policies, setPolicies] = useState([]);
  const [policyPatientId, setPolicyPatientId] = useState("");
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesError, setPoliciesError] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);
  const [recordsPatientId, setRecordsPatientId] = useState("");
  const [claimsList, setClaimsList] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState(null);
  const [claimForm, setClaimForm] = useState({
    patientId: "",
    insuranceId: "",
    amount: "",
    type: "",
    description: "",
    recordIds: [],
  });
  const [addPolicyForm, setAddPolicyForm] = useState({
    companyName: "",
    policyNumber: "",
    coverageAmount: "",
    policyType: "",
    startDate: "",
    endDate: "",
  });

  const token = localStorage.getItem("token");

  const fetchNotifications = useCallback(async (badgeOnly = false) => {
    if (!user?._id) return;
    try {
      setNotifLoading(true);
      setNotifError(null);
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
        setNotifError(data.message || "Failed to load notifications");
      }
    } catch (err) {
      setNotifError("Network error while loading notifications");
    } finally {
      setNotifLoading(false);
    }
  }, [token, user?._id]);

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

  useEffect(() => {
    let interval;
    if (user?._id) {
      fetchNotifications(true);
      interval = setInterval(() => fetchNotifications(true), 30000);
    }
    return () => interval && clearInterval(interval);
  }, [user?._id, fetchNotifications]);

  useEffect(() => {
    if (activeSection === "notifications" && user?._id) {
      fetchNotifications(false);
    } else if (activeSection === "claims") {
      fetchClaimsList();
    }
  }, [activeSection, user?._id, fetchNotifications]);

  const fetchClaims = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/claims`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const claimsData = data.data || [];
        setClaims(claimsData);
        setStats({
          totalClaims: claimsData.length,
          pendingClaims: claimsData.filter((c) => c.status === "pending").length,
          approvedClaims: claimsData.filter((c) => c.status === "approved").length,
          rejectedClaims: claimsData.filter((c) => c.status === "rejected").length,
        });
      }
    } catch (err) {
      // Handle error
    }
  };

  // fetchNotifications is defined above with useCallback

  const fetchPolicies = async () => {
    if (!policyPatientId) return;
    try {
      setPoliciesLoading(true);
      setPoliciesError(null);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/${policyPatientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPolicies(data);
      } else if (data.success && Array.isArray(data.data)) {
        setPolicies(data.data);
      } else {
        setPolicies([]);
      }
    } catch (err) {
      setPoliciesError("Failed to load policies");
    } finally {
      setPoliciesLoading(false);
    }
  };

  const addPolicy = async (e) => {
    e.preventDefault();
    if (!policyPatientId) {
      setPoliciesError("Enter Patient ID to add a policy");
      return;
    }
    try {
      setPoliciesError(null);
      const body = {
        ...addPolicyForm,
        coverageAmount: Number(addPolicyForm.coverageAmount || 0),
        patient: policyPatientId,
      };
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data && (data.success || data.insurance)) {
        setAddPolicyForm({
          companyName: "",
          policyNumber: "",
          coverageAmount: "",
          policyType: "",
          startDate: "",
          endDate: "",
        });
        await fetchPolicies();
        alert("Policy added");
      } else {
        setPoliciesError(data.message || "Failed to add policy");
      }
    } catch (err) {
      setPoliciesError("Network error adding policy");
    }
  };

  const fetchPatientRecords = async () => {
    if (!recordsPatientId) return;
    try {
      setRecordsLoading(true);
      setRecordsError(null);
      let pid = recordsPatientId;

      // If email provided, resolve to patient ID via insurance policies
      if (recordsPatientId.includes("@")) {
        const r = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/${recordsPatientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pdata = await r.json();
        const list = Array.isArray(pdata) ? pdata : pdata.data || [];
        if (!list || list.length === 0) {
          setRecordsError("No policies found for this email to resolve Patient ID");
          setRecords([]);
          setRecordsLoading(false);
          return;
        }
        const first = list[0];
        pid = typeof first.patient === "string" ? first.patient : first.patient?._id || first.patient;
      }

      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/patient/${pid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      } else {
        setRecordsError(data.message || "Failed to load records");
      }
    } catch (err) {
      setRecordsError("Failed to load records");
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchClaimsList = async () => {
    try {
      setClaimsLoading(true);
      setClaimsError(null);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/claims`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setClaimsList(data.data || []);
      } else {
        setClaimsError(data.message || "Failed to load claims");
      }
    } catch (err) {
      setClaimsError("Failed to load claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  const submitClaim = async (e) => {
    e.preventDefault();
    try {
      const trimmedPatient = (claimForm.patientId || "").trim();
      const amt = Number(claimForm.amount);
      if (!trimmedPatient) {
        alert("Please enter Patient ID or Email");
        return;
      }
      if (!amt || isNaN(amt) || amt <= 0) {
        alert("Please enter a valid amount greater than 0");
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...claimForm,
          patientId: trimmedPatient,
          amount: amt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimForm({
          patientId: "",
          insuranceId: "",
          amount: "",
          type: "",
          description: "",
          recordIds: [],
        });
        fetchClaimsList();
        alert("Claim submitted");
      } else {
        alert((data && data.message) || "Failed to submit claim");
      }
    } catch (err) {
      alert("Network error submitting claim");
    }
  };

  const updateClaimStatus = async (id, status) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/claims/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchClaimsList();
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (err) {
      alert("Network error updating status");
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
            className={activeSection === "policies" ? "active" : ""}
            onClick={() => setActiveSection("policies")}
          >
            <FaFileInvoiceDollar /> Policy Management
          </li>
          <li
            className={activeSection === "uploadDocs" ? "active" : ""}
            onClick={() => setActiveSection("uploadDocs")}
          >
            <FaSearch /> Upload Documents
          </li>
          <li
            className={activeSection === "notifications" ? "active" : ""}
            onClick={() => setActiveSection("notifications")}
          >
            <FaBell /> Notifications
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
            <div className="notification-icon-wrapper" onClick={() => setActiveSection("notifications")}>
              <FaBell className="topbar-icon" />
              {unreadCount > 0 && (
                <span className="notification-badge-topbar">
                  {unreadCount}
                </span>
              )}
            </div>
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
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map((claim) => (
                        <tr key={claim._id || claim.id}>
                          <td>{claim.patient?.name || claim.patientName || "Unknown"}</td>
                          <td><strong>${(claim.amount || 0).toLocaleString()}</strong></td>
                          <td>{claim.type || "-"}</td>
                          <td>
                            <span className={`status-badge ${claim.status}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td>{new Date(claim.createdAt || claim.date).toLocaleDateString()}</td>
                          <td>
                            {claim.status === "pending" && (
                              <div className="action-buttons-small">
                                <button
                                  className="approve-btn"
                                  onClick={() => updateClaimStatus(claim._id || claim.id, "approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  className="reject-btn"
                                  onClick={() => updateClaimStatus(claim._id || claim.id, "rejected")}
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
                  <div className="no-data">
                    <FaFileInvoiceDollar style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                    <p>No claims found</p>
                    <span>Submit a claim from the Claims section.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Policy Management */}
          {activeSection === "policies" && (
            <div className="claims-section">
              <h2>Policy Management</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  placeholder="Patient ID (required for Add Policy)"
                  value={policyPatientId}
                  onChange={(e) => setPolicyPatientId(e.target.value)}
                />
                <button onClick={fetchPolicies}>Load Policies</button>
              </div>
              {policiesLoading && <div className="loading">Loading policies...</div>}
              {policiesError && <div className="notifications-error">{policiesError}</div>}
              {policies.length === 0 ? (
                <p className="no-data">No policies for this patient. Add a policy below.</p>
              ) : (
                <table className="claims-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Policy #</th>
                      <th>Coverage</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr key={p._id}>
                        <td>{p.companyName}</td>
                        <td>{p.policyNumber}</td>
                        <td>${(p.coverageAmount || 0).toLocaleString()}</td>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <h3 style={{ marginTop: 16 }}>Add Policy</h3>
              <form onSubmit={addPolicy} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
                <input
                  placeholder="Insurance Company"
                  value={addPolicyForm.companyName}
                  onChange={(e) => setAddPolicyForm((p) => ({ ...p, companyName: e.target.value }))}
                  required
                />
                <input
                  placeholder="Policy Number"
                  value={addPolicyForm.policyNumber}
                  onChange={(e) => setAddPolicyForm((p) => ({ ...p, policyNumber: e.target.value }))}
                  required
                />
                <input
                  placeholder="Coverage Amount"
                  type="number"
                  value={addPolicyForm.coverageAmount}
                  onChange={(e) => setAddPolicyForm((p) => ({ ...p, coverageAmount: e.target.value }))}
                  required
                />
                <input
                  placeholder="Policy Type (optional)"
                  value={addPolicyForm.policyType}
                  onChange={(e) => setAddPolicyForm((p) => ({ ...p, policyType: e.target.value }))}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Start Date"
                    type="date"
                    value={addPolicyForm.startDate}
                    onChange={(e) => setAddPolicyForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                  <input
                    placeholder="End Date"
                    type="date"
                    value={addPolicyForm.endDate}
                    onChange={(e) => setAddPolicyForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
                <button type="submit">Add Policy</button>
              </form>
            </div>
          )}

          {/* Upload Insurance Documents */}
          {activeSection === "uploadDocs" && (
            <div className="claims-section">
              <h2>Upload Insurance Documents</h2>
              <UploadPolicyDocuments token={token} />
            </div>
          )}

          {/* Claims Management */}
          {activeSection === "claims" && (
            <div className="claims-section">
              <h2>Claims Management</h2>
              
              {/* Submit New Claim Form */}
              <div className="claim-form-container" style={{ marginBottom: 24, padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
                <h3 style={{ marginBottom: 16 }}>Submit New Claim</h3>
                <form onSubmit={submitClaim} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      placeholder="Patient ID or Email"
                      value={claimForm.patientId}
                      onChange={(e) => setClaimForm((prev) => ({ ...prev, patientId: e.target.value }))}
                      style={{ flex: 1 }}
                      required
                    />
                    <input
                      placeholder="Amount ($)"
                      type="number"
                      value={claimForm.amount}
                      onChange={(e) => setClaimForm((prev) => ({ ...prev, amount: e.target.value }))}
                      style={{ width: 120 }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      placeholder="Claim Type"
                      value={claimForm.type}
                      onChange={(e) => setClaimForm((prev) => ({ ...prev, type: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      placeholder="Insurance ID (optional)"
                      value={claimForm.insuranceId}
                      onChange={(e) => setClaimForm((prev) => ({ ...prev, insuranceId: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <textarea
                    placeholder="Description"
                    value={claimForm.description}
                    onChange={(e) => setClaimForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                  <button type="submit" style={{ maxWidth: 200 }}>Submit Claim</button>
                </form>
              </div>

              {/* Claims List */}
              <div className="claims-list-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3>All Claims</h3>
                  <button onClick={fetchClaimsList} className="refresh-btn">Refresh</button>
                </div>
                {claimsLoading && <div className="loading">Loading claims...</div>}
                {claimsError && <div className="notifications-error">{claimsError}</div>}
                {!claimsLoading && claimsList.length === 0 ? (
                  <div className="no-data">
                    <FaFileInvoiceDollar style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                    <p>No claims submitted yet</p>
                    <span>Submit a new claim using the form above.</span>
                  </div>
                ) : (
                  <table className="claims-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimsList.map((c) => (
                        <tr key={c._id}>
                          <td>{c.patient?.name || c.patient?.email || c.patient || "Unknown"}</td>
                          <td><strong>${(c.amount || 0).toLocaleString()}</strong></td>
                          <td>{c.type || "-"}</td>
                          <td>{c.description ? (c.description.length > 50 ? c.description.substring(0, 50) + "..." : c.description) : "-"}</td>
                          <td>
                            <span className={`status-badge ${c.status}`}>{c.status}</span>
                          </td>
                          <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>
                            {c.status === "pending" ? (
                              <div className="action-buttons-small">
                                <button className="approve-btn" onClick={() => updateClaimStatus(c._id, "approved")}>
                                  Approve
                                </button>
                                <button className="reject-btn" onClick={() => updateClaimStatus(c._id, "rejected")}>
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#666', fontSize: 12 }}>No actions</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Minimal dashboard: Patients, Coverage, Vault, Access, Settings removed */}

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

        </section>
      </main>
    </div>
  );
};

const UploadPolicyDocuments = ({ token }) => {
  const [patientIdentifier, setPatientIdentifier] = React.useState("");
  const [policies, setPolicies] = React.useState([]);
  const [selectedPolicy, setSelectedPolicy] = React.useState("");
  const [files, setFiles] = React.useState([]);
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingPolicies, setLoadingPolicies] = React.useState(false);

  const loadPolicies = async () => {
    if (!patientIdentifier) return;
    try {
      setLoadingPolicies(true);
      setMessage("");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/${encodeURIComponent(patientIdentifier)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setPolicies(list);
      if (list.length > 0) {
        setSelectedPolicy(list[0]._id);
      } else {
        setSelectedPolicy("");
        setMessage("No policies found for this patient");
      }
    } catch (err) {
      setMessage("Failed to load policies");
    } finally {
      setLoadingPolicies(false);
    }
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!selectedPolicy || files.length === 0) {
      setMessage("Select a policy and choose file(s)");
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/${selectedPolicy}/documents`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (!data.success) {
          setMessage(data.message || "Upload failed");
          setLoading(false);
          return;
        }
      }
      setMessage("Uploaded successfully");
      setFiles([]);
    } catch (err) {
      setMessage("Network error during upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      {message && <div className="notifications-error">{message}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Patient ID or Email"
          value={patientIdentifier}
          onChange={(e) => setPatientIdentifier(e.target.value)}
        />
        <button onClick={loadPolicies} disabled={loadingPolicies}>
          {loadingPolicies ? "Loading..." : "Load Policies"}
        </button>
      </div>
      {policies.length > 0 && (
        <select value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)}>
          {policies.map((p) => (
            <option key={p._id} value={p._id}>
              {p.companyName} - {p.policyNumber}
            </option>
          ))}
        </select>
      )}
      <form onSubmit={upload} style={{ display: "grid", gap: 12 }}>
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
};

export default InsuranceDashboard;
