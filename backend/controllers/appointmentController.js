const Appointment = require("../models/Appointment");

// Create Appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, reason } = req.body;

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      date,
      reason,
      status: "scheduled", // always lowercase
    });

    res.status(201).json({
      message: "Appointment created successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Appointments
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient")
      .populate("doctor");

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json({
      message: "Appointment updated",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Doctor's Appointments
exports.getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient")
      .populate("doctor");

    // Shape data for doctor dashboard (include patientName)
    const formatted = appointments.map((a) => ({
      _id: a._id,
      patientName:
        a.patient?.name ||
        a.patient?.fullName ||
        `${a.patient?.firstName || ""} ${a.patient?.lastName || ""}`.trim() ||
        a.patient?.email ||
        "Unknown patient",
      date: a.date,
      type: a.reason || "Consultation",
      status:
        a.status === "scheduled"
          ? "Pending"
          : a.status?.charAt(0).toUpperCase() + a.status?.slice(1),
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};