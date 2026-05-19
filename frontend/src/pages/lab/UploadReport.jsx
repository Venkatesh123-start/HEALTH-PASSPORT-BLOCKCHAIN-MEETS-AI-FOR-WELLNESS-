import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const UploadReport = ({ token }) => {
  const [file, setFile] = useState(null);
  const [patientId, setPatientId] = useState("");
  const [testName, setTestName] = useState("");
  const [testType, setTestType] = useState("other");
  const [results, setResults] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"}/api/labs/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPatients(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log("[Upload] File selected:", selectedFile?.name, selectedFile?.type, selectedFile?.size);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!patientId || !testName) {
      toast.error("Please select patient and enter test name");
      return;
    }

    try {
      setLoading(true);

      const selectedPatient = patients.find((p) => p._id === patientId);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("patientId", patientId);
      formData.append("patientName", selectedPatient?.name || "Unknown");
      formData.append("patientAddress", selectedPatient?.walletAddress || "");
      formData.append("testName", testName);
      formData.append("testType", testType);
      formData.append("results", results);
      formData.append("priority", priority);
      formData.append("notes", notes);
      
      // Add file if selected
      if (file) {
        console.log("[Upload] Appending file to FormData:", file.name);
        formData.append("reportFile", file);
      } else {
        console.log("[Upload] No file selected for upload");
      }

      // Upload report to backend API
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"}/api/labs/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log("[Upload] Response:", data);

      if (response.ok && data.success) {
        if (file) {
          toast.success("Report uploaded successfully with attached file!");
        } else {
          toast.success("Report uploaded successfully (no file attached)");
        }
        // Reset form
        setPatientId("");
        setTestName("");
        setTestType("other");
        setResults("");
        setPriority("normal");
        setNotes("");
        setFile(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(data.message || data.error || "Failed to upload report");
      }
    } catch (err) {
      console.error("[Upload] Error:", err);
      toast.error("Failed to upload report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTypes = [
    { value: "blood", label: "Blood Test" },
    { value: "urine", label: "Urine Test" },
    { value: "imaging", label: "Imaging/X-Ray" },
    { value: "biopsy", label: "Biopsy" },
    { value: "genetic", label: "Genetic Test" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="upload-report-container">
      <div className="upload-report-card">
        <h2>Upload Lab Report</h2>

        <div className="form-group">
          <label>Select Patient *</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">-- Select Patient --</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.email})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Test Name *</label>
          <input
            type="text"
            placeholder="e.g., Complete Blood Count"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Test Type</label>
          <select value={testType} onChange={(e) => setTestType(e.target.value)}>
            {testTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Results</label>
          <textarea
            placeholder="Enter test results..."
            value={results}
            onChange={(e) => setResults(e.target.value)}
            rows={4}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Notes (Optional)</label>
          <textarea
            placeholder="Additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="form-group file-upload-group">
          <label>📎 Attach Report File (PDF, Images, Documents)</label>
          <div className="file-input-wrapper">
            <input 
              type="file" 
              onChange={handleFileChange} 
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt,.xls,.xlsx,.csv,.dcm"
              id="report-file-input"
            />
            <label htmlFor="report-file-input" className="file-input-label">
              {file ? `✓ ${file.name}` : 'Click to select a file or drag and drop'}
            </label>
          </div>
          {file && (
            <div className="file-info-box">
              <span className="file-name">📄 {file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              <button 
                type="button"
                className="remove-file-btn"
                onClick={() => setFile(null)}
              >
                ✕ Remove
              </button>
            </div>
          )}
          <p className="file-hint">Supported formats: PDF, JPG, PNG, GIF, DOC, DOCX, TXT, XLS, XLSX, CSV, DICOM (Max 20MB)</p>
        </div>

        <button
          className={`upload-btn ${loading ? "disabled" : ""}`}
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : file ? `Upload Report with ${file.name.split('.').pop().toUpperCase()} File` : "Upload Report (No File)"}
        </button>
      </div>

      <style>{`
        .upload-report-container {
          padding: 20px;
        }
        .upload-report-card {
          background: white;
          padding: 30px;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(59, 130, 246, 0.12);
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid rgba(59, 130, 246, 0.08);
          position: relative;
          overflow: hidden;
        }
        .upload-report-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
        }
        .upload-report-card h2 {
          margin-bottom: 25px;
          color: #1a1c2c;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: #fff;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .form-row {
          display: flex;
          gap: 15px;
        }
        .form-row .form-group {
          flex: 1;
        }
        .file-input-wrapper {
          position: relative;
        }
        .file-input-wrapper input[type="file"] {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          opacity: 0;
          cursor: pointer;
          z-index: 2;
        }
        .file-input-label {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 24px 16px;
          border: 2px dashed rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.05);
          color: #3b82f6;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .file-input-wrapper:hover .file-input-label {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
        .file-upload-group {
          margin-bottom: 24px;
        }
        .file-info-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .file-name {
          color: #059669;
          font-size: 13px;
          font-weight: 600;
        }
        .file-size {
          color: #6b7280;
          font-size: 12px;
        }
        .remove-file-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .remove-file-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        .file-hint {
          margin-top: 8px;
          font-size: 12px;
          color: #9ca3af;
        }
        .upload-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .upload-btn:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        .upload-btn.disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

export default UploadReport;
