const express = require("express");
const router = express.Router();

const {
  addInsurance,
  getInsuranceByPatient,
  registerInsuranceUser,
} = require("../controllers/insuranceController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles, checkRole, isAdmin } = require("../middleware/roleMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { addPolicyDocument, getInsuranceOverview } = require("../controllers/insuranceController");

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

// Get Insurance Overview with remaining coverage
router.get("/:patientId/overview", protect, checkRole(["patient", "admin", "insurance"]), getInsuranceOverview);

// Add policy document (IPFS upload)
router.post(
  "/:policyId/documents",
  protect,
  checkRole(["patient", "admin", "insurance"]),
  upload.single("file"),
  addPolicyDocument
);

module.exports = router;
