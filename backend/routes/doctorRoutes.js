const express = require("express");
const router = express.Router();

const {
  addDoctor,
  getDoctors,
  getDoctorById,
  getDoctorsForPatients,
  getDoctorPatients,
  getAccessRequests,
  handleAccessRequest,
  revokeAccess,
  requestDoctorAccess,
  updateDoctorProfile,
  updateDoctorPassword,
} = require("../controllers/doctorController");

const { getDoctorAppointments } = require("../controllers/appointmentController");

const { getDoctorRecords } = require("../controllers/recordController");

const { getDoctorNotifications } = require("../controllers/notificationsController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, checkRole, isDoctor, isAdmin } = require("../middleware/roleMiddleware");

/* ==========================================
   🟢 PUBLIC ROUTE (Doctor Registration)
========================================== */
router.post("/register", addDoctor);

/* ==========================================
   🔒 PROTECTED ROUTES (Non-parameterized, specific routes first)
========================================== */

// Get Doctors List for Patients (Patient accessible)
router.get(
  "/list",
  protect,
  checkRole(["patient", "admin"]),
  getDoctorsForPatients
);

/* ==========================================
   🔒 DOCTOR-PATIENT ACCESS ROUTES (Specific routes before /:doctorId)
========================================== */

// Get Doctor's Appointments (Doctor only)
router.get(
  "/:doctorId/appointments",
  protect,
  isDoctor,
  getDoctorAppointments
);

// Get Doctor's Records (Doctor only)
router.get(
  "/:doctorId/records",
  protect,
  isDoctor,
  getDoctorRecords
);

// Get Doctor's Notifications (Doctor only)
router.get(
  "/:doctorId/notifications",
  protect,
  isDoctor,
  getDoctorNotifications
);

// Get Doctor's Patients (Doctor only)
router.get(
  "/:doctorId/patients",
  protect,
  isDoctor,
  getDoctorPatients
);

// Get Pending Access Requests (Doctor only)
router.get(
  "/:doctorId/access-requests",
  protect,
  isDoctor,
  getAccessRequests
);

// Approve/Reject Access Request (Doctor only)
router.patch(
  "/:doctorId/patient/:patientId/access",
  protect,
  isDoctor,
  handleAccessRequest
);

// Revoke Patient Access (Doctor only)
router.delete(
  "/:doctorId/patient/:patientId/access",
  protect,
  isDoctor,
  revokeAccess
);

// Update Doctor Profile (Doctor only)
router.put(
  "/:doctorId",
  protect,
  isDoctor,
  updateDoctorProfile
);

// Update Doctor Password (Doctor only)
router.put(
  "/:doctorId/password",
  protect,
  isDoctor,
  updateDoctorPassword
);

/* ==========================================
   🔒 GENERAL ROUTES (Generic routes come LAST)
========================================== */

// Get All Doctors (Admin only)
router.get(
  "/",
  protect,
  isAdmin,
  getDoctors
);

// Get Single Doctor (Admin + Doctor + Patient)
router.get(
  "/:id",
  protect,
  checkRole(["admin", "doctor", "patient"]),
  getDoctorById
);

// Request Access to Doctor (Patient only)
router.post(
  "/request-access",
  protect,
  checkRole(["patient"]),
  requestDoctorAccess
);

// router.get("/:doctorId/appointments/upcoming", getDoctorUpcomingAppointments);
// router.get("/:doctorId/appointments/history", getDoctorPastAppointments);
// router.get("/:doctorId/records/:patientId", getPatientRecords);
// router.post("/:doctorId/records/add/:patientId", addPatientRecord);
// router.get("/:doctorId/access-requests", getAccessRequests);
// router.patch("/:doctorId/access-requests/:patientId/approve", approveAccessRequest);
// router.patch("/:doctorId/access-requests/:patientId/reject", rejectAccessRequest);

module.exports = router;