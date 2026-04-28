import React, { useState, useEffect } from "react";
import ReportModal from "./ReportModal"; // Create this component next

const AllReports = ({ token }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || `${process.env.REACT_APP_BACKEND_URL || '${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}'}`}/api/labs/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setReports(data.data);
          } else {
            setError(data.message || "Failed to fetch reports");
          }
        } else {
          setError("Failed to fetch reports");
        }
      } catch (err) {
        setError("Network error while fetching reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [token]);

  const handleReportClick = (report) => {
    setSelectedReport(report);
  };

  const closeModal = () => {
    setSelectedReport(null);
  };

  if (loading) return <div className="loading">Loading reports...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="all-reports">
      <h2>All Lab Reports</h2>
      {reports.length > 0 ? (
        <table className="reports-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Test Type</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id} onClick={() => handleReportClick(report)} className="report-row">
                <td>{report.patientName || "N/A"}</td>
                <td>{report.testType || report.type}</td>
                <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${report.status || "completed"}`}>
                    {report.status || "Completed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-data">No reports found.</p>
      )}

      {selectedReport && <ReportModal report={selectedReport} onClose={closeModal} />}
    </div>
  );
};

export default AllReports;
