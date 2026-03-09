// routes/vitalsRoutes.js
const express = require("express");
const router = express.Router();
const {
  recordVitals,
  getPatientVitals,
  getMyVitals,
  deleteVitals,
  getVitalsTrends,
} = require("../controllers/vitalsController");
const { protect } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");

/**
 * Vitals Routes
 * All routes require authentication
 * RBAC middleware ensures proper access control
 */

// Record new vitals - Patient or Doctor
router.post(
  "/",
  protect,
  checkRole(["patient", "doctor"]),
  recordVitals
);

// Get my vitals (for logged-in patient)
router.get(
  "/my-vitals",
  protect,
  checkRole(["patient"]),
  getMyVitals
);

// Get patient's vitals history - Patient (own) or Doctor
router.get(
  "/patient/:patientId",
  protect,
  checkRole(["patient", "doctor"]),
  getPatientVitals
);

// Get vitals trends/statistics
router.get(
  "/trends/:patientId",
  protect,
  checkRole(["patient", "doctor"]),
  getVitalsTrends
);

// Delete vitals record - only recorder can delete
router.delete(
  "/:id",
  protect,
  checkRole(["patient", "doctor"]),
  deleteVitals
);

module.exports = router;
