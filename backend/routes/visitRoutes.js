const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const visitController = require("../controllers/visitController");

// Middleware to check if user is a doctor
const isDoctor = (req, res, next) => {
  if (req.user && req.user.role === "doctor") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Doctors only." });
  }
};

// Specific routes (non-parameterized) must come BEFORE generic ones
router.get("/patients", protect, isDoctor, visitController.getAllPatients);
router.get("/doctor", protect, isDoctor, visitController.getDoctorVisits);
router.get("/stats", protect, isDoctor, visitController.getVisitStats);

// Parameterized routes
router.get("/patient/:patientId", protect, visitController.getPatientVisits);
router.get("/:visitId", protect, visitController.getVisitById);
router.put("/:visitId", protect, isDoctor, visitController.updateVisit);
router.post("/:visitId/prescription", protect, isDoctor, visitController.addPrescription);

// Generic routes come LAST
router.post("/", protect, isDoctor, visitController.createVisit);

module.exports = router;
