import React, { useEffect, useState, useCallback } from "react";
import "./HealthTrends.css";

const HealthTrends = ({ token, patientId }) => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("history"); // history | trends
  const [trends, setTrends] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // days

  const fetchVitals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/vitals/my-vitals?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setVitals(data.data || []);
      } else {
        setError(data.message || "Failed to fetch vitals");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTrends = useCallback(async () => {
    if (!patientId) return;
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/vitals/trends/${patientId}?days=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setTrends(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch trends:", err);
    }
  }, [token, patientId, timeRange]);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  useEffect(() => {
    if (activeTab === "trends" && patientId) {
      fetchTrends();
    }
  }, [activeTab, fetchTrends, patientId]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVitalStatus = (type, value) => {
    if (value === null || value === undefined) return "normal";

    const ranges = {
      temperature: { low: 97, high: 99.5 },
      heartRate: { low: 60, high: 100 },
      bloodPressureSystolic: { low: 90, high: 120 },
      bloodPressureDiastolic: { low: 60, high: 80 },
      respiratoryRate: { low: 12, high: 20 },
      oxygenLevel: { low: 95, high: 100 },
    };

    const range = ranges[type];
    if (!range) return "normal";

    if (value < range.low) return "low";
    if (value > range.high) return "high";
    return "normal";
  };

  const getStatusBadge = (type, value) => {
    const status = getVitalStatus(type, value);
    const badges = {
      low: { label: "Low", class: "status-low" },
      high: { label: "High", class: "status-high" },
      normal: { label: "Normal", class: "status-normal" },
    };
    return badges[status];
  };

  if (loading) {
    return (
      <div className="health-trends">
        <div className="loading-state">Loading your health data...</div>
      </div>
    );
  }

  return (
    <div className="health-trends">
      <div className="trends-header">
        <h2>📈 Health Trends</h2>
        <div className="tab-switcher">
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            📋 History
          </button>
          <button
            className={activeTab === "trends" ? "active" : ""}
            onClick={() => setActiveTab("trends")}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === "history" && (
        <div className="history-section">
          {vitals.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <h3>No Vitals Recorded</h3>
              <p>Start tracking your health by recording your first vital signs.</p>
            </div>
          ) : (
            <div className="vitals-table-wrapper">
              <table className="vitals-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>🌡️ Temp</th>
                    <th>❤️ HR</th>
                    <th>🩺 BP</th>
                    <th>💨 RR</th>
                    <th>🫁 SpO2</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.map((record) => (
                    <tr key={record._id}>
                      <td className="date-cell">
                        {formatDate(record.recordedAt)}
                        <span className="recorder-badge">
                          {record.recorderRole === "doctor" ? "👨‍⚕️" : "👤"}
                        </span>
                      </td>
                      <td>
                        {record.vitals?.temperature ? (
                          <span className={`vital-value ${getStatusBadge("temperature", record.vitals.temperature).class}`}>
                            {record.vitals.temperature}°F
                          </span>
                        ) : (
                          <span className="no-value">—</span>
                        )}
                      </td>
                      <td>
                        {record.vitals?.heartRate ? (
                          <span className={`vital-value ${getStatusBadge("heartRate", record.vitals.heartRate).class}`}>
                            {record.vitals.heartRate} bpm
                          </span>
                        ) : (
                          <span className="no-value">—</span>
                        )}
                      </td>
                      <td>
                        {record.vitals?.bloodPressureSystolic && record.vitals?.bloodPressureDiastolic ? (
                          <span className={`vital-value ${getStatusBadge("bloodPressureSystolic", record.vitals.bloodPressureSystolic).class}`}>
                            {record.vitals.bloodPressureSystolic}/{record.vitals.bloodPressureDiastolic}
                          </span>
                        ) : (
                          <span className="no-value">—</span>
                        )}
                      </td>
                      <td>
                        {record.vitals?.respiratoryRate ? (
                          <span className={`vital-value ${getStatusBadge("respiratoryRate", record.vitals.respiratoryRate).class}`}>
                            {record.vitals.respiratoryRate}/min
                          </span>
                        ) : (
                          <span className="no-value">—</span>
                        )}
                      </td>
                      <td>
                        {record.vitals?.oxygenLevel ? (
                          <span className={`vital-value ${getStatusBadge("oxygenLevel", record.vitals.oxygenLevel).class}`}>
                            {record.vitals.oxygenLevel}%
                          </span>
                        ) : (
                          <span className="no-value">—</span>
                        )}
                      </td>
                      <td className="notes-cell">
                        {record.notes ? (
                          <span className="notes-text" title={record.notes}>
                            {record.notes.length > 30 ? record.notes.substring(0, 30) + "..." : record.notes}
                          </span>
                        ) : (
                          <span className="no-value">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "trends" && (
        <div className="analytics-section">
          <div className="time-range-selector">
            <label>Time Range:</label>
            <select value={timeRange} onChange={(e) => setTimeRange(parseInt(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          {trends ? (
            <>
              <div className="averages-grid">
                <div className="average-card">
                  <span className="icon">🌡️</span>
                  <div className="average-info">
                    <span className="label">Avg Temperature</span>
                    <span className="value">
                      {trends.averages.temperature ? `${trends.averages.temperature}°F` : "—"}
                    </span>
                  </div>
                </div>
                <div className="average-card">
                  <span className="icon">❤️</span>
                  <div className="average-info">
                    <span className="label">Avg Heart Rate</span>
                    <span className="value">
                      {trends.averages.heartRate ? `${trends.averages.heartRate} bpm` : "—"}
                    </span>
                  </div>
                </div>
                <div className="average-card">
                  <span className="icon">🩺</span>
                  <div className="average-info">
                    <span className="label">Avg Blood Pressure</span>
                    <span className="value">
                      {trends.averages.bloodPressureSystolic
                        ? `${trends.averages.bloodPressureSystolic}/${trends.averages.bloodPressureDiastolic}`
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="average-card">
                  <span className="icon">💨</span>
                  <div className="average-info">
                    <span className="label">Avg Respiratory Rate</span>
                    <span className="value">
                      {trends.averages.respiratoryRate ? `${trends.averages.respiratoryRate}/min` : "—"}
                    </span>
                  </div>
                </div>
                <div className="average-card">
                  <span className="icon">🫁</span>
                  <div className="average-info">
                    <span className="label">Avg Oxygen Level</span>
                    <span className="value">
                      {trends.averages.oxygenLevel ? `${trends.averages.oxygenLevel}%` : "—"}
                    </span>
                  </div>
                </div>
                <div className="average-card highlight">
                  <span className="icon">📊</span>
                  <div className="average-info">
                    <span className="label">Total Readings</span>
                    <span className="value">{trends.totalReadings}</span>
                  </div>
                </div>
              </div>

              <div className="trends-legend">
                <h4>Status Legend</h4>
                <div className="legend-items">
                  <span className="legend-item">
                    <span className="dot status-normal"></span> Normal Range
                  </span>
                  <span className="legend-item">
                    <span className="dot status-high"></span> Above Normal
                  </span>
                  <span className="legend-item">
                    <span className="dot status-low"></span> Below Normal
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-state">Loading analytics...</div>
          )}
        </div>
      )}

      <div className="data-note">
        🔐 All vitals data is encrypted at rest and decrypted only during authorized viewing.
      </div>
    </div>
  );
};

export default HealthTrends;
