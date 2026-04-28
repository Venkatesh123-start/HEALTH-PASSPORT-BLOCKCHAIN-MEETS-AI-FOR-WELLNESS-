import React, { useEffect, useState } from "react";
import { decryptFile, downloadBlob } from "../../utils/encryption";
import "./MedicalRecords.css";

const MedicalRecords = ({ token, doctorId }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setError(null);

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/doctor/${doctorId}/records`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }

        const data = await res.json();
        setRecords(data.data || []);
      } catch (err) {
        console.error("Failed to fetch medical records:", err);
        setError(err.message || "Failed to fetch medical records");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [token, doctorId]);

  const handleDownload = async (rec) => {
    setDownloading(rec._id);

    try {
      // If record is not encrypted, use simple server download
      if (!rec.isEncrypted) {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/${rec._id}/download`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const filename =
          rec.originalFileName || rec.fileName || `${rec.title}.pdf`;
        downloadBlob(blob, filename);
        return;
      }

      // Encrypted record: fetch decryption key (doctor) and decrypt on client
      const keyRes = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/${rec._id}/decrypt-key-doctor`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.success) {
        throw new Error(keyData.message || "Failed to get decryption key");
      }

      const { symmetricKey, encryptionIV, mimeType, originalFileName } =
        keyData.data || {};

      // Fetch encrypted file from IPFS (same as patient flow)
      const ipfsUrl =
        rec.localIpfsUrl || `http://127.0.0.1:8080/ipfs/${rec.ipfsHash}`;
      const fileRes = await fetch(ipfsUrl);
      if (!fileRes.ok) {
        throw new Error("Failed to fetch encrypted file from IPFS");
      }
      const encryptedBlob = await fileRes.blob();

      // Decrypt in browser using shared utility
      const decryptedBlob = await decryptFile(
        encryptedBlob,
        symmetricKey,
        encryptionIV,
        mimeType || "application/octet-stream"
      );

      downloadBlob(
        decryptedBlob,
        originalFileName || rec.originalFileName || rec.fileName || rec.title
      );
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Failed to download file: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="loading">Loading medical records...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (records.length === 0)
    return <div className="no-data">No medical records available.</div>;

  return (
    <div className="medical-records">
      <h2>Authorized Medical Records</h2>

      <p
        style={{
          fontSize: "0.9em",
          color: "#666",
          marginBottom: "1em",
        }}
      >
        Click "Download" to securely retrieve decrypted files from the server.
      </p>

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
                <button
                  className="preview-btn"
                  onClick={() => handleDownload(rec)}
                  disabled={downloading === rec._id}
                >
                  {downloading === rec._id
                    ? "Downloading..."
                    : "Download"}
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
