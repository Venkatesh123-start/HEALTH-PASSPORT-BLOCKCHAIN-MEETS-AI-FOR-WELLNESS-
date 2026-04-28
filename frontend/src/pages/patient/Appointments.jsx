import React, { useEffect, useState } from "react";
import "./Appointments.css";

const Appointments = ({ token, patientId, countOnly }) => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const fetchAppointments = async () => {
    const res = await fetch(
      `http://localhost:5000/api/appointments/patient/${patientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setAppointments(data.data || []);
  };

  const fetchDoctors = async () => {
    const res = await fetch(`http://localhost:5000/api/patients/${patientId}/approved-doctors`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setDoctors(data.data || []);
  };

  const bookAppointment = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!doctorId || !date) {
      setMessage("Please select a doctor and date.");
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/appointments/book`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientId, doctorId, date }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Appointment booked successfully!");
        setDoctorId("");
        setDate("");
        fetchAppointments();
      } else {
        setMessage(data.message || data.error || "Failed to book appointment.");
      }
    } catch (err) {
      setMessage("Network error. Please try again.");
    }
  };

  if (countOnly) return appointments.length;

  return (
    <div className="appointments-container">
      <h2>Appointments</h2>

      <form onSubmit={bookAppointment}>
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
          <option value="">Select Doctor</option>
          {doctors.map((doc) => (
            <option key={doc._id} value={doc._id}>
              Dr. {doc.name} - {doc.specialty || doc.specialization || "General"}
            </option>
          ))}
        </select>

        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button type="submit" disabled={!doctorId || !date}>Book</button>
      </form>
      {message && <div className="booking-message">{message}</div>}

      <ul>
        {appointments.map((appt) => (
          <li key={appt._id}>
            Dr. {appt.doctor?.name || "Unknown"} — {new Date(appt.date).toLocaleString()} — {appt.status || appt.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Appointments;
