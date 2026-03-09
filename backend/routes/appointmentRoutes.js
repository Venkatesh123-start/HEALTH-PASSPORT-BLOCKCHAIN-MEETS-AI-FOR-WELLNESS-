const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");
const { isPatient } = require("../middleware/roleMiddleware");
const DoctorPatientAccess = require("../models/DoctorPatientAccess");

// Middleware: Ensure patient has approved access to doctor
async function ensureApprovedAccess(req, res, next) {
  try {
    const { patientId, doctorId } = req.body;
    if (!patientId || !doctorId) {
      return res.status(400).json({ message: "Missing patientId or doctorId" });
    }
    const access = await DoctorPatientAccess.findOne({
      patient: patientId,
      doctor: doctorId,
      status: "approved",
    });
    if (!access) {
      return res.status(403).json({ message: "Access to this doctor is not approved" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Access check failed", error: err.message });
  }
}

// Book an appointment (Patient only, must have approved access)
router.post(
  "/book",
  protect,
  isPatient,
  ensureApprovedAccess,
  appointmentController.createAppointment
);

// Get all appointments for a patient (Patient only)
router.get(
  "/patient/:patientId",
  protect,
  isPatient,
  async (req, res) => {
    try {
      // Only allow the patient to view their own appointments
      if (req.user._id.toString() !== req.params.patientId) {
        return res.status(403).json({ message: "Forbidden: Cannot view other patients' appointments" });
      }
      const appointments = await require("../models/Appointment").find({ patient: req.params.patientId })
        .populate("doctor");
      res.json(appointments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch appointments", error: err.message });
    }
  }
);

// (Optional) Profile route for compatibility
router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;