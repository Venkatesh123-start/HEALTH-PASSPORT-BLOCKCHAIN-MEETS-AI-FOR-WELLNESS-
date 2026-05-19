import React, { useEffect, useState } from "react";
import ReviewForm from "./ReviewForm";
import "./DoctorsList.css";

const DoctorsList = ({ token, patientId }) => {
  const [doctors, setDoctors] = useState([]);
  const [accessStatus, setAccessStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [profileModal, setProfileModal] = useState(null);
  useEffect(() => {
    fetchDoctorsAndAccess();
  }, [token, patientId]);

  const fetchDoctorsAndAccess = async () => {
    try {
      setLoading(true);
      // Fetch doctors list
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"}/api/doctors/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDoctors(data.data || []);
        setError(null);

        // Fetch access status for each doctor
        const statusMap = {};
        for (const doc of data.data) {
          try {
            const accessRes = await fetch(
              `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/patients/${patientId}/access-status/${doc._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const accessData = await accessRes.json();
            if (accessData.success) {
              statusMap[doc._id] = accessData.status;
            }
          } catch (e) {
            // No access record exists
            statusMap[doc._id] = null;
          }
        }
        setAccessStatus(statusMap);
      } else {
        setError(data.message || "Failed to load doctors");
      }
    } catch (err) {
      console.error("Fetch doctors error:", err);
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = async (doctorId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/doctors/request-access`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientId, doctorId }),
      });
      const data = await res.json();
      if (data.success) {
        setAccessStatus({ ...accessStatus, [doctorId]: "pending" });
        alert("Access request sent successfully!");
      } else {
        alert(data.message || "Failed to send request");
      }
    } catch (err) {
      console.error("Request access error:", err);
      alert("Error sending access request");
    }
  };

  const getButtonProps = (doctorId) => {
    const status = accessStatus[doctorId];
    if (status === "approved") {
      return { text: "Access Granted", disabled: true, className: "granted" };
    } else if (status === "pending") {
      return { text: "Request Pending", disabled: true, className: "pending" };
    } else if (status === "rejected") {
      return { text: "Request Again", disabled: false, className: "rejected" };
    }
    return { text: "Request Access", disabled: false, className: "" };
  };

  if (loading) return <div className="loading">Loading doctors...</div>;

  return (
    <div className="doctors-wrapper">
      <h2>Available Doctors</h2>
      {error && <p className="error-message">{error}</p>}
      {!error && doctors.length === 0 ? (
        <div className="no-records">
          <p>No doctors available at the moment.</p>
        </div>
      ) : (
        <div className="doctor-grid">
          {doctors.map((doc) => {
            const btnProps = getButtonProps(doc._id);
            return (
              <div key={doc._id} className="doctor-card">
                <h3>Dr. {doc.name}</h3>
                <p><b>Specialty:</b> {doc.specialty || doc.specialization || "General"}</p>
                <p><b>Rating:</b> ⭐ {typeof doc.rating === 'number' ? doc.rating.toFixed(1) : (doc.rating || "4.5")}</p>
                <button
                  onClick={() => requestAccess(doc._id)}
                  disabled={btnProps.disabled}
                  className={btnProps.className}
                >
                  {btnProps.text}
                </button>
                {btnProps.text === "Access Granted" && (
                  <button
                    className="view-profile-btn"
                    onClick={async () => {
                      // Fetch full doctor details if access is granted
                      try {
                        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/doctors/${doc._id}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        console.log('Doctor profile modal data:', data);
                        if (data.success && data.data) {
                          setProfileModal({ ...doc, ...data.data });
                        } else {
                          setProfileModal(doc);
                        }
                      } catch (err) {
                        console.log('Doctor profile modal fetch error:', err);
                        setProfileModal(doc);
                      }
                    }}
                  >
                    View Profile
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Doctor Profile Modal */}
      {profileModal && (
        <div className="modal-overlay" onClick={() => setProfileModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Dr. {profileModal.name}</h2>
            <p><b>Specialty:</b> {profileModal.specialty || profileModal.specialization || "General"}</p>
            <p><b>Rating:</b> ⭐ {typeof profileModal.rating === 'number' ? profileModal.rating.toFixed(1) : (profileModal.rating || "4.5")}</p>
            {/* Show email only if patient has access */}
            {accessStatus[profileModal._id] === "approved" && (
              <p><b>Email:</b> {profileModal.email}</p>
            )}
            {profileModal.licenseNumber && <p><b>License #:</b> {profileModal.licenseNumber}</p>}
            {profileModal.did && <p><b>DID:</b> {profileModal.did}</p>}
            {profileModal.blockchainRegistered !== undefined && (
              <p><b>Blockchain Registered:</b> {profileModal.blockchainRegistered ? "Yes" : "No"}</p>
            )}
            {profileModal.txHash && <p><b>Blockchain TxHash:</b> {profileModal.txHash}</p>}
            {profileModal.phone && <p><b>Phone:</b> {profileModal.phone}</p>}
            {profileModal.availability && <p><b>Availability:</b> {profileModal.availability}</p>}
            {/* Only show review form if patient has access */}
            {accessStatus[profileModal._id] === "approved" && (
              <div style={{marginTop: 16}}>
                <h3>Leave a Review</h3>
                <ReviewForm doctorId={profileModal._id} patientId={patientId} token={token} onReviewSubmitted={() => fetchDoctorsAndAccess()} />
              </div>
            )}
            <button onClick={() => setProfileModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsList;
