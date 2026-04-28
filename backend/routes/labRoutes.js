const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'lab-reports');
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  // Accept all files - let the frontend handle filtering
});

const {
  addLabReport,
  getLabReports,
  registerLabUser,
  getLabDashboardStats,
  updateLabReportStatus,
  getPatients,
  getPatientLabReports,
  downloadLabReport,
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

// Add Lab Report (Doctor or Lab) - with file upload
router.post("/add", protect, checkRole(["doctor", "lab"]), upload.single('reportFile'), addLabReport);

// Get All Lab Reports (Doctor + Admin + Lab)
router.get("/", protect, checkRole(["doctor", "admin", "lab"]), getLabReports);
router.get("/reports", protect, checkRole(["doctor", "admin", "lab"]), getLabReports);

// Update Lab Report Status
router.patch("/report/:reportId", protect, checkRole(["lab", "doctor"]), updateLabReportStatus);

// Download Lab Report File
router.get("/download/:reportId", protect, checkRole(["patient", "doctor", "admin"]), downloadLabReport);

module.exports = router;