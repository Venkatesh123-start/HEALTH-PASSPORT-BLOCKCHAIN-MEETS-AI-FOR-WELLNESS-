import React, { useEffect, useState, useCallback } from "react";
import {
  FaRobot,
  FaHistory,
  FaChartBar,
  FaCalendarAlt,
  FaUserMd,
  FaExclamationTriangle,
  FaHeartbeat,
  FaStethoscope,
  FaLightbulb,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import API from "../../services/api";
import "./PredictDisease.css";

// Symptoms configuration
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

// Vitals configuration
const VITALS_CONFIG = [
  { id: "temperature", label: "Temperature (°F)", placeholder: "98.6", min: 95, max: 106, step: 0.1 },
  { id: "heartRate", label: "Heart Rate (bpm)", placeholder: "72", min: 40, max: 200, step: 1 },
  { id: "systolicBP", label: "Systolic BP (mmHg)", placeholder: "120", min: 70, max: 250, step: 1 },
  { id: "diastolicBP", label: "Diastolic BP (mmHg)", placeholder: "80", min: 40, max: 150, step: 1 },
  { id: "respiratoryRate", label: "Respiratory Rate (/min)", placeholder: "16", min: 8, max: 40, step: 1 },
  { id: "oxygenSaturation", label: "Oxygen Saturation (%)", placeholder: "98", min: 70, max: 100, step: 1 },
  { id: "weight", label: "Weight (kg)", placeholder: "70", min: 20, max: 300, step: 0.1 },
  { id: "height", label: "Height (cm)", placeholder: "170", min: 100, max: 250, step: 1 },
  { id: "bloodGlucose", label: "Blood Glucose (mg/dL)", placeholder: "100", min: 50, max: 500, step: 1 },
];

const PredictDisease = ({ token, patientId }) => {
  const [activeTab, setActiveTab] = useState("check"); // 'check' or 'history'
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Form state
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [vitals, setVitals] = useState({
    temperature: "",
    heartRate: "",
    systolicBP: "",
    diastolicBP: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bloodGlucose: "",
  });

  // Result state
  const [result, setResult] = useState(null);

  // Fetch prediction history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await API.get("/predict/my-predictions");
      setPredictions(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Toggle symptom selection
  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((s) => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  // Handle vital change
  const handleVitalChange = (vitalId, value) => {
    setVitals((prev) => ({ ...prev, [vitalId]: value }));
  };

  // Submit wellness check
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (selectedSymptoms.length === 0) {
      setError("Please select at least one symptom");
      return;
    }

    // Prepare vitals - convert to numbers or use defaults
    const preparedVitals = {};
    VITALS_CONFIG.forEach((v) => {
      preparedVitals[v.id] = vitals[v.id] ? parseFloat(vitals[v.id]) : null;
    });

    setLoading(true);
    try {
      const res = await API.post("/predict/self", {
        symptoms: selectedSymptoms,
        vitals: preparedVitals,
      });

      if (res.data.success) {
        setResult(res.data.data);
        fetchHistory(); // Refresh history
      } else {
        setError(res.data.message || "Prediction failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to get prediction");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedSymptoms([]);
    setVitals({
      temperature: "",
      heartRate: "",
      systolicBP: "",
      diastolicBP: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      weight: "",
      height: "",
      bloodGlucose: "",
    });
    setResult(null);
    setError(null);
  };

  // Get color based on confidence
  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return "#e74c3c";
    if (confidence >= 40) return "#f39c12";
    return "#27ae60";
  };

  // Get wellness score color
  const getWellnessColor = (score) => {
    if (score >= 80) return "#27ae60"; // Green - healthy
    if (score >= 60) return "#2ecc71"; // Light green
    if (score >= 40) return "#f39c12"; // Orange - caution
    if (score >= 20) return "#e67e22"; // Dark orange
    return "#e74c3c"; // Red - concerning
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="predict-container">
      {/* Medical Disclaimer - Prominent */}
      <div className="medical-disclaimer">
        <FaExclamationTriangle className="disclaimer-icon" />
        <div>
          <strong>Medical Disclaimer</strong>
          <p>
            This is an AI-generated prediction for wellness monitoring and does not
            replace professional medical advice. Always consult a qualified healthcare
            provider for diagnosis and treatment decisions.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="predict-tabs">
        <button
          className={activeTab === "check" ? "active" : ""}
          onClick={() => setActiveTab("check")}
        >
          <FaStethoscope /> Wellness Check
        </button>
        <button
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          <FaHistory /> My History
        </button>
      </div>

      {/* Wellness Check Tab */}
      {activeTab === "check" && (
        <div className="wellness-check-panel">
          {!result ? (
            <form onSubmit={handleSubmit} className="wellness-form">
              <div className="form-header">
                <h2>
                  <FaRobot /> AI Wellness Check
                </h2>
                <p>Select your symptoms and enter vital signs for AI-powered health insights</p>
              </div>

              {error && <div className="error-banner">{error}</div>}

              {/* Symptoms Section */}
              <div className="form-section">
                <h3>
                  <span className="section-number">1</span>
                  Select Your Symptoms
                </h3>
                <div className="symptoms-grid">
                  {SYMPTOMS.map((symptom) => (
                    <label
                      key={symptom.id}
                      className={`symptom-checkbox ${
                        selectedSymptoms.includes(symptom.id) ? "selected" : ""
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
              </div>

              {/* Vitals Section */}
              <div className="form-section">
                <h3>
                  <span className="section-number">2</span>
                  Enter Your Vital Signs
                  <span className="optional-badge">Optional but recommended</span>
                </h3>
                <div className="vitals-input-grid">
                  {VITALS_CONFIG.map((vital) => (
                    <div key={vital.id} className="vital-input-group">
                      <label htmlFor={vital.id}>{vital.label}</label>
                      <input
                        type="number"
                        id={vital.id}
                        placeholder={vital.placeholder}
                        value={vitals[vital.id]}
                        onChange={(e) => handleVitalChange(vital.id, e.target.value)}
                        min={vital.min}
                        max={vital.max}
                        step={vital.step}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-small"></span> Analyzing...
                    </>
                  ) : (
                    <>
                      <FaHeartbeat /> Get Wellness Analysis
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Result Display */
            <div className="wellness-result">
              <div className="result-header">
                <h2>
                  <FaCheckCircle /> Analysis Complete
                </h2>
                <button className="new-check-btn" onClick={resetForm}>
                  <FaTimes /> New Check
                </button>
              </div>

              {/* Wellness Score Circle */}
              <div className="wellness-score-section">
                <div
                  className="wellness-circle"
                  style={{
                    background: `conic-gradient(${getWellnessColor(
                      result.wellnessScore
                    )} ${result.wellnessScore * 3.6}deg, #ecf0f1 0deg)`,
                  }}
                >
                  <div className="wellness-inner">
                    <span className="score-value">{result.wellnessScore}</span>
                    <span className="score-label">Wellness Score</span>
                  </div>
                </div>
                <div className="score-interpretation">
                  {result.wellnessScore >= 80 && (
                    <p className="good">Your vitals and symptoms indicate good overall health.</p>
                  )}
                  {result.wellnessScore >= 60 && result.wellnessScore < 80 && (
                    <p className="moderate">Some mild concerns detected. Monitor your symptoms.</p>
                  )}
                  {result.wellnessScore >= 40 && result.wellnessScore < 60 && (
                    <p className="caution">Consider consulting a healthcare provider.</p>
                  )}
                  {result.wellnessScore < 40 && (
                    <p className="warning">Please seek medical attention soon.</p>
                  )}
                </div>
              </div>

              {/* Top 3 Predictions */}
              <div className="predictions-section">
                <h3>
                  <FaChartBar /> Potential Conditions
                </h3>
                <div className="predictions-results">
                  {result.results.map((pred, index) => (
                    <div key={index} className="result-item">
                      <div className="result-info">
                        <span className="rank">#{index + 1}</span>
                        <span className="disease-name">{pred.disease}</span>
                        <span className="confidence-value">{pred.confidence}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${pred.confidence}%`,
                            backgroundColor: getConfidenceColor(pred.confidence),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="recommendations-section">
                  <h3>
                    <FaLightbulb /> Recommended Next Steps
                  </h3>
                  <ul className="recommendations-list">
                    {result.recommendations.map((rec, index) => (
                      <li key={index}>
                        <FaCheckCircle className="rec-icon" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Symptoms Analyzed */}
              <div className="analyzed-section">
                <h4>🩺 Symptoms Analyzed</h4>
                <div className="symptom-tags">
                  {result.symptoms.map((symptomId) => {
                    const symptom = SYMPTOMS.find((s) => s.id === symptomId);
                    return (
                      <span key={symptomId} className="symptom-tag">
                        {symptom?.icon || "•"} {symptom?.label || symptomId}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Disclaimer in result */}
              <div className="disclaimer result-disclaimer">
                <FaExclamationTriangle />
                <p>
                  This AI prediction is for informational purposes only and does not
                  constitute a medical diagnosis. Always consult with your healthcare
                  provider for proper diagnosis and treatment.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="history-panel">
          <div className="predict-header">
            <h2>
              <FaHistory /> Prediction History
            </h2>
            <p>View your previous wellness check results</p>
          </div>

          {historyLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading history...</p>
            </div>
          ) : predictions.length === 0 ? (
            <div className="no-predictions">
              <FaChartBar className="empty-icon" />
              <h3>No Predictions Yet</h3>
              <p>
                Run a wellness check to get AI-powered health insights. Your prediction
                history will appear here.
              </p>
              <button className="go-check-btn" onClick={() => setActiveTab("check")}>
                <FaStethoscope /> Start Wellness Check
              </button>
            </div>
          ) : (
            <div className="predictions-list">
              {predictions.map((prediction) => (
                <div
                  key={prediction._id}
                  className={`prediction-card ${
                    expandedId === prediction._id ? "expanded" : ""
                  }`}
                >
                  <div
                    className="prediction-header"
                    onClick={() =>
                      setExpandedId(expandedId === prediction._id ? null : prediction._id)
                    }
                  >
                    <div className="prediction-main">
                      <span className="top-disease">{prediction.topPrediction}</span>
                      <span
                        className="confidence-badge"
                        style={{
                          backgroundColor: getConfidenceColor(prediction.overallConfidence),
                        }}
                      >
                        {prediction.overallConfidence}%
                      </span>
                      {prediction.wellnessScore !== undefined && (
                        <span
                          className="wellness-badge"
                          style={{
                            backgroundColor: getWellnessColor(prediction.wellnessScore),
                          }}
                        >
                          Wellness: {prediction.wellnessScore}%
                        </span>
                      )}
                    </div>
                    <div className="prediction-meta">
                      <span className="prediction-date">
                        <FaCalendarAlt /> {formatDate(prediction.createdAt)}
                      </span>
                      {prediction.initiatedBy && (
                        <span className="initiated-by">
                          {prediction.initiatedBy === "patient" ? "Self-check" : (
                            <>
                              <FaUserMd /> Dr. {prediction.requestedBy?.name}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="expand-icon">
                      {expandedId === prediction._id ? "▲" : "▼"}
                    </span>
                  </div>

                  {expandedId === prediction._id && (
                    <div className="prediction-details">
                      {/* All Predictions */}
                      <div className="detail-section">
                        <h4>
                          <FaChartBar /> Prediction Results
                        </h4>
                        <div className="predictions-results">
                          {prediction.results.map((result, index) => (
                            <div key={index} className="result-item">
                              <div className="result-info">
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
                      </div>

                      {/* Recommendations */}
                      {prediction.recommendations && prediction.recommendations.length > 0 && (
                        <div className="detail-section">
                          <h4>
                            <FaLightbulb /> Recommendations
                          </h4>
                          <ul className="recommendations-list compact">
                            {prediction.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Symptoms */}
                      <div className="detail-section">
                        <h4>🩺 Symptoms</h4>
                        <div className="symptom-tags">
                          {prediction.symptoms.map((symptomId) => {
                            const symptom = SYMPTOMS.find((s) => s.id === symptomId);
                            return (
                              <span key={symptomId} className="symptom-tag">
                                {symptom?.icon || "•"} {symptom?.label || symptomId}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Vitals */}
                      {prediction.vitals && (
                        <div className="detail-section">
                          <h4>📊 Vitals</h4>
                          <div className="vitals-grid">
                            {prediction.vitals.temperature && (
                              <div className="vital-item">
                                <span className="vital-label">Temperature</span>
                                <span className="vital-value">{prediction.vitals.temperature}°F</span>
                              </div>
                            )}
                            {prediction.vitals.heartRate && (
                              <div className="vital-item">
                                <span className="vital-label">Heart Rate</span>
                                <span className="vital-value">{prediction.vitals.heartRate} bpm</span>
                              </div>
                            )}
                            {prediction.vitals.systolicBP && prediction.vitals.diastolicBP && (
                              <div className="vital-item">
                                <span className="vital-label">Blood Pressure</span>
                                <span className="vital-value">
                                  {prediction.vitals.systolicBP}/{prediction.vitals.diastolicBP} mmHg
                                </span>
                              </div>
                            )}
                            {prediction.vitals.oxygenSaturation && (
                              <div className="vital-item">
                                <span className="vital-label">O2 Saturation</span>
                                <span className="vital-value">{prediction.vitals.oxygenSaturation}%</span>
                              </div>
                            )}
                          </div>
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

export default PredictDisease;
