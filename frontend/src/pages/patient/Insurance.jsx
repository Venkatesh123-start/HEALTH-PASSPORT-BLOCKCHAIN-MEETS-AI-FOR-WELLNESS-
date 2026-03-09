import React, { useEffect, useState } from "react";
import "./Insurance.css";

const Insurance = ({ token, patientId, countOnly }) => {
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    const res = await fetch(
      `http://localhost:5000/api/insurance/${patientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setClaims(data.data || []);
  };

  if (countOnly) return claims.length;

  return (
    <div>
      <h2>Insurance & Billing</h2>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Status</th>
            <th>Claim Amount</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c._id}>
              <td>{c.company}</td>
              <td>{c.status}</td>
              <td>{c.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Insurance;