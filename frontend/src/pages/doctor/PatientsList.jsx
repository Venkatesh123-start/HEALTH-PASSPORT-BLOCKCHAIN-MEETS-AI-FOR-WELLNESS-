import React, { useEffect, useState } from "react";
import "./PatientsList.css";

const PatientsList = ({ token, doctorId }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/doctors/${doctorId}/patients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setPatients(data.data || []);
        } else {
          setError(data.message || "Failed to fetch patients");
        }
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };
    if (doctorId && token) {
      fetchPatients();
    }
  }, [token, doctorId]);

  const handleRevokeAccess = async (patientId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/doctors/${doctorId}/patient/${patientId}/access`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        setPatients(patients.filter((p) => p._id !== patientId));
      } else {
        alert(data.message || "Failed to revoke access");
      }
    } catch (err) {
      console.error("Revoke error:", err);
      alert("Error revoking access");
    }
  };

  if (loading) return <div className="loading">Loading patients...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (patients.length === 0) {
    return (
      <div className="patients-list">
        <h2>Patients List</h2>
        <div className="no-data">
          <i className="fas fa-users" style={{ fontSize: "3rem", color: "#ccc", marginBottom: "1rem" }}></i>
          <p>No patients with access granted yet.</p>
          <p className="hint">Patients will appear here once they request access and you approve them.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patients-list">
      <h2>Patients List</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Last Visit</th>
            <th>Access Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.email}</td>
              <td>{p.age}</td>
              <td>{p.gender}</td>
              <td>{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : "-"}</td>
              <td>
                <span className={`access-badge ${p.accessType}`}>
                  {p.accessType || "full"}
                </span>
              </td>
              <td>
                <button
                  className="revoke-btn"
                  onClick={() => handleRevokeAccess(p._id)}
                >
                  Revoke Access
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PatientsList;