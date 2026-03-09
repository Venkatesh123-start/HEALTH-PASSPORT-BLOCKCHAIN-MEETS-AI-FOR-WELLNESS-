const express = require("express");
const router = express.Router();

const {
  addLabReport,
  getLabReports,
  registerLabUser,
  getLabDashboardStats,
  updateLabReportStatus,
  getPatients,
  getPatientLabReports,
} = require("../controllers/labController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, checkRole, isDoctor, isAdmin } = require("../middleware/roleMiddleware");

/* ==========================================
   🔐 LAB USER REGISTRATION (Public)
========================================== */
router.post("/register", registerLabUser);

/* ==========================================
   🟢 LAB REPORT ROUTES
========================================== */

// Get Lab Dashboard Stats (Lab only)
router.get("/dashboard", protect, checkRole(["lab"]), getLabDashboardStats);

// Get All Patients (for lab to select)
router.get("/patients", protect, checkRole(["lab", "doctor"]), getPatients);

// Get Lab Reports for a specific patient (Patient, Doctor, Admin)
router.get("/patient/:patientId", protect, checkRole(["patient", "doctor", "admin"]), getPatientLabReports);

// Add Lab Report (Doctor or Lab)
router.post("/add", protect, checkRole(["doctor", "lab"]), addLabReport);

// Get All Lab Reports (Doctor + Admin + Lab)
router.get("/", protect, checkRole(["doctor", "admin", "lab"]), getLabReports);

// Update Lab Report Status
router.patch("/report/:reportId", protect, checkRole(["lab", "doctor"]), updateLabReportStatus);

module.exports = router;