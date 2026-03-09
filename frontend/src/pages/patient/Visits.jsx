import React, { useState, useEffect } from "react";
import {
  FaStethoscope,
  FaChevronDown,
  FaChevronUp,
  FaPills,
  FaHeartbeat,
  FaCalendarAlt,
  FaUserMd,
} from "react-icons/fa";
import api from "../../services/api";
import "./Visits.css";

const Visits = ({ patientId }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  useEffect(() => {
    if (patientId) {
      fetchVisits();
    }
  }, [patientId]);

  const fetchVisits = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/visits/patient/${patientId}?page=${page}&limit=10`);
      setVisits(response.data.visits || []);
      setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Error fetching visits:", err);
      setError("Failed to load visits. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (visitId) => {
    setExpandedVisit(expandedVisit === visitId ? null : visitId);
  };

  if (loading) {
    return <div className="loading">Loading your visits...</div>;
  }

  return (
    <div className="patient-visits-container">
      <h2>
        <FaStethoscope /> My Visits
      </h2>
      <p className="subtitle">View your doctor visits, vitals, and prescriptions</p>

      {error && <div className="error-message">{error}</div>}

      {visits.length === 0 ? (
        <div className="no-visits">
          <FaCalendarAlt className="no-visits-icon" />
          <h3>No visits recorded yet</h3>
          <p>Your visit history will appear here after you see a doctor.</p>
        </div>
      ) : (
        <>
          <div className="visits-summary">
            <div className="summary-card">
              <FaStethoscope />
              <div>
                <span className="number">{pagination.total}</span>
                <span className="label">Total Visits</span>
              </div>
            </div>
          </div>

          <div className="visits-list">
            {visits.map((visit) => (
              <div key={visit._id} className="visit-card">
                {/* Visit Header */}
                <div
                  className="visit-header"
                  onClick={() => toggleExpand(visit._id)}
                >
                  <div className="visit-main-info">
                    <div className="visit-date">
                      <FaCalendarAlt />
                      <span>{formatDate(visit.visitDate)}</span>
                      <span className="time">{formatTime(visit.visitDate)}</span>
                    </div>
                    <span className={`visit-type-badge ${visit.visitType}`}>
                      {visit.visitType}
                    </span>
                  </div>

                  <div className="visit-doctor">
                    <FaUserMd />
                    <span>Dr. {visit.doctor?.name || "Unknown"}</span>
                  </div>

                  <div className="visit-complaint">
                    <strong>Reason:</strong> {visit.chiefComplaint}
                  </div>

                  <div className="expand-icon">
                    {expandedVisit === visit._id ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedVisit === visit._id && (
                  <div className="visit-details">
                    {/* Vitals Section */}
                    {visit.vitals && (
                      <div className="details-section">
                        <h4>
                          <FaHeartbeat /> Vitals Recorded
                        </h4>
                        <div className="vitals-grid">
                          {visit.vitals.temperature?.value && (
                            <div className="vital-item">
                              <span className="vital-label">Temperature</span>
                              <span className="vital-value">
                                {visit.vitals.temperature.value}°F
                              </span>
                            </div>
                          )}
                          {visit.vitals.heartRate?.value && (
                            <div className="vital-item">
                              <span className="vital-label">Heart Rate</span>
                              <span className="vital-value">
                                {visit.vitals.heartRate.value} bpm
                              </span>
                            </div>
                          )}
                          {visit.vitals.bloodPressure?.systolic && (
                            <div className="vital-item">
                              <span className="vital-label">Blood Pressure</span>
                              <span className="vital-value">
                                {visit.vitals.bloodPressure.systolic}/
                                {visit.vitals.bloodPressure.diastolic} mmHg
                              </span>
                            </div>
                          )}
                          {visit.vitals.oxygenSaturation?.value && (
                            <div className="vital-item">
                              <span className="vital-label">O2 Saturation</span>
                              <span className="vital-value">
                                {visit.vitals.oxygenSaturation.value}%
                              </span>
                            </div>
                          )}
                          {visit.vitals.weight?.value && (
                            <div className="vital-item">
                              <span className="vital-label">Weight</span>
                              <span className="vital-value">
                                {visit.vitals.weight.value} kg
                              </span>
                            </div>
                          )}
                          {visit.vitals.height?.value && (
                            <div className="vital-item">
                              <span className="vital-label">Height</span>
                              <span className="vital-value">
                                {visit.vitals.height.value} cm
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Symptoms */}
                    {visit.symptoms && visit.symptoms.length > 0 && (
                      <div className="details-section">
                        <h4>Symptoms</h4>
                        <div className="symptoms-tags">
                          {visit.symptoms.map((symptom, idx) => (
                            <span key={idx} className="symptom-tag">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Diagnosis */}
                    {visit.diagnosis && (
                      <div className="details-section">
                        <h4>Diagnosis</h4>
                        <p className="diagnosis-text">{visit.diagnosis}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {visit.notes && (
                      <div className="details-section">
                        <h4>Doctor's Notes</h4>
                        <p className="notes-text">{visit.notes}</p>
                      </div>
                    )}

                    {/* Prescriptions */}
                    {visit.prescriptions && visit.prescriptions.length > 0 && (
                      <div className="details-section prescriptions-section">
                        <h4>
                          <FaPills /> Prescriptions
                        </h4>
                        <div className="prescriptions-grid">
                          {visit.prescriptions.map((rx, idx) => (
                            <div key={idx} className="prescription-card">
                              <div className="rx-header">
                                <span className="rx-name">{rx.medication}</span>
                                <span className="rx-dosage">{rx.dosage}</span>
                              </div>
                              <div className="rx-details">
                                <div className="rx-row">
                                  <span className="rx-label">Frequency:</span>
                                  <span>{rx.frequency}</span>
                                </div>
                                <div className="rx-row">
                                  <span className="rx-label">Duration:</span>
                                  <span>{rx.duration}</span>
                                </div>
                                {rx.instructions && (
                                  <div className="rx-instructions">
                                    <span className="rx-label">Instructions:</span>
                                    <span>{rx.instructions}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Date */}
                    {visit.followUpDate && (
                      <div className="follow-up-notice">
                        <FaCalendarAlt />
                        <span>
                          Follow-up scheduled: <strong>{formatDate(visit.followUpDate)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchVisits(pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchVisits(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Visits;
