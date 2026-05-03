import React, { useEffect, useState, useCallback } from "react";
import { encryptFile, decryptFile, downloadBlob } from "../../utils/encryption";
import "./MedicalRecords.css";

const MedicalRecords = ({ token, patientId, countOnly }) => {
  const [records, setRecords] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordType, setRecordType] = useState("Prescription");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true); // Default: encrypted uploads
  const [encryptionProgress, setEncryptionProgress] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [blockchainModal, setBlockchainModal] = useState(null); // { title, txHash }

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      // Use my-records endpoint for patient's own encrypted records
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      } else {
        console.error("Failed to fetch records:", data.message);
        // Fallback to patient records endpoint
        const fallbackRes = await fetch(
          `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/patient/${patientId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success) {
          setRecords(fallbackData.data || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    } finally {
      setLoading(false);
    }
  }, [token, patientId]);

  useEffect(() => {
    if (token) {
      fetchRecords();
    }
  }, [token, fetchRecords]);

  // Handle file upload with optional encryption
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload");
    if (!title.trim()) return alert("Please provide a title for the record");

    setUploading(true);
    setUploadResult(null);
    setEncryptionProgress("");

    try {
      let formData = new FormData();

      if (encryptionEnabled) {
        // Encrypt the file before upload
        setEncryptionProgress("Encrypting file...");
        const encryptedResult = await encryptFile(file);

        setEncryptionProgress("Uploading encrypted file to IPFS...");

        // Create form data with encrypted file and crypto metadata
        formData.append(
          "encryptedFile",
          encryptedResult.encryptedBlob,
          `encrypted_${file.name}`
        );
        formData.append("title", title);
        formData.append("description", description);
        formData.append("recordType", recordType);
        formData.append("originalFileName", encryptedResult.originalName);
        formData.append("encryptionIV", encryptedResult.iv);
        // Pass symmetric key and mime type so backend can decrypt later
        formData.append("symmetricKey", encryptedResult.symmetricKey);
        formData.append("mimeType", encryptedResult.mimeType);

        // Upload to encrypted endpoint
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/records/upload-encrypted`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Encrypted upload failed");
        }

        setUploadResult({
          success: true,
          ipfsHash: data.data.ipfsHash,
          blockchainLogged: data.data.blockchainLogged,
          blockchainTxHash: data.data.blockchainTxHash,
          isEncrypted: true,
        });
      } else {
        // Standard upload without encryption
        formData.append("file", file);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("recordType", recordType);

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/upload/${patientId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Upload failed");
        }

        setUploadResult({
          success: true,
          ipfsHash: data.data.ipfsHash,
          blockchainLogged: data.data.blockchainLogged,
          blockchainTxHash: data.data.blockchainTxHash,
          isEncrypted: false,
        });
      }

      // Reset form
      setFile(null);
      setTitle("");
      setDescription("");
      setEncryptionProgress("");

      // Refresh records list
      fetchRecords();
    } catch (err) {
      console.error(err);
      setUploadResult({
        success: false,
        error: err.message,
      });
      setEncryptionProgress("");
    } finally {
      setUploading(false);
    }
  };

  // Download and decrypt a record
  const handleDecryptDownload = async (record) => {
    if (!record.isEncrypted) {
      // Regular download for unencrypted files
      window.open(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/${record._id}/download`, "_blank");
      return;
    }

    setDownloadingId(record._id);

    try {
      // Step 1: Get decryption key from backend
      const keyRes = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/records/${record._id}/decrypt-key`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const keyData = await keyRes.json();

      if (!keyRes.ok || !keyData.success) {
        throw new Error(keyData.message || "Failed to get decryption key");
      }

      // Step 2: Fetch encrypted file from IPFS
      const ipfsUrl = record.localIpfsUrl || `http://127.0.0.1:8080/ipfs/${record.ipfsHash}`;
      const fileRes = await fetch(ipfsUrl);
      if (!fileRes.ok) {
        throw new Error("Failed to fetch file from IPFS");
      }
      const encryptedBlob = await fileRes.blob();

      // Step 3: Decrypt the file
      const decryptedBlob = await decryptFile(
        encryptedBlob,
        keyData.data.symmetricKey,
        keyData.data.encryptionIV,
        record.mimeType || "application/octet-stream"
      );

      // Step 4: Download the decrypted file
      downloadBlob(decryptedBlob, record.originalFileName || "decrypted_file");
    } catch (err) {
      console.error("Decryption failed:", err);
      alert("Failed to decrypt and download: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // If only count is needed (for dashboard cards)
  if (countOnly) return records.length;

  if (loading) return <div className="loading">Loading medical records...</div>;

  return (
    <div className="records-container">
      <h2>Medical Records</h2>
      <p className="subtitle">
        Upload and manage your medical documents securely with encryption and IPFS storage
      </p>

      {/* Upload Form */}
      <div className="upload-section">
        <h3>Upload New Record</h3>
        
        {/* Encryption Toggle */}
        <div className="encryption-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={encryptionEnabled}
              onChange={(e) => setEncryptionEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              {encryptionEnabled ? "🔒 Encryption Enabled" : "🔓 No Encryption"}
            </span>
          </label>
          <small className="encryption-hint">
            {encryptionEnabled
              ? "Your file will be encrypted before uploading to IPFS"
              : "File will be uploaded without encryption (not recommended)"}
          </small>
        </div>

        <form className="upload-form" onSubmit={handleUpload}>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                placeholder="e.g., Blood Test Results"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={recordType} onChange={(e) => setRecordType(e.target.value)}>
                <option value="Prescription">Prescription</option>
                <option value="Lab Report">Lab Report</option>
                <option value="Scan">Scan / X-Ray</option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Insurance">Insurance Document</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Add any notes or description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>File *</label>
            <input
              type="file"
              accept=".pdf,image/*,.doc,.docx"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
            {file && (
              <span className="file-info">
                Selected: {file.name} ({formatFileSize(file.size)})
                {encryptionEnabled && " - Will be encrypted"}
              </span>
            )}
          </div>

          <button type="submit" className="upload-btn" disabled={uploading}>
            {uploading
              ? encryptionProgress || "Uploading..."
              : encryptionEnabled
              ? "🔒 Encrypt & Upload"
              : "Upload Record"}
          </button>
        </form>

        {/* Upload Result */}
        {uploadResult && (
          <div className={`upload-result ${uploadResult.success ? "success" : "error"}`}>
            {uploadResult.success ? (
              <>
                <h4>✅ Upload Successful!</h4>
                <div className="result-details">
                  <div className="result-item">
                    <span className="label">IPFS Hash (CID):</span>
                    <code className="hash">{uploadResult.ipfsHash}</code>
                    <a
                      href={`https://cloudflare-ipfs.com/ipfs/${uploadResult.ipfsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="view-link"
                      title="Opens in Cloudflare IPFS Gateway (more reliable)"
                    >
                      View on IPFS Gateway
                    </a>
                  </div>
                  {uploadResult.isEncrypted && (
                    <div className="result-item encrypted-notice">
                      🔒 File is encrypted - only you can decrypt it
                    </div>
                  )}
                  {uploadResult.blockchainLogged && (
                    <div className="result-item">
                      <span className="label">Blockchain TX:</span>
                      <code className="hash">{uploadResult.blockchainTxHash}</code>
                    </div>
                  )}
                  {!uploadResult.blockchainLogged && (
                    <div className="result-item warning">
                      ⚠️ Blockchain logging pending (contract may not be deployed)
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h4>❌ Upload Failed</h4>
                <p>{uploadResult.error}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* My Records Section */}
      <div className="records-section">
        <h3>My Records ({records.length})</h3>

        {records.length === 0 ? (
          <div className="no-data">
            <p>No medical records found.</p>
            <p>Upload your first record using the form above.</p>
          </div>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Size</th>
                <th>Date</th>
                <th>IPFS Hash</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec._id}>
                  <td>
                    <strong>{rec.title}</strong>
                    {rec.description && (
                      <small className="description">{rec.description}</small>
                    )}
                  </td>
                  <td>
                    <span
                      className={`type-badge ${rec.recordType
                        ?.toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {rec.recordType || "Other"}
                    </span>
                  </td>
                  <td>{formatFileSize(rec.fileSize)}</td>
                  <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                  <td>
                    <a
                      href={`https://cloudflare-ipfs.com/ipfs/${rec.ipfsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hash-link"
                      title={rec.ipfsHash}
                    >
                      {rec.ipfsHash?.substring(0, 12)}...
                    </a>
                  </td>
                  <td className="status-cell">
                    {rec.isEncrypted && (
                      <span className="encrypted-badge" title="Encrypted">
                        🔒
                      </span>
                    )}
                    {rec.blockchainLogged && (
                      <span
                        className="verified-badge clickable"
                        title="Click to view transaction"
                        onClick={() =>
                          setBlockchainModal({
                            title: rec.title,
                            txHash: rec.blockchainTxHash,
                          })
                        }
                      >
                        ⛓️
                      </span>
                    )}
                  </td>
                  <td className="actions">
                    <a
                      href={
                        rec.localIpfsUrl ||
                        `http://127.0.0.1:8080/ipfs/${rec.ipfsHash}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="action-btn view"
                      title={
                        rec.isEncrypted
                          ? "View encrypted data"
                          : "View on IPFS"
                      }
                    >
                      {rec.isEncrypted ? "Raw" : "View"}
                    </a>
                    <button
                      onClick={() => handleDecryptDownload(rec)}
                      className="action-btn download"
                      disabled={downloadingId === rec._id}
                      title={
                        rec.isEncrypted
                          ? "Decrypt and download"
                          : "Download file"
                      }
                    >
                      {downloadingId === rec._id
                        ? "..."
                        : rec.isEncrypted
                        ? "Decrypt"
                        : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Blockchain Transaction Modal */}
      {blockchainModal && (
        <div className="modal-overlay" onClick={() => setBlockchainModal(null)}>
          <div className="blockchain-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⛓️ Verified on Blockchain</h3>
              <button
                className="modal-close"
                onClick={() => setBlockchainModal(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-label">Record Title:</p>
              <p className="modal-value">{blockchainModal.title}</p>

              <p className="modal-label">Transaction Hash:</p>
              <code className="tx-hash">{blockchainModal.txHash}</code>

              <p className="verification-note">
                This record's IPFS hash has been permanently logged to the
                blockchain, ensuring tamper-proof verification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
