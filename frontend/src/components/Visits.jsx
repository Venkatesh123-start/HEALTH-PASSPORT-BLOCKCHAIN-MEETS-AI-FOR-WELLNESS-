// Visits.jsx
import React, { useState } from "react";
import axios from "axios";

const Visits = () => {
  const [patientAddress, setPatientAddress] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    if (!patientAddress) return alert("Enter patient address");
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/${patientAddress}`);
      setRecords(res.data.records);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch records");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>View Medical Records</h2>
      <input
        type="text"
        placeholder="Patient Wallet Address"
        value={patientAddress}
        onChange={(e) => setPatientAddress(e.target.value)}
        style={{ width: "400px", marginBottom: "10px" }}
      />
      <button onClick={handleFetch} disabled={loading} style={{ marginLeft: "10px" }}>
        {loading ? "Fetching..." : "Fetch Records"}
      </button>
      <div style={{ marginTop: "20px" }}>
        {records.length === 0 ? (
          <p>No records found</p>
        ) : (
          <table border="1" cellPadding="5" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>IPFS Hash</th>
                <th>Timestamp</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.doctorName}</td>
                  <td>{r.recordHash}</td>
                  <td>{new Date(r.timestamp * 1000).toLocaleString()}</td>
                  <td>
                    <a href={`https://ipfs.io/ipfs/${r.recordHash}`} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Visits;
