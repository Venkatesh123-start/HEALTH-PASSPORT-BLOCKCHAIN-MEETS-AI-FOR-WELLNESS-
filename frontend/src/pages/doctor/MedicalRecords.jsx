import React, { useEffect, useState } from "react";
import "./MedicalRecords.css";

const MedicalRecords = ({ token, doctorId }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/doctor/${doctorId}/records`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRecords(data.data || []);
      } catch (err) {
        console.error("Failed to fetch medical records:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [token, doctorId]);

  const handleDownload = (url) => {
    window.open(url, "_blank");
  };

  if (loading) return <div className="loading">Loading medical records...</div>;
  if (records.length === 0) return <div className="no-data">No medical records available.</div>;

  return (
    <div className="medical-records">
      <h2>Authorized Medical Records</h2>
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Title</th>
            <th>Type</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec._id}>
              <td>{rec.patientName}</td>
              <td>{rec.title}</td>
              <td>{rec.type}</td>
              <td>{new Date(rec.date).toLocaleDateString()}</td>
              <td>
                <button className="preview-btn" onClick={() => handleDownload(rec.fileUrl)}>
                  Preview / Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicalRecords;