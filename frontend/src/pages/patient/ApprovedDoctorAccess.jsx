import React, { useEffect, useState } from "react";

const ApprovedDoctorAccess = (props) => {
  const token = props.token || localStorage.getItem("token");

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState("");

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError("");

    console.log("[ApprovedDoctorAccess] token:", token);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/patients/access/approved`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("[ApprovedDoctorAccess] status:", res.status);

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non JSON response:", text);
        setError("Server returned invalid response");
        setLoading(false);
        return;
      }

      console.log("[ApprovedDoctorAccess] data:", data);

      if (data.success) {
        setDoctors(data.data);
      } else {
        setError(data.message || "Failed to fetch doctors");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    }

    setLoading(false);
  };

  const handleRevoke = async (doctorId) => {
    setRevoking(doctorId);
    setError("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/patients/access/requests/${doctorId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setDoctors((prev) => prev.filter((d) => d._id !== doctorId));
      } else {
        setError(data.message || "Failed to revoke access");
      }
    } catch (err) {
      setError("Network error");
    }

    setRevoking("");
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Doctors with Access</h2>

      {doctors.length === 0 ? (
        <div>No doctors currently have access to your data.</div>
      ) : (
        <ul className="space-y-4">
          {doctors.map((doc) => (
            <li
              key={doc._id}
              className="border p-4 rounded shadow flex items-center justify-between"
            >
              <div>
                <b>{doc.name}</b> ({doc.email})
                <br />
                <b>Specialty:</b> {doc.specialty || "-"}
              </div>

              <button
                className="bg-red-500 text-white px-3 py-1 rounded"
                disabled={revoking === doc._id}
                onClick={() => handleRevoke(doc._id)}
              >
                {revoking === doc._id ? "Revoking..." : "Revoke Access"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ApprovedDoctorAccess;
