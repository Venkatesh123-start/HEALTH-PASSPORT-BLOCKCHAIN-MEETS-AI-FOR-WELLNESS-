const express = require("express");
const router = express.Router();

const {
  createClaim,
  getMyClaims,
  updateClaimStatus,
  createPatientClaim,
  getClaimsByPatient,
} = require("../controllers/claimController");
const { protect } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Create a claim (Insurance only)
router.post("/", protect, checkRole(["insurance"]), createClaim);

// Get my claims (Insurance only)
router.get("/", protect, checkRole(["insurance"]), getMyClaims);

// Update claim status (Insurance only)
router.patch("/:id/status", protect, checkRole(["insurance"]), updateClaimStatus);

module.exports = router;

// Patient routes
router.post(
  "/patient",
  protect,
  checkRole(["patient"]),
  upload.array("files", 10),
  createPatientClaim
);

router.get(
  "/patient/:patientId",
  protect,
  checkRole(["patient", "insurance", "admin"]),
  getClaimsByPatient
);
