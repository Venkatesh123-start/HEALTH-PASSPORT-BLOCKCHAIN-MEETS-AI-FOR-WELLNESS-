import React, { useEffect, useState } from "react";
import "./Appointments.css";

const Appointments = ({ token, doctorId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/doctor/${doctorId}/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAppointments(data.data || []);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [token, doctorId]);

  const handleAction = async (id, action) => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/appointments/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: action === "accept" ? "Confirmed" : "Rejected" } : a))
      );
    } catch (err) {
      console.error(`Failed to ${action} appointment:`, err);
    }
  };

  if (loading) return <div className="loading">Loading appointments...</div>;
  if (appointments.length === 0) return <div className="no-data">No appointments scheduled.</div>;

  return (
    <div className="appointments">
      <h2>Appointments</h2>
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Date & Time</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((app) => (
            <tr key={app._id}>
              <td>{app.patientName}</td>
              <td>{new Date(app.date).toLocaleString()}</td>
              <td>{app.type || "Consultation"}</td>
              <td>{app.status}</td>
              <td className="actions">
                {app.status === "Pending" && (
                  <>
                    <button className="accept-btn" onClick={() => handleAction(app._id, "accept")}>
                      Accept
                    </button>
                    <button className="reject-btn" onClick={() => handleAction(app._id, "reject")}>
                      Reject
                    </button>
                  </>
                )}
                {app.status === "Confirmed" && <button className="reschedule-btn">Reschedule</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Appointments;
