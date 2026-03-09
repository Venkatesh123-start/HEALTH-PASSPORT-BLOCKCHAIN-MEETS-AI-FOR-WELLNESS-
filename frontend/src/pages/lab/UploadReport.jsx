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
      const response = await fetch("http://localhost:5000/api/labs/patients", {
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
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!patientId || !testName) {
      toast.error("Please select patient and enter test name");
      return;
    }

    try {
      setLoading(true);

      const selectedPatient = patients.find((p) => p._id === patientId);

      // Upload report to backend API
      const response = await fetch("http://localhost:5000/api/labs/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          patientName: selectedPatient?.name || "Unknown",
          patientAddress: selectedPatient?.walletAddress || "",
          testName,
          testType,
          results,
          priority,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Report uploaded successfully!");
        // Reset form
        setPatientId("");
        setTestName("");
        setTestType("other");
        setResults("");
        setPriority("normal");
        setNotes("");
        setFile(null);
      } else {
        toast.error(data.message || "Failed to upload report");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload report");
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

        <div className="form-group">
          <label>Attach Report File (Optional)</label>
          <input type="file" onChange={handleFileChange} />
          {file && <span className="file-name">{file.name}</span>}
        </div>

        <button
          className={`upload-btn ${loading ? "disabled" : ""}`}
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload Report"}
        </button>
      </div>

      <style>{`
        .upload-report-container {
          padding: 20px;
        }
        .upload-report-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          max-width: 600px;
          margin: 0 auto;
        }
        .upload-report-card h2 {
          margin-bottom: 25px;
          color: #333;
          font-size: 1.5rem;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #444;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        .form-row {
          display: flex;
          gap: 15px;
        }
        .form-row .form-group {
          flex: 1;
        }
        .file-name {
          display: block;
          margin-top: 8px;
          color: #666;
          font-size: 13px;
        }
        .upload-btn {
          width: 100%;
          padding: 12px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .upload-btn:hover:not(.disabled) {
          background: #7c3aed;
        }
        .upload-btn.disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default UploadReport;