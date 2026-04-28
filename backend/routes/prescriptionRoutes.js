// routes/prescriptionRoutes.js
const express = require("express");
const router = express.Router();
const {
  createPrescription,
  getPatientPrescriptions,
  getMyPrescriptions,
  getPrescriptionById,
  updatePrescriptionStatus,
  getDoctorPrescriptions,
  verifyPrescription,
} = require("../controllers/prescriptionController");
const { protect } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");

/**
 * Prescription Routes
 * All routes require authentication
 * RBAC middleware ensures proper access control
 * 
 * Security: Patients cannot modify prescription records
 * Only doctors can create prescriptions
 */

// Create prescription - Doctor only
router.post(
  "/",
  protect,
  checkRole(["doctor"]),
  createPrescription
);

// Get my prescriptions (for logged-in patient)
router.get(
  "/my-prescriptions",
  protect,
  checkRole(["patient"]),
  getMyPrescriptions
);

// Get prescriptions issued by doctor
router.get(
  "/doctor",
  protect,
  checkRole(["doctor"]),
  getDoctorPrescriptions
);

// Get patient's prescriptions - Patient (own) or Doctor
router.get(
  "/patient/:patientId",
  protect,
  checkRole(["patient", "doctor"]),
  getPatientPrescriptions
);

// Verify prescription integrity
router.get(
  "/:id/verify",
  protect,
  checkRole(["patient", "doctor"]),
  verifyPrescription
);

// Get single prescription by ID
router.get(
  "/:id",
  protect,
  checkRole(["patient", "doctor"]),
  getPrescriptionById
);

// Update prescription status (e.g., mark completed)
router.patch(
  "/:id/status",
  protect,
  checkRole(["patient", "doctor"]),
  updatePrescriptionStatus
);

module.exports = router;
