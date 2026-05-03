// PatientInfo.jsx
import React, { useState } from "react";
import axios from "axios";

const PatientInfo = () => {
  const [file, setFile] = useState(null);
  const [patientAddress, setPatientAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file || !patientAddress) {
      alert("Select file and enter patient address");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientAddress", patientAddress);

      // backend API to upload file to IPFS and save hash to blockchain
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/records/add`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(`Success! Transaction Hash: ${res.data.txHash}`);
    } catch (err) {
      console.error(err);
      setMessage("Upload failed. Check console.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Upload Patient Medical Record</h2>
      <input
        type="text"
        placeholder="Patient Wallet Address"
        value={patientAddress}
        onChange={(e) => setPatientAddress(e.target.value)}
        style={{ width: "400px", marginBottom: "10px" }}
      />
      <br />
      <input type="file" onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={loading} style={{ marginTop: "10px" }}>
        {loading ? "Uploading..." : "Upload & Save"}
      </button>
      <p>{message}</p>
    </div>
  );
};

export default PatientInfo;
