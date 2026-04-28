import React, { useEffect, useState } from "react";
import { FaExclamationTriangle, FaCheckCircle, FaExclamationCircle, FaSync } from "react-icons/fa";
import "./RiskScore.css";

const RiskScore = ({ token, patientId }) => {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token && patientId) {
      fetchRisk();
    }
  }, [token, patientId]);

  const fetchRisk = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `http://localhost:5000/api/ai/risk/${patientId}?t=${Date.now()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success) {
        setRisk(data.data);
      } else {
        setError(data.message || "Failed to calculate risk score");
      }
    } catch (err) {
      console.error("Risk fetch error:", err);
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="risk-loading">
        <FaSync className="spin" />
        <p>Calculating Risk Score...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="risk-error">
        <FaExclamationCircle />
        <p>{error}</p>
        <button onClick={fetchRisk}>Retry</button>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="risk-empty">
        <p>No risk data available. Please update your vitals.</p>
      </div>
    );
  }

  const riskClass =
    risk.level === "High" ? "risk-high" :
    risk.level === "Medium" ? "risk-medium" :
    "risk-low";

  const RiskIcon = risk.level === "High" ? FaExclamationTriangle :
                   risk.level === "Medium" ? FaExclamationCircle :
                   FaCheckCircle;

  return (
    <div className="risk-wrapper">
      <div className={`risk-card ${riskClass}`}>
        <div className="risk-header">
          <RiskIcon className="risk-icon" />
          <h2>Health Risk Assessment</h2>
        </div>
        
        <div className="risk-score-display">
          <div className="score-circle">
            <span className="score-value">{risk.score}</span>
            <span className="score-label">/ 100</span>
          </div>
          <div className="risk-level">
            <span className={`level-badge ${riskClass}`}>{risk.level} Risk</span>
          </div>
        </div>

        {risk.factors && risk.factors.length > 0 && (
          <div className="risk-factors">
            <h3>Risk Factors</h3>
            <ul>
              {risk.factors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {risk.recommendations && risk.recommendations.length > 0 && (
          <div className="risk-recommendations">
            <h3>Recommendations</h3>
            <ul>
              {risk.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="risk-footer">
          <small>Last updated: {risk.lastUpdated ? new Date(risk.lastUpdated).toLocaleDateString() : "N/A"}</small>
          <button className="refresh-btn" onClick={fetchRisk}>
            <FaSync /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiskScore;
