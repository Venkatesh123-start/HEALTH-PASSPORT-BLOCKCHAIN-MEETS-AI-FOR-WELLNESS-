
const express = require("express");
const router = express.Router();

const {
   addPatient,
   getPatients,
   getPatientById,
   getPatientProfile,
   getDashboardSummary,
   getAccessStatus,
   getApprovedDoctors,
   getPendingDoctorRequests,
   handleDoctorAccessRequest,
   revokeDoctorAccess,
} = require("../controllers/patientController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, checkRole, isPatient } = require("../middleware/roleMiddleware");

/* ==========================================
   🟢 PUBLIC ROUTE (Patient Registration)
========================================== */
router.post("/register", addPatient);

/* ==========================================
   🔒 PATIENT ROUTE (Get Own Profile)
========================================== */
router.get("/profile", protect, isPatient, getPatientProfile);

/* ==========================================
   🔒 PATIENT 360 DASHBOARD SUMMARY
========================================== */
router.get("/dashboard-summary", protect, isPatient, getDashboardSummary);

/* ==========================================
   🔒 DOCTOR ACCESS ROUTES (More specific - must come before /:patientId)
========================================== */

// Get all approved doctors for the authenticated patient
router.get("/access/approved", protect, isPatient, getApprovedDoctors);

// Get all pending doctor access requests for this patient
router.get("/access/requests/pending", protect, isPatient, getPendingDoctorRequests);

// Support both with and without trailing slash for pending requests
router.get("/access/requests/pending/", protect, isPatient, getPendingDoctorRequests);

// Approve or reject a doctor's access request
router.patch("/access/requests/:doctorId", protect, isPatient, handleDoctorAccessRequest);

// Revoke a doctor's access
router.delete("/access/requests/:doctorId", protect, isPatient, revokeDoctorAccess);

/* ==========================================
   🔒 ADMIN ROUTES
========================================== */

// Get All Patients (Admin Only)
router.get("/", protect, checkRole(["admin"]), getPatients);

/* ==========================================
   🔒 PARAMETERIZED ROUTES (Must come LAST)
========================================== */

// Get all doctors with approved access for this patient
router.get("/:patientId/approved-doctors", protect, isPatient, getApprovedDoctors);

// Get Access Status for a Doctor (Patient)
router.get("/:patientId/access-status/:doctorId", protect, isPatient, getAccessStatus);

// Get Single Patient by ID (Admin + Doctor)
router.get("/:id", protect, checkRole(["admin", "doctor"]), getPatientById);


// router.get("/:patientId/records", getRecords);
// router.post("/:patientId/records/upload", uploadRecord);
// router.get("/:patientId/labs", getLabReports);
// router.get("/:patientId/appointments/upcoming", getUpcomingAppointments);
// router.get("/:patientId/appointments/history", getPastAppointments);
// router.post("/:patientId/appointments/create", createAppointment);
// router.patch("/:patientId/appointments/update", updateAppointment);
// router.delete("/:patientId/appointments/cancel", cancelAppointment);
// router.get("/:patientId/notifications", getNotifications);
// router.get("/:patientId/insurance", getInsurance);
// router.post("/:patientId/insurance/upload", uploadInsurance);
// router.get("/:patientId/ai-insights", getAIInsights);
// router.post("/:patientId/access/request", requestAccess);
// router.patch("/:patientId/access/grant", grantAccess);
// router.patch("/:patientId/access/revoke", revokeAccess);


module.exports = router;