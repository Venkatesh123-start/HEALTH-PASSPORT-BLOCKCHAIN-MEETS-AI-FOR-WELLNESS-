import React, { useEffect, useState, useCallback } from "react";
import { FaPills, FaUserMd, FaCheck, FaShieldAlt, FaInfoCircle } from "react-icons/fa";
import "./Prescriptions.css";

const Prescriptions = ({ token, patientId }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // active, completed, all
  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        filter === "all"
          ? `${process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"}/api/prescriptions/my-prescriptions`
          : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/prescriptions/my-prescriptions?status=${filter}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setPrescriptions(data.data || []);
      } else {
        setError(data.message || "Failed to fetch prescriptions");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const markAsCompleted = async (prescriptionId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/prescriptions/${prescriptionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "completed" }),
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchPrescriptions();
      }
    } catch (err) {
      console.error("Failed to update prescription:", err);
    }
  };

  const verifyPrescription = async (prescriptionId) => {
    setVerifyingId(prescriptionId);
    setVerificationResult(null);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/prescriptions/${prescriptionId}/verify`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (data.success) {
        setVerificationResult({
          id: prescriptionId,
          ...data.data,
        });
      }
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="prescriptions-container">
        <div className="loading-state">Loading prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="prescriptions-container">
      <div className="prescriptions-header">
        <h2>
          <FaPills /> My Prescriptions
        </h2>
        <div className="filter-tabs">
          <button
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
          >
            Active
          </button>
          <button
            className={filter === "completed" ? "active" : ""}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Verification Result Modal */}
      {verificationResult && (
        <div
          className="verification-modal-overlay"
          onClick={() => setVerificationResult(null)}
        >
          <div
            className="verification-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`verification-result ${verificationResult.isValid ? "valid" : "invalid"}`}>
              <span className="verification-icon">
                {verificationResult.isValid ? "✅" : "⚠️"}
              </span>
              <h3>
                {verificationResult.isValid
                  ? "Prescription Verified"
                  : "Verification Failed"}
              </h3>
              <p>{verificationResult.message}</p>

              {verificationResult.blockchainTxHash && (
                <div className="tx-hash">
                  <strong>Blockchain TX:</strong>
                  <code>{verificationResult.blockchainTxHash}</code>
                </div>
              )}

              <button
                className="close-btn"
                onClick={() => setVerificationResult(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💊</span>
          <h3>No {filter !== "all" ? filter : ""} Prescriptions</h3>
          <p>
            {filter === "active"
              ? "You have no active prescriptions at the moment."
              : "No prescriptions found."}
          </p>
        </div>
      ) : (
        <div className="prescriptions-list">
          {prescriptions.map((rx) => (
            <div key={rx._id} className={`prescription-card ${rx.status}`}>
              <div className="prescription-header">
                <div className="doctor-info">
                  <FaUserMd className="doctor-icon" />
                  <div>
                    <span className="doctor-name">
                      Dr. {rx.doctor?.name || "Unknown"}
                    </span>
                    <span className="doctor-specialty">
                      {rx.doctor?.specialty || ""}
                    </span>
                  </div>
                </div>
                <div className="prescription-date">
                  <span className="date">{formatDate(rx.issuedAt)}</span>
                  <span className={`status-badge ${rx.status}`}>
                    {rx.status}
                  </span>
                </div>
              </div>

              {rx.diagnosis && (
                <div className="diagnosis">
                  <strong>Diagnosis:</strong> {rx.diagnosis}
                </div>
              )}

              <div className="medications-grid">
                {rx.medications.map((med, idx) => (
                  <div key={idx} className="medication-item">
                    <div className="med-name">{med.medicationName}</div>
                    <div className="med-details">
                      <span className="dosage">{med.dosage}</span>
                      <span className="divider">•</span>
                      <span className="frequency">{med.frequency}</span>
                      <span className="divider">•</span>
                      <span className="duration">{med.duration}</span>
                    </div>
                    {med.specialInstructions && (
                      <div className="instructions">
                        <FaInfoCircle /> {med.specialInstructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="prescription-actions">
                {rx.blockchainLogged && (
                  <button
                    className="verify-btn"
                    onClick={() => verifyPrescription(rx._id)}
                    disabled={verifyingId === rx._id}
                  >
                    <FaShieldAlt />
                    {verifyingId === rx._id ? "Verifying..." : "Verify Integrity"}
                  </button>
                )}
                {rx.status === "active" && (
                  <button
                    className="complete-btn"
                    onClick={() => markAsCompleted(rx._id)}
                  >
                    <FaCheck /> Mark Completed
                  </button>
                )}
                {rx.blockchainLogged && (
                  <span className="blockchain-badge" title={rx.blockchainTxHash}>
                    ⛓️ On Blockchain
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="security-note">
        <FaShieldAlt />
        <span>
          All prescriptions are cryptographically hashed and logged to the
          blockchain, ensuring they cannot be altered after issuance.
        </span>
      </div>
    </div>
  );
};

export default Prescriptions;
