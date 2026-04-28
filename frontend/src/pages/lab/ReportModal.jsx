import React from 'react';
import './ReportModal.css';

const ReportModal = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Report Details</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p><strong>Patient:</strong> {report.patientName}</p>
          <p><strong>Test Name:</strong> {report.testName}</p>
          <p><strong>Test Type:</strong> {report.testType}</p>
          <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleString()}</p>
          <p><strong>Status:</strong> {report.status}</p>
          <p><strong>Priority:</strong> {report.priority}</p>
          <div className="results-section">
            <h4>Results:</h4>
            <pre>{report.results}</pre>
          </div>
          {report.notes && (
            <div className="notes-section">
              <h4>Notes:</h4>
              <p>{report.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
