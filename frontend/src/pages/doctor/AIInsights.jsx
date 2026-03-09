import React, { useEffect, useState } from "react";
import {
  FaRobot,
  FaUserInjured,
  FaThermometerHalf,
  FaHeartbeat,
  FaTint,
  FaLungs,
  FaWeight,
  FaRulerVertical,
  FaProcedures,
  FaHistory,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import API from "../../services/api";
import "./AIInsights.css";

// Available symptoms for checkboxes
const SYMPTOMS = [
  { id: "fever", label: "Fever", icon: "🌡️" },
  { id: "cough", label: "Cough", icon: "🤧" },
  { id: "fatigue", label: "Fatigue", icon: "😴" },
  { id: "headache", label: "Headache", icon: "🤕" },
  { id: "shortness_of_breath", label: "Shortness of Breath", icon: "😮‍💨" },
  { id: "chest_pain", label: "Chest Pain", icon: "💔" },
  { id: "nausea", label: "Nausea", icon: "🤢" },
  { id: "dizziness", label: "Dizziness", icon: "😵" },
  { id: "muscle_pain", label: "Muscle Pain", icon: "💪" },
  { id: "sore_throat", label: "Sore Throat", icon: "🗣️" },
];

// Vital signs configuration
const VITAL_SIGNS = [
  { id: "temperature", label: "Temperature", unit: "°F", icon: FaThermometerHalf, min: 95, max: 106, step: 0.1, default: 98.6 },
  { id: "heartRate", label: "Heart Rate", unit: "bpm", icon: FaHeartbeat, min: 40, max: 200, step: 1, default: 72 },
  { id: "systolicBP", label: "Systolic BP", unit: "mmHg", icon: FaTint, min: 70, max: 250, step: 1, default: 120 },
  { id: "diastolicBP", label: "Diastolic BP", unit: "mmHg", icon: FaTint, min: 40, max: 150, step: 1, default: 80 },
  { id: "respiratoryRate", label: "Resp. Rate", unit: "/min", icon: FaLungs, min: 8, max: 40, step: 1, default: 16 },
  { id: "oxygenSaturation", label: "O2 Saturation", unit: "%", icon: FaLungs, min: 70, max: 100, step: 1, default: 98 },
  { id: "weight", label: "Weight", unit: "kg", icon: FaWeight, min: 20, max: 300, step: 0.1, default: 70 },
  { id: "height", label: "Height", unit: "cm", icon: FaRulerVertical, min: 50, max: 250, step: 1, default: 170 },
  { id: "bloodGlucose", label: "Blood Glucose", unit: "mg/dL", icon: FaProcedures, min: 50, max: 500, step: 1, default: 100 },
];

const AIInsights = ({ token, doctorId }) => {
  const [activeTab, setActiveTab] = useState("predict");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [vitals, setVitals] = useState(
    VITAL_SIGNS.reduce((acc, v) => ({ ...acc, [v.id]: v.default }), {})
  );
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch patients for dropdown
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await API.get("/visits/patients");
        setPatients(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
      } finally {
        setPatientsLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // Handle symptom checkbox toggle
  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((s) => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  // Handle vital sign input change
  const handleVitalChange = (vitalId, value) => {
    setVitals((prev) => ({
      ...prev,
      [vitalId]: parseFloat(value) || 0,
    }));
  };

  // Submit prediction request
  const handlePredict = async (e) => {
    e.preventDefault();
    setError("");
    setResults(null);

    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }

    if (selectedSymptoms.length === 0) {
      setError("Please select at least one symptom");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/predict", {
        patientId: selectedPatient,
        symptoms: selectedSymptoms,
        vitals,
      });

      if (response.data.success) {
        setResults(response.data.data);
      } else {
        setError(response.data.message || "Prediction failed");
      }
    } catch (err) {
      console.error("Prediction error:", err);
      setError(err.response?.data?.message || "Failed to get prediction");
    } finally {
      setLoading(false);
    }
  };

  // Fetch prediction history
  const fetchHistory = async () => {
    if (!selectedPatient) return;
    
    setHistoryLoading(true);
    try {
      const response = await API.get(`/predict/history/${selectedPatient}`);
      setHistory(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load history when switching to history tab or when patient changes
  useEffect(() => {
    if (activeTab === "history" && selectedPatient) {
      fetchHistory();
    }
  }, [activeTab, selectedPatient]);

  // Get color for confidence level
  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return "#e74c3c"; // High risk - red
    if (confidence >= 40) return "#f39c12"; // Medium - orange
    return "#27ae60"; // Low - green
  };

  // Reset form
  const resetForm = () => {
    setSelectedSymptoms([]);
    setVitals(VITAL_SIGNS.reduce((acc, v) => ({ ...acc, [v.id]: v.default }), {}));
    setResults(null);
    setError("");
  };

  return (
    <div className="ai-insights">
      <div className="ai-header">
        <h2>
          <FaRobot /> AI Disease Prediction
        </h2>
        <p>Use AI to predict potential diseases based on symptoms and vital signs</p>
      </div>

      {/* Tab Navigation */}
      <div className="ai-tabs">
        <button
          className={`tab-btn ${activeTab === "predict" ? "active" : ""}`}
          onClick={() => setActiveTab("predict")}
        >
          <FaChartBar /> Predict Disease
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <FaHistory /> Prediction History
        </button>
      </div>

      {/* Predict Tab */}
      {activeTab === "predict" && (
        <div className="predict-section">
          <form onSubmit={handlePredict}>
            {/* Patient Selection */}
            <div className="form-section">
              <h3>
                <FaUserInjured /> Select Patient
              </h3>
              <select
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value);
                  setResults(null);
                }}
                className="patient-select"
                disabled={patientsLoading}
              >
                <option value="">
                  {patientsLoading ? "Loading patients..." : "-- Select a Patient --"}
                </option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Symptoms Checkboxes */}
            <div className="form-section">
              <h3>🩺 Symptoms (Select all that apply)</h3>
              <div className="symptoms-grid">
                {SYMPTOMS.map((symptom) => (
                  <label
                    key={symptom.id}
                    className={`symptom-checkbox ${
                      selectedSymptoms.includes(symptom.id) ? "checked" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.includes(symptom.id)}
                      onChange={() => toggleSymptom(symptom.id)}
                    />
                    <span className="symptom-icon">{symptom.icon}</span>
                    <span className="symptom-label">{symptom.label}</span>
                    {selectedSymptoms.includes(symptom.id) && (
                      <FaCheckCircle className="check-icon" />
                    )}
                  </label>
                ))}
              </div>
              <p className="symptom-count">
                {selectedSymptoms.length} symptom(s) selected
              </p>
            </div>

            {/* Vital Signs Inputs */}
            <div className="form-section">
              <h3>📊 Vital Signs</h3>
              <div className="vitals-grid">
                {VITAL_SIGNS.map((vital) => {
                  const Icon = vital.icon;
                  return (
                    <div key={vital.id} className="vital-input-group">
                      <label>
                        <Icon /> {vital.label}
                      </label>
                      <div className="vital-input-wrapper">
                        <input
                          type="number"
                          value={vitals[vital.id]}
                          onChange={(e) => handleVitalChange(vital.id, e.target.value)}
                          min={vital.min}
                          max={vital.max}
                          step={vital.step}
                        />
                        <span className="unit">{vital.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-message">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="form-actions">
              <button type="submit" className="predict-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Analyzing...
                  </>
                ) : (
                  <>
                    <FaRobot /> Get AI Prediction
                  </>
                )}
              </button>
              <button type="button" className="reset-btn" onClick={resetForm}>
                Reset Form
              </button>
            </div>
          </form>

          {/* Results Display */}
          {results && (
            <div className="results-section">
              <h3>🎯 Prediction Results</h3>
              <div className="results-header">
                <p>
                  <strong>Patient:</strong> {results.patient?.name}
                </p>
                <p>
                  <strong>Analyzed:</strong>{" "}
                  {new Date(results.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="top-prediction">
                <h4>Top Prediction</h4>
                <div className="top-disease">
                  <span className="disease-name">{results.topPrediction}</span>
                  <span
                    className="confidence-badge"
                    style={{ backgroundColor: getConfidenceColor(results.overallConfidence) }}
                  >
                    {results.overallConfidence}% confidence
                  </span>
                </div>
              </div>

              <div className="all-predictions">
                <h4>All Predictions</h4>
                {results.results.map((result, index) => (
                  <div key={index} className="prediction-item">
                    <div className="prediction-info">
                      <span className="rank">#{index + 1}</span>
                      <span className="disease-name">{result.disease}</span>
                      <span className="confidence-value">{result.confidence}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${result.confidence}%`,
                          backgroundColor: getConfidenceColor(result.confidence),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="analysis-summary">
                <h4>Analysis Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <strong>Symptoms Analyzed:</strong>
                    <div className="symptom-tags">
                      {results.symptoms.map((s) => (
                        <span key={s} className="symptom-tag">
                          {SYMPTOMS.find((sym) => sym.id === s)?.label || s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="summary-item">
                    <strong>Key Vitals:</strong>
                    <ul className="vitals-summary">
                      <li>Temperature: {results.vitals.temperature}°F</li>
                      <li>Heart Rate: {results.vitals.heartRate} bpm</li>
                      <li>
                        Blood Pressure: {results.vitals.systolicBP}/
                        {results.vitals.diastolicBP} mmHg
                      </li>
                      <li>O2 Saturation: {results.vitals.oxygenSaturation}%</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="disclaimer">
                <FaExclamationTriangle />
                <p>
                  <strong>Disclaimer:</strong> This AI prediction is for reference only
                  and should not replace professional medical diagnosis. Always consult
                  with healthcare providers for accurate diagnosis and treatment.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="history-section">
          {!selectedPatient ? (
            <div className="no-patient-selected">
              <p>Please select a patient above to view their prediction history.</p>
            </div>
          ) : historyLoading ? (
            <div className="loading">Loading prediction history...</div>
          ) : history.length === 0 ? (
            <div className="no-history">
              <p>No prediction history found for this patient.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((prediction) => (
                <div key={prediction._id} className="history-card">
                  <div className="history-header">
                    <span className="history-date">
                      {new Date(prediction.createdAt).toLocaleDateString()}
                    </span>
                    <span className="history-time">
                      {new Date(prediction.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="history-top">
                    <span className="top-prediction-label">Top Prediction:</span>
                    <span className="top-prediction-value">{prediction.topPrediction}</span>
                    <span
                      className="confidence-badge small"
                      style={{ backgroundColor: getConfidenceColor(prediction.overallConfidence) }}
                    >
                      {prediction.overallConfidence}%
                    </span>
                  </div>
                  <div className="history-results">
                    {prediction.results.map((result, index) => (
                      <div key={index} className="mini-progress">
                        <span className="mini-disease">{result.disease}</span>
                        <div className="mini-bar-container">
                          <div
                            className="mini-bar"
                            style={{
                              width: `${result.confidence}%`,
                              backgroundColor: getConfidenceColor(result.confidence),
                            }}
                          />
                        </div>
                        <span className="mini-confidence">{result.confidence}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="history-symptoms">
                    <strong>Symptoms:</strong>{" "}
                    {prediction.symptoms
                      .map((s) => SYMPTOMS.find((sym) => sym.id === s)?.label || s)
                      .join(", ")}
                  </div>
                  {prediction.requestedBy && (
                    <div className="history-doctor">
                      <small>Requested by: Dr. {prediction.requestedBy.name}</small>
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

export default AIInsights;