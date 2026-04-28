import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    patientName: "",
    doctorName: "",
    date: "",
    time: "",
  });

  // Dummy data for demo; replace with API call to backend or blockchain
  useEffect(() => {
    const demoAppointments = [
      { patientName: "Alice", doctorName: "Dr. Smith", date: "2026-03-05", time: "10:00 AM" },
      { patientName: "Bob", doctorName: "Dr. John", date: "2026-03-06", time: "02:00 PM" },
    ];
    setAppointments(demoAppointments);
  }, []);

  const handleInputChange = (e) => {
    setNewAppointment({ ...newAppointment, [e.target.name]: e.target.value });
  };

  const handleAddAppointment = () => {
    const { patientName, doctorName, date, time } = newAppointment;
    if (!patientName || !doctorName || !date || !time) {
      toast.error("Please fill all fields");
      return;
    }
    setAppointments([...appointments, newAppointment]);
    toast.success("Appointment added successfully!");
    setNewAppointment({ patientName: "", doctorName: "", date: "", time: "" });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded p-6">
        <h2 className="text-2xl font-bold text-purple-600 mb-6">Appointments</h2>

        {/* Add Appointment Form */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Schedule New Appointment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="patientName"
              placeholder="Patient Name"
              value={newAppointment.patientName}
              onChange={handleInputChange}
              className="p-2 border rounded"
            />
            <input
              type="text"
              name="doctorName"
              placeholder="Doctor Name"
              value={newAppointment.doctorName}
              onChange={handleInputChange}
              className="p-2 border rounded"
            />
            <input
              type="date"
              name="date"
              value={newAppointment.date}
              onChange={handleInputChange}
              className="p-2 border rounded"
            />
            <input
              type="time"
              name="time"
              value={newAppointment.time}
              onChange={handleInputChange}
              className="p-2 border rounded"
            />
          </div>
          <button
            className="mt-4 py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700"
            onClick={handleAddAppointment}
          >
            Add Appointment
          </button>
        </div>

        {/* Appointments Table */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Upcoming Appointments</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-purple-100">
                  <th className="border px-4 py-2">Patient</th>
                  <th className="border px-4 py-2">Doctor</th>
                  <th className="border px-4 py-2">Date</th>
                  <th className="border px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center p-4">
                      No appointments scheduled.
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{appt.patientName}</td>
                      <td className="border px-4 py-2">{appt.doctorName}</td>
                      <td className="border px-4 py-2">{appt.date}</td>
                      <td className="border px-4 py-2">{appt.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
