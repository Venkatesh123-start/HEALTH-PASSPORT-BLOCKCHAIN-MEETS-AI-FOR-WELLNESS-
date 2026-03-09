const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const visitController = require("../controllers/visitController");

// Middleware to check if user is a doctor
const isDoctor = (req, res, next) => {
  if (req.user && req.user.role === "doctor") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Doctors only." });
  }
};

// Doctor routes
router.post("/", protect, isDoctor, visitController.createVisit);
router.get("/doctor", protect, isDoctor, visitController.getDoctorVisits);
router.get("/patients", protect, isDoctor, visitController.getAllPatients);
router.get("/stats", protect, isDoctor, visitController.getVisitStats);
router.put("/:visitId", protect, isDoctor, visitController.updateVisit);
router.post("/:visitId/prescription", protect, isDoctor, visitController.addPrescription);

// Patient routes (fetch their own visits)
router.get("/patient/:patientId", protect, visitController.getPatientVisits);

// Common routes
router.get("/:visitId", protect, visitController.getVisitById);

module.exports = router;
