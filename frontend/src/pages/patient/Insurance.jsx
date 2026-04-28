import React, { useEffect, useState } from "react";
import "./Insurance.css";

const Insurance = ({ token, patientId, countOnly }) => {
  const [policies, setPolicies] = useState([]);
  const [overview, setOverview] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimForm, setClaimForm] = useState({
    insuranceId: "",
    hospitalName: "",
    doctorName: "",
    treatmentDate: "",
    type: "",
    description: "",
    amount: "",
    files: [],
  });

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchPolicies(), fetchOverview(), fetchClaims()]);
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [patientId]);

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError("Failed to load policies");
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/insurance/${patientId}/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOverview(data.data || []);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/claims/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setClaims(data.data || []);
      }
    } catch (err) {
      setError("Failed to load claims");
    }
  };

  const submitClaim = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("insuranceId", claimForm.insuranceId);
      fd.append("hospitalName", claimForm.hospitalName);
      fd.append("doctorName", claimForm.doctorName);
      fd.append("treatmentDate", claimForm.treatmentDate);
      fd.append("type", claimForm.type);
      fd.append("description", claimForm.description);
      fd.append("amount", claimForm.amount);
      for (const f of claimForm.files) {
        fd.append("files", f);
      }
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/claims/patient`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        await fetchClaims();
        await fetchOverview();
        setClaimForm({
          insuranceId: "",
          hospitalName: "",
          doctorName: "",
          treatmentDate: "",
          type: "",
          description: "",
          amount: "",
          files: [],
        });
      } else {
        setError(data.message || "Failed to submit claim");
      }
    } catch (err) {
      setError("Network error submitting claim");
    }
  };

  if (countOnly) return claims.length;
  if (loading) return <div className="loading">Loading insurance...</div>;

  return (
    <div className="insurance-wrapper">
      <div className="insurance-header">
        <h1>Insurance & Billing</h1>
      </div>
      {error && <div className="error-message">{error}</div>}

      <div className="insurance-section">
        <h2>Your Policies</h2>
        {overview.length === 0 ? (
          <div className="no-records">
            <p>No insurance policies found.</p>
          </div>
        ) : (
          <div className="policy-cards">
            {overview.map((p) => (
              <div key={p._id} className="policy-card">
                <div className="policy-card-header">
                  <h3>{p.companyName}</h3>
                  <span className={`status-badge ${p.status}`}>{p.status}</span>
                </div>
                <div className="policy-card-body">
                  <p><strong>Policy #:</strong> {p.policyNumber}</p>
                  <p><strong>Type:</strong> {p.policyType || "-"}</p>
                  <div className="coverage-details">
                    <p><strong>Total Coverage:</strong> ${(p.coverageAmount || 0).toLocaleString()}</p>
                    <p><strong>Remaining:</strong> ${(p.remainingCoverage || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="insurance-section">
        <h2>Submit a New Claim</h2>
        <form onSubmit={submitClaim} className="claim-form">
          <select
            value={claimForm.insuranceId}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, insuranceId: e.target.value }))}
          >
            <option value="">Select Policy</option>
            {policies.map((p) => (
              <option key={p._id} value={p._id}>
                {p.companyName} - {p.policyNumber}
              </option>
            ))}
          </select>
          <input
            placeholder="Hospital Name"
            value={claimForm.hospitalName}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, hospitalName: e.target.value }))}
          />
          <input
            placeholder="Doctor Name"
            value={claimForm.doctorName}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, doctorName: e.target.value }))}
          />
          <input
            placeholder="Treatment Date"
            type="date"
            value={claimForm.treatmentDate}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, treatmentDate: e.target.value }))}
          />
          <input
            placeholder="Claim Type"
            value={claimForm.type}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, type: e.target.value }))}
          />
          <textarea
            placeholder="Treatment description"
            value={claimForm.description}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <input
            placeholder="Claim Amount"
            type="number"
            value={claimForm.amount}
            onChange={(e) => setClaimForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />
          <input
            type="file"
            multiple
            onChange={(e) => setClaimForm((prev) => ({ ...prev, files: Array.from(e.target.files) }))}
          />
          <button type="submit">Submit Claim</button>
        </form>
      </div>

      <div className="insurance-section">
        <h2>Your Claims</h2>
        {claims.length === 0 ? (
          <div className="no-records">
            <p>No claims submitted yet.</p>
          </div>
        ) : (
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Hospital</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c._id}>
                  <td>{c._id}</td>
                  <td>{c.hospitalName || "-"}</td>
                  <td>${(c.amount || 0).toLocaleString()}</td>
                  <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Insurance;
