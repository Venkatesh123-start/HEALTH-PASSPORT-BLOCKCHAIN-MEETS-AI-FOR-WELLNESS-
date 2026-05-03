import React, { useEffect, useState } from "react";

const PatientAccessRequests = (props) => {
  const token = props.token || localStorage.getItem("token");

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");

    console.log("[PatientAccessRequests] token:", token);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/patients/access/requests/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("[PatientAccessRequests] status:", res.status);

      const data = await res.json();

      console.log("[PatientAccessRequests] data:", data);

      if (data.success) {
        setRequests(data.data);
      } else {
        setError(data.message || "Failed to fetch requests");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    }

    setLoading(false);
  };

  const handleAction = async (doctorId, action) => {
    setError("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/patients/access/requests/${doctorId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setRequests((prev) =>
          prev.filter((r) => r.doctor._id !== doctorId)
        );
      } else {
        setError(data.message || "Action failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    }
  };

  if (loading) return <div>Loading...</div>;

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Doctor Access Requests</h2>

      {requests.length === 0 ? (
        <div>No pending requests.</div>
      ) : (
        <ul className="space-y-4">
          {requests.map((req) => (
            <li key={req._id} className="border p-4 rounded shadow">
              <div>
                <b>Doctor:</b> {req.doctor.name} ({req.doctor.email})
                <br />
                <b>Specialty:</b> {req.doctor.specialty || "-"}
              </div>

              <div className="mt-2 space-x-2">
                <button
                  className="bg-green-500 text-white px-3 py-1 rounded"
                  onClick={() =>
                    handleAction(req.doctor._id, "approve")
                  }
                >
                  Approve
                </button>

                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={() =>
                    handleAction(req.doctor._id, "reject")
                  }
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientAccessRequests;
