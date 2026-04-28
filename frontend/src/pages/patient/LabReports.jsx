import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFlask, FaEye, FaDownload, FaTimes, FaFilePdf, FaFileMedical } from "react-icons/fa";
import "./LabReports.css";

const LabReports = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/labs/patient/${patientId}`, {
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

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleDownloadReport = async (report) => {
    try {
      console.log("[Download] Report data:", report);
      console.log("[Download] Report file:", report.reportFile);
      
      // If report has a file, download the actual file
      if (report.reportFile && report.reportFile.path) {
        console.log("[Download] File found, downloading from API...");
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/labs/download/${report._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log("[Download] Response status:", response.status);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = report.reportFile.filename || `lab-report-${report.testName}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log("[Download] File downloaded successfully!");
        } else {
          const errorData = await response.json();
          console.error("[Download] Error response:", errorData);
          alert(errorData.message || 'Failed to download file');
        }
      } else {
        // No file attached - generate a text summary
        console.log("[Download] No file attached, generating text summary...");
        const reportContent = `
==========================================
         LAB REPORT SUMMARY
==========================================

Test Name: ${report.testName}
Patient: ${report.patientName}
Test Type: ${report.testType || 'N/A'}
Status: ${report.status}
Priority: ${report.priority || 'normal'}

------------------------------------------
RESULTS:
------------------------------------------
${report.results || 'No results available'}

${report.notes ? `------------------------------------------
NOTES:
------------------------------------------
${report.notes}
` : ''}
------------------------------------------
Lab: ${report.uploadedBy?.labName || report.labName || 'N/A'}
Date: ${new Date(report.createdAt).toLocaleDateString()}
==========================================
        `;
        
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-report-${report.testName.replace(/\s+/g, '-')}-${new Date(report.createdAt).toLocaleDateString()}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download report: " + error.message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
  };

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
                <th>File</th>
                <th>Date</th>
                <th>Lab</th>
                <th>Actions</th>
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
                  <td>
                    {report.reportFile && report.reportFile.path ? (
                      <span className="file-attached-badge">
                        <FaFilePdf /> {report.reportFile.filename?.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                    ) : (
                      <span className="no-file-badge">No file</span>
                    )}
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>{report.uploadedBy?.labName || report.labName || "-"}</td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn view-btn" 
                      onClick={() => handleViewReport(report)}
                      title="View Report"
                    >
                      <FaEye />
                    </button>
                    <button 
                      className={`action-btn download-btn ${report.reportFile && report.reportFile.path ? 'has-file' : ''}`}
                      onClick={() => handleDownloadReport(report)}
                      title={report.reportFile && report.reportFile.path ? "Download Attached File" : "Download Text Summary"}
                    >
                      <FaDownload />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
      
      {/* View Report Modal */}
      {showModal && selectedReport && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FaFileMedical /> Lab Report Details</h3>
              <button className="close-btn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="report-details">
                <div className="detail-row">
                  <strong>Test Name:</strong> {selectedReport.testName}
                </div>
                <div className="detail-row">
                  <strong>Test Type:</strong> {selectedReport.testType || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Status:</strong> 
                  <span className={`status-badge ${selectedReport.status}`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Priority:</strong> 
                  <span className={`priority-badge ${selectedReport.priority}`}>
                    {selectedReport.priority || 'normal'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Lab:</strong> {selectedReport.labName || selectedReport.uploadedBy?.labName || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Date:</strong> {new Date(selectedReport.createdAt).toLocaleDateString()}
                </div>
                <div className="detail-row">
                  <strong>Results:</strong>
                  <div className="results-content">
                    {selectedReport.results || 'No results available'}
                  </div>
                </div>
                {selectedReport.notes && (
                  <div className="detail-row">
                    <strong>Notes:</strong>
                    <div className="notes-content">
                      {selectedReport.notes}
                    </div>
                  </div>
                )}
                {selectedReport.reportFile && (
                  <div className="detail-row">
                    <strong>Attached File:</strong>
                    <div className="file-info">
                      <span className="file-name">{selectedReport.reportFile.filename}</span>
                      <span className="file-available">✓ File available for download</span>
                    </div>
                  </div>
                )}
                {selectedReport.reportHash && (
                  <div className="detail-row">
                    <strong>Report Hash:</strong>
                    <div className="hash-content">
                      <code>{selectedReport.reportHash}</code>
                    </div>
                  </div>
                )}
                {selectedReport.blockchainTxHash && (
                  <div className="detail-row">
                    <strong>Blockchain Transaction:</strong>
                    <div className="hash-content">
                      <code>{selectedReport.blockchainTxHash}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="download-modal-btn" 
                onClick={() => handleDownloadReport(selectedReport)}
              >
                <FaDownload /> Download Report
              </button>
              <button className="close-modal-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabReports;
