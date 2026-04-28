// controllers/recordController.js
const Record = require("../models/Record");
const Patient = require("../models/Patient");
const { uploadFileToIPFS, getFileFromIPFS } = require("../services/ipfsService");
const { logRecordToBlockchain, isRecordOnBlockchain } = require("../services/healthRegistryService");
const { contract, account } = require("../config/blockchain");

/**
 * @desc    Upload a medical record (file upload + IPFS + blockchain)
 * @route   POST /api/records/upload/:patientId
 * @access  Private
 */
const uploadRecord = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { title, description, recordType } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Validate title
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Encrypt file buffer before uploading to IPFS
    const crypto = require("crypto");
    const { encryptFile } = require("../services/encryptionService");
    // Generate symmetric key and IV
    const symmetricKey = crypto.randomBytes(32).toString("hex"); // 256-bit key
    const iv = crypto.randomBytes(16).toString("hex");
    // Encrypt file buffer
    const encryptedBuffer = encryptFile(req.file.buffer, symmetricKey, iv);

    // Encrypt the symmetric key with master secret
    const masterSecret = process.env.ENCRYPTION_MASTER_SECRET || "medivault-master-secret-2024";
    function encryptWithMasterSecret(data, masterSecret) {
      const crypto = require("crypto");
      const key = crypto.scryptSync(masterSecret, "salt", 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(data, "utf8", "hex");
      encrypted += cipher.final("hex");
      return iv.toString("hex") + ":" + encrypted;
    }
    const encryptedKey = encryptWithMasterSecret(symmetricKey, masterSecret);

    // Generate encrypted filename
    const encryptedFileName = `enc_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.enc`;

    // Upload encrypted buffer to IPFS
    console.log(`📤 Uploading encrypted file to IPFS: ${encryptedFileName}`);
    const ipfsResult = await uploadFileToIPFS(
      encryptedBuffer,
      encryptedFileName,
      "application/octet-stream"
    );

    console.log(`✅ Encrypted file uploaded to IPFS: ${ipfsResult.hash}`);

    // Create record in MongoDB
    const record = await Record.create({
      title: title.trim(),
      description: description?.trim() || "",
      ipfsHash: ipfsResult.hash,
      fileSize: ipfsResult.size || encryptedBuffer.length,
      fileName: encryptedFileName,
      originalFileName: req.file.originalname,
      encryptedFileName: encryptedFileName,
      mimeType: "application/octet-stream",
      recordType: recordType || "Other",
      patient: patientId,
      uploadedBy: req.user?._id,
      isEncrypted: true,
      secretKey: encryptedKey,
      encryptionAlgorithm: "AES-256-CBC",
      encryptionIV: iv,
    });

    // Log to blockchain (non-blocking - don't fail if blockchain is unavailable)
    const blockchainResult = await logRecordToBlockchain(
      ipfsResult.hash,
      patientId,
      recordType || "Other"
    );

    if (blockchainResult.success) {
      record.blockchainTxHash = blockchainResult.txHash;
      record.blockchainLogged = true;
      await record.save();
      console.log(`✅ Record logged to blockchain: ${blockchainResult.txHash}`);
    } else {
      console.warn(`⚠️ Blockchain logging failed: ${blockchainResult.error}`);
    }

    // Create notifications for patient and any doctors with approved access
    try {
      const Notification = require("../models/Notification");
      const DoctorPatientAccess = require("../models/DoctorPatientAccess");

      // Notify patient
      await Notification.create({
        userId: patientId,
        userModel: "Patient",
        title: "New medical record uploaded",
        message: `Your record "${record.title}" was uploaded successfully.`,
        type: "record",
        metadata: {
          recordId: record._id,
          ipfsHash: record.ipfsHash,
          uploadedBy: req.user?._id,
        },
      });

      // Notify doctors who already have approved access to this patient
      const accessList = await DoctorPatientAccess.find({
        patient: patientId,
        status: "approved",
      })
        .select("doctor")
        .lean();

      if (accessList && accessList.length > 0) {
        const doctorNotifications = accessList.map((a) => ({
          userId: a.doctor,
          userModel: "Doctor",
          title: "New patient record available",
          message: `A new record "${record.title}" has been added for one of your patients.`,
          type: "record",
          metadata: {
            recordId: record._id,
            patientId,
          },
        }));

        await Notification.insertMany(doctorNotifications);
      }
    } catch (notifyErr) {
      console.warn(
        "[uploadRecord] Failed to create notifications for new record:",
        notifyErr.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Record uploaded successfully",
      data: {
        _id: record._id,
        title: record.title,
        ipfsHash: record.ipfsHash,
        fileSize: record.fileSize,
        recordType: record.recordType,
        createdAt: record.createdAt,
        ipfsUrl: record.ipfsUrl,
        blockchainLogged: record.blockchainLogged,
        blockchainTxHash: record.blockchainTxHash,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all records for a patient
 * @route   GET /api/records/patient/:patientId
 * @access  Private
 */
const getPatientRecords = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const records = await Record.find({ patient: patientId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records.map((r) => ({
        _id: r._id,
        title: r.title,
        description: r.description,
        ipfsHash: r.ipfsHash,
        fileSize: r.fileSize,
        fileName: r.fileName,
        mimeType: r.mimeType,
        recordType: r.recordType,
        createdAt: r.createdAt,
        uploadedBy: r.uploadedBy,
        ipfsUrl: r.ipfsUrl,
        localIpfsUrl: r.localIpfsUrl,
        blockchainLogged: r.blockchainLogged,
        blockchainTxHash: r.blockchainTxHash,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single record by ID
 * @route   GET /api/records/:recordId
 * @access  Private
 */
const getRecordById = async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await Record.findById(recordId)
      .populate("patient", "name email");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...record.toObject(),
        ipfsUrl: record.ipfsUrl,
        localIpfsUrl: record.localIpfsUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download a record file from IPFS
 * @route   GET /api/records/:recordId/download
 * @access  Private
 */
const downloadRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    // Fetch file from IPFS
    let fileBuffer = await getFileFromIPFS(record.ipfsHash);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File data not found in IPFS",
      });
    }

    console.log(
      `[downloadRecord] Retrieved file ${recordId}: size=${fileBuffer.length}, encrypted=${record.isEncrypted}`
    );

    // If file is encrypted and was encrypted on the server (uploadRecord),
    // decrypt it here. For patient self-encrypted records (uploadEncryptedRecord),
    // we return the encrypted bytes and let the frontend handle decryption.
    if (record.isEncrypted && record.secretKey && record.encryptionIV) {
      const isSelfUploadedPatientRecord =
        record.patient &&
        record.uploadedBy &&
        record.patient.toString() === record.uploadedBy.toString();

      if (!isSelfUploadedPatientRecord) {
        try {
          // Decrypt the symmetric key first
          const masterSecret =
            process.env.ENCRYPTION_MASTER_SECRET ||
            "medivault-master-secret-2024";
          function decryptWithMasterSecret(encryptedData, masterSecret) {
            const crypto = require("crypto");
            const [ivHex, encrypted] = encryptedData.split(":");
            const key = crypto.scryptSync(masterSecret, "salt", 32);
            const iv = Buffer.from(ivHex, "hex");
            const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            let decrypted = decipher.update(encrypted, "hex", "utf8");
            decrypted += decipher.final("utf8");
            return decrypted;
          }
          const decryptedKey = decryptWithMasterSecret(
            record.secretKey,
            masterSecret
          );

          console.log(
            `[downloadRecord] Decrypting server-encrypted file ${recordId} with IV length: ${record.encryptionIV.length}, key length: ${decryptedKey.length}`
          );

          // Server-encrypted file: use Node crypto decrypt via encryptionService.
          const { decryptFile } = require("../services/encryptionService");
          fileBuffer = decryptFile(fileBuffer, decryptedKey, record.encryptionIV);
          console.log(
            `[downloadRecord] Successfully decrypted server-encrypted file ${recordId}, new size: ${fileBuffer.length}`
          );
        } catch (decryptErr) {
          console.error(
            `[downloadRecord] Decryption failed for ${recordId}:`,
            decryptErr.message,
            decryptErr.stack
          );
          return res.status(400).json({
            success: false,
            message: "Failed to decrypt file",
            error: decryptErr.message,
          });
        }
      }
    }

    // Set headers for download (use original filename when available)
    res.status(200);
    res.setHeader(
      "Content-Type",
      record.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${
        record.originalFileName || record.fileName || "file"
      }"`
    );
    // Disable HTTP caching so browser doesn't reuse old encrypted response
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Length", fileBuffer.length);

    res.send(fileBuffer);
  } catch (error) {
    console.error("[downloadRecord] Unexpected error:", error.message, error.stack);
    next(error);
  }
};

/**
 * @desc    Delete a record
 * @route   DELETE /api/records/:recordId
 * @access  Private
 */
const deleteRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    await record.deleteOne();

    res.json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify a record exists on blockchain
 * @route   GET /api/records/:recordId/verify
 * @access  Public
 */
const verifyRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    const isOnBlockchain = await isRecordOnBlockchain(record.ipfsHash);

    res.json({
      success: true,
      data: {
        recordId: record._id,
        ipfsHash: record.ipfsHash,
        blockchainLogged: record.blockchainLogged,
        blockchainTxHash: record.blockchainTxHash,
        verifiedOnBlockchain: isOnBlockchain,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===== Legacy blockchain functions (keep for backward compatibility) =====

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { name, role } = req.body;

    if (!name || role === undefined) {
      return res.status(400).json({ error: "Name and role are required" });
    }

    const tx = await contract.methods.registerUser(name, role).send({
      from: account.address,
      gas: 500000,
    });

    res.json({ success: true, txHash: tx.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Add a medical record (doctor only) - Legacy method
const addRecord = async (req, res) => {
  try {
    const { patientAddress, recordHash } = req.body;

    if (!patientAddress || !recordHash) {
      return res.status(400).json({ error: "Patient address and record hash are required" });
    }

    const tx = await contract.methods.addRecord(patientAddress, recordHash).send({
      from: account.address,
      gas: 500000,
    });

    res.json({ success: true, txHash: tx.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get all records of a patient - Legacy method
const getRecords = async (req, res) => {
  try {
    const { patientAddress } = req.params;

    if (!patientAddress) {
      return res.status(400).json({ error: "Patient address is required" });
    }

    const records = await contract.methods.getRecords(patientAddress).call({
      from: account.address,
    });

    res.json({ success: true, records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get user info
const getUser = async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return res.status(400).json({ error: "User address is required" });
    }

    const user = await contract.methods.getUser(userAddress).call({
      from: account.address,
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * @desc    Upload encrypted medical record (Patient only)
 * @route   POST /api/records/upload-encrypted
 * @access  Private (Patient only)
 */
const uploadEncryptedRecord = async (req, res, next) => {
  try {
    const { title, description, recordType, originalFileName, encryptionIV } = req.body;
    const patientId = req.user.id; // Patient uploads their own records

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate encrypted file buffer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No encrypted file uploaded",
      });
    }

    // Validate title
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Use the symmetric key and IV generated on the client for this encrypted file
    const crypto = require("crypto");
    const { symmetricKey, encryptionIV: ivFromBody, mimeType } = req.body;

    if (!symmetricKey || !ivFromBody) {
      return res.status(400).json({
        success: false,
        message: "Missing symmetric key or IV for encrypted upload",
      });
    }

    const iv = ivFromBody;

    // Encrypt the symmetric key with master secret (for prototype)
    const masterSecret =
      process.env.ENCRYPTION_MASTER_SECRET || "medivault-master-secret-2024";
    const encryptedKey = encryptWithMasterSecret(symmetricKey, masterSecret);

    // Generate encrypted filename
    const encryptedFileName = `enc_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.enc`;

    // Upload encrypted buffer to IPFS
    console.log(`📤 Uploading encrypted file to IPFS: ${encryptedFileName}`);
    const ipfsResult = await uploadFileToIPFS(
      req.file.buffer,
      encryptedFileName,
      "application/octet-stream"
    );

    console.log(`✅ Encrypted file uploaded to IPFS: ${ipfsResult.hash}`);

    // Create record in MongoDB
    const record = await Record.create({
      title: title.trim(),
      description: description?.trim() || "",
      ipfsHash: ipfsResult.hash,
      fileSize: ipfsResult.size || req.file.size,
      fileName: encryptedFileName,
      originalFileName: originalFileName || req.file.originalname || "unknown",
      encryptedFileName: encryptedFileName,
      mimeType: mimeType || "application/octet-stream", // Original MIME type if provided
      recordType: recordType || "Other",
      patient: patientId,
      uploadedBy: patientId,
      isEncrypted: true,
      secretKey: encryptedKey,
      encryptionAlgorithm: "AES-256-CBC",
      encryptionIV: iv,
    });

    // Log to blockchain (non-blocking)
    const blockchainResult = await logRecordToBlockchain(
      ipfsResult.hash,
      patientId,
      recordType || "Other"
    );

    if (blockchainResult.success) {
      record.blockchainTxHash = blockchainResult.txHash;
      record.blockchainLogged = true;
      await record.save();
      console.log(`✅ Encrypted record logged to blockchain: ${blockchainResult.txHash}`);
    }

    // Create notifications for patient and any doctors with approved access
    try {
      const Notification = require("../models/Notification");
      const DoctorPatientAccess = require("../models/DoctorPatientAccess");

      // Notify patient
      await Notification.create({
        userId: patientId,
        userModel: "Patient",
        title: "New encrypted medical record uploaded",
        message: `Your encrypted record "${record.title}" was uploaded successfully.`,
        type: "record",
        metadata: {
          recordId: record._id,
          ipfsHash: record.ipfsHash,
          encrypted: true,
        },
      });

      // Notify doctors who already have approved access to this patient
      const accessList = await DoctorPatientAccess.find({
        patient: patientId,
        status: "approved",
      })
        .select("doctor")
        .lean();

      if (accessList && accessList.length > 0) {
        const doctorNotifications = accessList.map((a) => ({
          userId: a.doctor,
          userModel: "Doctor",
          title: "New patient record available",
          message: `A new encrypted record "${record.title}" has been added for one of your patients.`,
          type: "record",
          metadata: {
            recordId: record._id,
            patientId,
            encrypted: true,
          },
        }));

        await Notification.insertMany(doctorNotifications);
      }
    } catch (notifyErr) {
      console.warn(
        "[uploadEncryptedRecord] Failed to create notifications for new encrypted record:",
        notifyErr.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Encrypted record uploaded successfully",
      data: {
        _id: record._id,
        title: record.title,
        ipfsHash: record.ipfsHash,
        fileSize: record.fileSize,
        originalFileName: record.originalFileName,
        recordType: record.recordType,
        isEncrypted: record.isEncrypted,
        createdAt: record.createdAt,
        blockchainLogged: record.blockchainLogged,
        blockchainTxHash: record.blockchainTxHash,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get patient's own records (My Records)
 * @route   GET /api/records/my-records
 * @access  Private (Patient only)
 */
const getMyRecords = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    const records = await Record.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .select("-secretKey"); // Don't expose encrypted keys in list

    res.json({
      success: true,
      count: records.length,
      data: records.map((r) => ({
        _id: r._id,
        title: r.title,
        description: r.description,
        ipfsHash: r.ipfsHash,
        fileSize: r.fileSize,
        originalFileName: r.originalFileName || r.fileName,
        mimeType: r.mimeType,
        recordType: r.recordType,
        isEncrypted: r.isEncrypted,
        createdAt: r.createdAt,
        ipfsUrl: `https://ipfs.io/ipfs/${r.ipfsHash}`,
        localIpfsUrl: `http://127.0.0.1:8080/ipfs/${r.ipfsHash}`,
        blockchainLogged: r.blockchainLogged,
        blockchainTxHash: r.blockchainTxHash,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get decryption key for a record (Patient only, for their own records)
 * @route   GET /api/records/:recordId/decrypt-key
 * @access  Private (Patient only)
 */
const getDecryptionKey = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const patientId = req.user.id;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    // Verify patient owns this record
    if (record.patient.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: "You can only decrypt your own records",
      });
    }

    if (!record.isEncrypted || !record.secretKey) {
      return res.status(400).json({
        success: false,
        message: "This record is not encrypted",
      });
    }

    // Decrypt the symmetric key with master secret
    const masterSecret = process.env.ENCRYPTION_MASTER_SECRET || "medivault-master-secret-2024";
    const decryptedKey = decryptWithMasterSecret(record.secretKey, masterSecret);

    res.json({
      success: true,
      data: {
        recordId: record._id,
        symmetricKey: decryptedKey,
        encryptionIV: record.encryptionIV,
        encryptionAlgorithm: record.encryptionAlgorithm,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get decryption key for a record (Doctor with approved access)
 * @route   GET /api/records/:recordId/decrypt-key-doctor
 * @access  Private (Doctor only, must have approved access to patient)
 */
const getDecryptionKeyForDoctor = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const doctorId = req.user.id;

    const record = await Record.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    if (!record.isEncrypted || !record.secretKey) {
      return res.status(400).json({
        success: false,
        message: "This record is not encrypted",
      });
    }

    // Verify doctor has approved access to this patient, or is admin
    const DoctorPatientAccess = require("../models/DoctorPatientAccess");
    const access = await DoctorPatientAccess.findOne({
      doctor: doctorId,
      patient: record.patient,
      status: "approved",
    });

    const isAdmin =
      req.user.role && req.user.role.toLowerCase() === "admin";

    if (!access && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to decrypt this record",
      });
    }

    // Decrypt the symmetric key with master secret
    const masterSecret =
      process.env.ENCRYPTION_MASTER_SECRET || "medivault-master-secret-2024";
    const decryptedKey = decryptWithMasterSecret(record.secretKey, masterSecret);

    res.json({
      success: true,
      data: {
        recordId: record._id,
        symmetricKey: decryptedKey,
        encryptionIV: record.encryptionIV,
        encryptionAlgorithm: record.encryptionAlgorithm,
        mimeType: record.mimeType,
        originalFileName: record.originalFileName || record.fileName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions for key encryption
function encryptWithMasterSecret(data, masterSecret) {
  const crypto = require("crypto");
  const key = crypto.scryptSync(masterSecret, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptWithMasterSecret(encryptedData, masterSecret) {
  const crypto = require("crypto");
  const [ivHex, encrypted] = encryptedData.split(":");
  const key = crypto.scryptSync(masterSecret, "salt", 32);
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * @desc    Get all records for patients that a doctor has access to
 * @route   GET /api/doctor/:doctorId/records
 * @access  Private (Doctor only)
 */
const getDoctorRecords = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required",
      });
    }

    // Validate user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const DoctorPatientAccess = require("../models/DoctorPatientAccess");
    const mongoose = require("mongoose");

    // Validate doctorId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format",
      });
    }

    // Security check: verify authenticated doctor is accessing their own records
    const userIdString = req.user._id.toString();
    const isOwnRecords = userIdString === doctorId;
    const isAdmin = req.user.role && req.user.role.toLowerCase() === "admin";

    if (!isOwnRecords && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only access your own records",
      });
    }

    // Get all patients this doctor has approved access to
    const accessList = await DoctorPatientAccess.find({
      doctor: doctorId,
      status: "approved",
    }).lean();

    if (!accessList || accessList.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const patientIds = accessList.map((a) => a.patient);

    // Get all records for these patients
    const records = await Record.find({ patient: { $in: patientIds } })
      .sort({ createdAt: -1 })
      .populate("patient", "name email")
      .lean();

    // Format records to match frontend expectations
    const formattedRecords = records.map((r) => ({
      _id: r._id,
      title: r.title,
      description: r.description,
      ipfsHash: r.ipfsHash,
      fileSize: r.fileSize,
      fileName: r.fileName,
      originalFileName: r.originalFileName || r.fileName,
      mimeType: r.mimeType,
      recordType: r.recordType,
      type: r.recordType, // Alias for frontend
      createdAt: r.createdAt,
      date: r.createdAt, // Alias for frontend
      patientName: r.patient?.name || "Unknown", // Extract patient name for frontend
      patient: r.patient,
      uploadedBy: r.uploadedBy,
      blockchainLogged: r.blockchainLogged,
      blockchainTxHash: r.blockchainTxHash,
    }));

    res.json({
      success: true,
      count: formattedRecords.length,
      data: formattedRecords,
    });
  } catch (error) {
    console.error("[getDoctorRecords] Error:", error);
    next(error);
  }
};

module.exports = {
  // New record management functions
  uploadRecord,
  getPatientRecords,
  getRecordById,
  downloadRecord,
  deleteRecord,
  verifyRecord,
  getDoctorRecords,
  // Encrypted record functions (Patient only)
  uploadEncryptedRecord,
  getMyRecords,
  getDecryptionKey,
  getDecryptionKeyForDoctor,
  // Legacy blockchain functions
  registerUser,
  addRecord,
  getRecords,
  getUser,
};