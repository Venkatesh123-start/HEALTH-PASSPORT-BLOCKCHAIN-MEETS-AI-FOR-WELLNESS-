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

    // Upload file to IPFS
    console.log(`📤 Uploading file to IPFS: ${req.file.originalname}`);
    const ipfsResult = await uploadFileToIPFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    console.log(`✅ File uploaded to IPFS: ${ipfsResult.hash}`);

    // Create record in MongoDB
    const record = await Record.create({
      title: title.trim(),
      description: description?.trim() || "",
      ipfsHash: ipfsResult.hash,
      fileSize: ipfsResult.size || req.file.size,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      recordType: recordType || "Other",
      patient: patientId,
      uploadedBy: req.user?._id,
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
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email");

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
      .populate("patient", "name email")
      .populate("uploadedBy", "name email");

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
    const fileBuffer = await getFileFromIPFS(record.ipfsHash);

    // Set headers for download
    res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${record.fileName || 'file'}"`);
    res.setHeader("Content-Length", fileBuffer.length);

    res.send(fileBuffer);
  } catch (error) {
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

    // Generate a symmetric key for this file (stored encrypted with master secret)
    const crypto = require("crypto");
    const symmetricKey = crypto.randomBytes(32).toString("hex"); // 256-bit key
    const iv = encryptionIV || crypto.randomBytes(16).toString("hex");
    
    // Encrypt the symmetric key with master secret (for prototype)
    const masterSecret = process.env.ENCRYPTION_MASTER_SECRET || "medivault-master-secret-2024";
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
      mimeType: "application/octet-stream", // Encrypted files are binary
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

module.exports = {
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
};