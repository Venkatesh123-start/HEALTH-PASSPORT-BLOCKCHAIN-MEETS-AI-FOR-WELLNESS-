import React, { useEffect, useState } from "react";
import "./AccessRequests.css";

const AccessRequests = ({ token, doctorId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/doctors/${doctorId}/access-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setRequests(data.data || []);
        } else {
          setError(data.message || "Failed to load requests");
        }
      } catch (err) {
        console.error("Failed to fetch access requests:", err);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };
    if (doctorId && token) {
      fetchRequests();
    }
  }, [token, doctorId]);

  const handleAction = async (patientId, action) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/doctors/${doctorId}/patient/${patientId}/access`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setRequests(requests.filter(req => req.patient._id !== patientId));
        alert(`Access request ${action}d successfully!`);
      } else {
        alert(data.message || "Failed to update request.");
      }
    } catch (err) {
      console.error("Error updating request:", err);
      alert("Error processing request");
    }
  };

  if (loading) return <div className="loading">Loading access requests...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (requests.length === 0) {
    return (
      <div className="access-requests">
        <h2>Patient Access Requests</h2>
        <div className="no-data">
          <i className="fas fa-inbox" style={{ fontSize: "3rem", color: "#ccc", marginBottom: "1rem" }}></i>
          <p>No pending access requests.</p>
          <p className="hint">When patients request access to share their records with you, they'll appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="access-requests">
      <h2>Patient Access Requests ({requests.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Email</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Requested On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req._id}>
              <td>{req.patient?.name || "Unknown"}</td>
              <td>{req.patient?.email || "-"}</td>
              <td>{req.patient?.age || "-"}</td>
              <td>{req.patient?.gender || "-"}</td>
              <td>{new Date(req.createdAt).toLocaleDateString()}</td>
              <td>
                <button
                  className="approve"
                  onClick={() => handleAction(req.patient._id, "approve")}
                >
                  Approve
                </button>
                <button
                  className="reject"
                  onClick={() => handleAction(req.patient._id, "reject")}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccessRequests;
