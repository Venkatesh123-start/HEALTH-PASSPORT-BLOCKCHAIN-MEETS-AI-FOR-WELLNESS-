import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFlask } from "react-icons/fa";
import "./LabReports.css";

const LabReports = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchLabReports = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser || storedUser.role !== "patient") {
        navigate("/login");
        return;
      }
      setUser(storedUser);

      try {
        const patientId = storedUser._id;
        const res = await fetch(`http://localhost:5000/api/labs/patient/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setLabReports(data.data || []);
          setError(null);
        } else {
          setError(data.message || "Failed to fetch lab reports");
        }
      } catch (err) {
        console.error("Fetch lab reports error:", err);
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    fetchLabReports();
  }, [navigate, token]);

  if (loading) return <div className="loading">Loading lab reports...</div>;

  return (
    <div className="lab-wrapper">
      <h2><FaFlask /> Lab Reports</h2>
      {error && <p className="error-message">{error}</p>}
      {!error && labReports.length === 0 ? (
        <div className="no-records">
          <FaFlask className="no-records-icon" />
          <p>No lab reports available yet.</p>
          <span>Lab reports will appear here once your healthcare provider uploads them.</span>
        </div>
      ) : (
        labReports.length > 0 && (
          <table className="lab-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Type</th>
                <th>Results</th>
                <th>Status</th>
                <th>Date</th>
                <th>Lab</th>
              </tr>
            </thead>
            <tbody>
              {labReports.map((report) => (
                <tr key={report._id}>
                  <td>{report.testName}</td>
                  <td>{report.testType || "-"}</td>
                  <td>{report.results || "-"}</td>
                  <td>
                    <span className={`status-badge ${report.status}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>{report.uploadedBy?.labName || report.labName || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
};

export default LabReports;