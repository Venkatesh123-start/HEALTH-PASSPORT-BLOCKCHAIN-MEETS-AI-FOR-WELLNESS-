// routes/recordRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const { isPatient, checkRole } = require("../middleware/roleMiddleware");

const {
  // New record management functions
  uploadRecord,
  getPatientRecords,
  getRecordById,
  downloadRecord,
  deleteRecord,
  verifyRecord,
  // Encrypted record functions (Patient only)
  uploadEncryptedRecord,
  getMyRecords,
  getDecryptionKey,
  // Legacy blockchain functions
  registerUser,
  addRecord,
  getRecords,
  getUser,
} = require("../controllers/recordController");

// Configure multer for file uploads (memory storage for IPFS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common medical document types
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, images, and documents are allowed."), false);
    }
  },
});

// ===== New Medical Records API =====

// Upload a medical record (with file)
router.post("/upload/:patientId", protect, upload.single("file"), uploadRecord);

// ===== Encrypted Medical Records API (Patient Only) =====
// NOTE: These routes must come BEFORE /:recordId to prevent route conflicts

// Upload encrypted medical record (Patient only)
router.post(
  "/upload-encrypted",
  protect,
  isPatient,
  upload.single("encryptedFile"),
  uploadEncryptedRecord
);

// Get patient's own records (My Records)
router.get("/my-records", protect, isPatient, getMyRecords);

// Get all records for a patient
router.get("/patient/:patientId", protect, getPatientRecords);

// Get decryption key for a record (Patient only)
router.get("/:recordId/decrypt-key", protect, isPatient, getDecryptionKey);

// Download a record file
router.get("/:recordId/download", protect, downloadRecord);

// Verify a record on blockchain
router.get("/:recordId/verify", verifyRecord);

// Get a single record by ID
router.get("/:recordId", protect, getRecordById);

// Delete a record
router.delete("/:recordId", protect, deleteRecord);

// ===== Legacy Blockchain Routes =====

// Register user on blockchain
router.post("/register", registerUser);

// Add record to blockchain (legacy)
router.post("/add-record", addRecord);

// Get records from blockchain by wallet address
router.get("/blockchain/:patientAddress", getRecords);

// Get user from blockchain by wallet address
router.get("/user/:userAddress", getUser);

module.exports = router;