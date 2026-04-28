import React, { useState, useEffect } from "react";
import {
  FaUserInjured,
  FaHeartbeat,
  FaThermometerHalf,
  FaPills,
  FaPlus,
  FaTrash,
  FaSave,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import api from "../../services/api";
import "./Visits.css";

const Visits = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [recentVisits, setRecentVisits] = useState([]);
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [activeTab, setActiveTab] = useState("new");

  // Visit form state
  const [visitForm, setVisitForm] = useState({
    visitType: "routine",
    chiefComplaint: "",
    symptoms: [],
    diagnosis: "",
    notes: "",
    followUpDate: "",
    vitals: {
      temperature: { value: "", unit: "°F" },
      heartRate: { value: "", unit: "bpm" },
      bloodPressure: { systolic: "", diastolic: "", unit: "mmHg" },
      respiratoryRate: { value: "", unit: "breaths/min" },
      oxygenSaturation: { value: "", unit: "%" },
      weight: { value: "", unit: "kg" },
      height: { value: "", unit: "cm" },
    },
    prescriptions: [],
  });

  const [currentSymptom, setCurrentSymptom] = useState("");
  const [currentPrescription, setCurrentPrescription] = useState({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });

  // Fetch patients on mount
  useEffect(() => {
    fetchPatients();
    fetchRecentVisits();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get("/visits/patients");
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setMessage({ type: "error", text: "Failed to load patients" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentVisits = async () => {
    try {
      const response = await api.get("/visits/doctor?limit=10");
      setRecentVisits(response.data.visits || []);
    } catch (error) {
      console.error("Error fetching visits:", error);
    }
  };

  const handleVitalChange = (field, subfield, value) => {
    setVisitForm((prev) => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: {
          ...prev.vitals[field],
          [subfield]: value,
        },
      },
    }));
  };

  const addSymptom = () => {
    if (currentSymptom.trim()) {
      setVisitForm((prev) => ({
        ...prev,
        symptoms: [...prev.symptoms, currentSymptom.trim()],
      }));
      setCurrentSymptom("");
    }
  };

  const removeSymptom = (index) => {
    setVisitForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index),
    }));
  };

  const addPrescription = () => {
    if (currentPrescription.medication && currentPrescription.dosage) {
      setVisitForm((prev) => ({
        ...prev,
        prescriptions: [...prev.prescriptions, { ...currentPrescription }],
      }));
      setCurrentPrescription({
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      });
    }
  };

  const removePrescription = (index) => {
    setVisitForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPatient) {
      setMessage({ type: "error", text: "Please select a patient" });
      return;
    }

    if (!visitForm.chiefComplaint.trim()) {
      setMessage({ type: "error", text: "Chief complaint is required" });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: "", text: "" });

      const payload = {
        patientId: selectedPatient,
        ...visitForm,
      };

      const visitResponse = await api.post("/visits", payload);
      const visitId = visitResponse.data.visit?._id;

      // If prescriptions were added, create a blockchain-logged prescription record
      if (visitForm.prescriptions.length > 0 && visitId) {
        try {
          // Transform prescriptions to match the Prescription model format
          const medications = visitForm.prescriptions.map((rx) => ({
            medicationName: rx.medication,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            specialInstructions: rx.instructions || "",
            route: "oral",
          }));

          await api.post("/prescriptions", {
            patientId: selectedPatient,
            visitId: visitId,
            medications,
            diagnosis: visitForm.diagnosis || "",
            notes: visitForm.notes || "",
          });

          setMessage({
            type: "success",
            text: "Visit recorded and prescriptions logged to blockchain!",
          });
        } catch (rxError) {
          console.warn("Prescription blockchain logging failed:", rxError);
          setMessage({
            type: "success",
            text: "Visit recorded. Prescription blockchain logging pending.",
          });
        }
      } else {
        setMessage({ type: "success", text: "Visit recorded successfully!" });
      }
      
      // Reset form
      setSelectedPatient("");
      setVisitForm({
        visitType: "routine",
        chiefComplaint: "",
        symptoms: [],
        diagnosis: "",
        notes: "",
        followUpDate: "",
        vitals: {
          temperature: { value: "", unit: "°F" },
          heartRate: { value: "", unit: "bpm" },
          bloodPressure: { systolic: "", diastolic: "", unit: "mmHg" },
          respiratoryRate: { value: "", unit: "breaths/min" },
          oxygenSaturation: { value: "", unit: "%" },
          weight: { value: "", unit: "kg" },
          height: { value: "", unit: "cm" },
        },
        prescriptions: [],
      });

      // Refresh recent visits
      fetchRecentVisits();
    } catch (error) {
      console.error("Error submitting visit:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to record visit",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="visits-container">
      <h2>
        <FaHeartbeat /> Patient Visits
      </h2>
      <p className="subtitle">Record patient visits with vitals and prescriptions</p>

      {/* Tabs */}
      <div className="visits-tabs">
        <button
          className={`tab-btn ${activeTab === "new" ? "active" : ""}`}
          onClick={() => setActiveTab("new")}
        >
          <FaPlus /> New Visit
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <FaHistory /> Recent Visits
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      {/* New Visit Form */}
      {activeTab === "new" && (
        <form className="visit-form" onSubmit={handleSubmit}>
          {/* Patient Selection */}
          <div className="form-section">
            <h3>
              <FaUserInjured /> Select Patient
            </h3>
            <div className="form-group">
              <label>Patient *</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                required
              >
                <option value="">-- Select Patient --</option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Visit Type</label>
                <select
                  value={visitForm.visitType}
                  onChange={(e) =>
                    setVisitForm((prev) => ({ ...prev, visitType: e.target.value }))
                  }
                >
                  <option value="routine">Routine Checkup</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="consultation">Consultation</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
              <div className="form-group">
                <label>Follow-up Date</label>
                <input
                  type="date"
                  value={visitForm.followUpDate}
                  onChange={(e) =>
                    setVisitForm((prev) => ({ ...prev, followUpDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Chief Complaint *</label>
              <textarea
                value={visitForm.chiefComplaint}
                onChange={(e) =>
                  setVisitForm((prev) => ({ ...prev, chiefComplaint: e.target.value }))
                }
                placeholder="Main reason for the visit..."
                required
              />
            </div>
          </div>

          {/* Vitals */}
          <div className="form-section">
            <h3>
              <FaThermometerHalf /> Vitals
            </h3>
            <div className="vitals-grid">
              <div className="vital-item">
                <label>Temperature</label>
                <div className="vital-input">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={visitForm.vitals.temperature.value}
                    onChange={(e) =>
                      handleVitalChange("temperature", "value", e.target.value)
                    }
                  />
                  <span className="unit">°F</span>
                </div>
              </div>

              <div className="vital-item">
                <label>Heart Rate</label>
                <div className="vital-input">
                  <input
                    type="number"
                    placeholder="72"
                    value={visitForm.vitals.heartRate.value}
                    onChange={(e) =>
                      handleVitalChange("heartRate", "value", e.target.value)
                    }
                  />
                  <span className="unit">bpm</span>
                </div>
              </div>

              <div className="vital-item">
                <label>Blood Pressure</label>
                <div className="bp-input">
                  <input
                    type="number"
                    placeholder="120"
                    value={visitForm.vitals.bloodPressure.systolic}
                    onChange={(e) =>
                      handleVitalChange("bloodPressure", "systolic", e.target.value)
                    }
                  />
                  <span>/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={visitForm.vitals.bloodPressure.diastolic}
                    onChange={(e) =>
                      handleVitalChange("bloodPressure", "diastolic", e.target.value)
                    }
                  />
                  <span className="unit">mmHg</span>
                </div>
              </div>

              <div className="vital-item">
                <label>O2 Saturation</label>
                <div className="vital-input">
                  <input
                    type="number"
                    placeholder="98"
                    value={visitForm.vitals.oxygenSaturation.value}
                    onChange={(e) =>
                      handleVitalChange("oxygenSaturation", "value", e.target.value)
                    }
                  />
                  <span className="unit">%</span>
                </div>
              </div>

              <div className="vital-item">
                <label>Weight</label>
                <div className="vital-input">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={visitForm.vitals.weight.value}
                    onChange={(e) =>
                      handleVitalChange("weight", "value", e.target.value)
                    }
                  />
                  <span className="unit">kg</span>
                </div>
              </div>

              <div className="vital-item">
                <label>Height</label>
                <div className="vital-input">
                  <input
                    type="number"
                    placeholder="170"
                    value={visitForm.vitals.height.value}
                    onChange={(e) =>
                      handleVitalChange("height", "value", e.target.value)
                    }
                  />
                  <span className="unit">cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="form-section">
            <h3>Symptoms</h3>
            <div className="symptom-input">
              <input
                type="text"
                value={currentSymptom}
                onChange={(e) => setCurrentSymptom(e.target.value)}
                placeholder="Add a symptom..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())}
              />
              <button type="button" className="add-btn" onClick={addSymptom}>
                <FaPlus />
              </button>
            </div>
            <div className="symptoms-list">
              {visitForm.symptoms.map((symptom, index) => (
                <span key={index} className="symptom-tag">
                  {symptom}
                  <button type="button" onClick={() => removeSymptom(index)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Diagnosis & Notes */}
          <div className="form-section">
            <h3>Diagnosis & Notes</h3>
            <div className="form-group">
              <label>Diagnosis</label>
              <textarea
                value={visitForm.diagnosis}
                onChange={(e) =>
                  setVisitForm((prev) => ({ ...prev, diagnosis: e.target.value }))
                }
                placeholder="Doctor's diagnosis..."
              />
            </div>
            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                value={visitForm.notes}
                onChange={(e) =>
                  setVisitForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Additional notes or observations..."
              />
            </div>
          </div>

          {/* Prescriptions */}
          <div className="form-section">
            <h3>
              <FaPills /> Prescriptions
              <span className="blockchain-note">⛓️ Logged to blockchain</span>
            </h3>
            <div className="prescription-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Medication *</label>
                  <input
                    type="text"
                    value={currentPrescription.medication}
                    onChange={(e) =>
                      setCurrentPrescription((prev) => ({
                        ...prev,
                        medication: e.target.value,
                      }))
                    }
                    placeholder="Medication name"
                  />
                </div>
                <div className="form-group">
                  <label>Dosage *</label>
                  <input
                    type="text"
                    value={currentPrescription.dosage}
                    onChange={(e) =>
                      setCurrentPrescription((prev) => ({
                        ...prev,
                        dosage: e.target.value,
                      }))
                    }
                    placeholder="e.g., 500mg"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency *</label>
                  <input
                    type="text"
                    value={currentPrescription.frequency}
                    onChange={(e) =>
                      setCurrentPrescription((prev) => ({
                        ...prev,
                        frequency: e.target.value,
                      }))
                    }
                    placeholder="e.g., twice daily"
                  />
                </div>
                <div className="form-group">
                  <label>Duration *</label>
                  <input
                    type="text"
                    value={currentPrescription.duration}
                    onChange={(e) =>
                      setCurrentPrescription((prev) => ({
                        ...prev,
                        duration: e.target.value,
                      }))
                    }
                    placeholder="e.g., 7 days"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Special Instructions</label>
                <input
                  type="text"
                  value={currentPrescription.instructions}
                  onChange={(e) =>
                    setCurrentPrescription((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="e.g., Take with food, avoid alcohol"
                />
              </div>
              <button
                type="button"
                className="add-prescription-btn"
                onClick={addPrescription}
              >
                <FaPlus /> {visitForm.prescriptions.length > 0 ? "Add Another Medication" : "Add Medication"}
              </button>
            </div>

            {/* Prescription List */}
            {visitForm.prescriptions.length > 0 && (
              <div className="prescriptions-list">
                <table>
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitForm.prescriptions.map((rx, index) => (
                      <tr key={index}>
                        <td>{rx.medication}</td>
                        <td>{rx.dosage}</td>
                        <td>{rx.frequency}</td>
                        <td>{rx.duration}</td>
                        <td>{rx.instructions || "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => removePrescription(index)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Recording..." : <><FaSave /> Record Visit</>}
          </button>
        </form>
      )}

      {/* Recent Visits History */}
      {activeTab === "history" && (
        <div className="visits-history">
          {recentVisits.length === 0 ? (
            <div className="no-data">No visits recorded yet.</div>
          ) : (
            <div className="visits-list">
              {recentVisits.map((visit) => (
                <div key={visit._id} className="visit-card">
                  <div
                    className="visit-header"
                    onClick={() =>
                      setExpandedVisit(expandedVisit === visit._id ? null : visit._id)
                    }
                  >
                    <div className="visit-info">
                      <strong>{visit.patient?.name || "Unknown Patient"}</strong>
                      <span className={`visit-type ${visit.visitType}`}>
                        {visit.visitType}
                      </span>
                    </div>
                    <div className="visit-meta">
                      <span>{formatDate(visit.visitDate)}</span>
                      {expandedVisit === visit._id ? (
                        <FaChevronUp />
                      ) : (
                        <FaChevronDown />
                      )}
                    </div>
                  </div>

                  {expandedVisit === visit._id && (
                    <div className="visit-details">
                      <div className="detail-row">
                        <label>Chief Complaint:</label>
                        <span>{visit.chiefComplaint}</span>
                      </div>

                      {visit.diagnosis && (
                        <div className="detail-row">
                          <label>Diagnosis:</label>
                          <span>{visit.diagnosis}</span>
                        </div>
                      )}

                      {visit.vitals && (
                        <div className="vitals-summary">
                          <h4>Vitals:</h4>
                          <div className="vitals-grid-compact">
                            {visit.vitals.temperature?.value && (
                              <span>Temp: {visit.vitals.temperature.value}°F</span>
                            )}
                            {visit.vitals.heartRate?.value && (
                              <span>HR: {visit.vitals.heartRate.value} bpm</span>
                            )}
                            {visit.vitals.bloodPressure?.systolic && (
                              <span>
                                BP: {visit.vitals.bloodPressure.systolic}/
                                {visit.vitals.bloodPressure.diastolic} mmHg
                              </span>
                            )}
                            {visit.vitals.oxygenSaturation?.value && (
                              <span>O2: {visit.vitals.oxygenSaturation.value}%</span>
                            )}
                          </div>
                        </div>
                      )}

                      {visit.prescriptions?.length > 0 && (
                        <div className="prescriptions-summary">
                          <h4>Prescriptions:</h4>
                          <ul>
                            {visit.prescriptions.map((rx, idx) => (
                              <li key={idx}>
                                <strong>{rx.medication}</strong> - {rx.dosage},{" "}
                                {rx.frequency} for {rx.duration}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Visits;
