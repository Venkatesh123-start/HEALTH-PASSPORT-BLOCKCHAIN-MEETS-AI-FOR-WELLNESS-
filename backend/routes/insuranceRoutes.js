const express = require("express");
const router = express.Router();

const {
  addInsurance,
  getInsuranceByPatient,
  registerInsuranceUser,
} = require("../controllers/insuranceController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, checkRole, isAdmin } = require("../middleware/roleMiddleware");

/* ==========================================
   🔐 INSURANCE USER REGISTRATION (Public)
========================================== */
router.post("/register", registerInsuranceUser);

/* ==========================================
   🟢 INSURANCE ROUTES
========================================== */

// Add Insurance (Admin or Insurance role)
router.post("/add", protect, checkRole(["admin", "insurance"]), addInsurance);

// Get Insurance by Patient (Patient + Admin + Insurance)
router.get("/:patientId", protect, checkRole(["patient", "admin", "insurance"]), getInsuranceByPatient);

module.exports = router;