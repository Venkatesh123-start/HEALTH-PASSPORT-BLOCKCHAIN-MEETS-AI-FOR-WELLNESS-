const Insurance = require("../models/Insurance");
const InsuranceUser = require("../models/InsuranceUser");
const { generateDID } = require("../services/blockchainService");
const { uploadFileToIPFS } = require("../services/ipfsService");
const Patient = require("../models/Patient");
const Claim = require("../models/Claim");
const mongoose = require("mongoose");

/* ==========================================
   🔐 INSURANCE USER REGISTRATION
========================================== */
exports.registerInsuranceUser = async (req, res) => {
  try {
    const { name, email, password, companyName, licenseNumber, address, phone } = req.body;

    // Check if email already exists
    const existingUser = await InsuranceUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate blockchain DID
    const did = generateDID(email);

    // Create insurance user
    const insuranceUser = await InsuranceUser.create({
      name,
      email,
      password,
      companyName,
      licenseNumber,
      address,
      phone,
      did,
      role: "insurance",
    });

    res.status(201).json({
      success: true,
      message: "Insurance user registered successfully",
      user: {
        _id: insuranceUser._id,
        name: insuranceUser.name,
        email: insuranceUser.email,
        role: insuranceUser.role,
        companyName: insuranceUser.companyName,
        did: insuranceUser.did,
      },
    });
  } catch (error) {
    console.error("Insurance Registration Error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

/* ==========================================
   🟢 INSURANCE FUNCTIONS
========================================== */

// Add Insurance (accepts patient as ObjectId or email)
exports.addInsurance = async (req, res) => {
  try {
    const {
      companyName,
      policyNumber,
      patient,
      coverageAmount,
      policyType,
      startDate,
      endDate,
    } = req.body;

    if (!companyName || !policyNumber) {
      return res.status(400).json({
        success: false,
        message: "companyName and policyNumber are required",
      });
    }

    // Check duplicate policy number
    const existing = await Insurance.findOne({ policyNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Policy number already exists",
      });
    }

    let patientId = patient;
    if (patient && !mongoose.Types.ObjectId.isValid(patient)) {
      const p = await Patient.findOne({ email: patient }).select("_id");
      if (!p) {
        return res.status(404).json({
          success: false,
          message: "Patient not found for provided identifier",
        });
      }
      patientId = p._id;
    }

    const doc = await Insurance.create({
      companyName,
      policyNumber,
      patient: patientId || undefined,
      coverageAmount: typeof coverageAmount !== "undefined" ? Number(coverageAmount) : 0,
      policyType: policyType || "",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "Insurance added successfully",
      data: doc,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate policyNumber",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Insurance by Patient
exports.getInsuranceByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    let pid = patientId;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      const email = String(patientId).trim().toLowerCase();
      const patient = await Patient.findOne({ email }).select("_id");
      if (!patient) {
        return res.status(404).json({ success: false, message: "Patient not found" });
      }
      pid = patient._id;
    }

    const insurance = await Insurance.find({ patient: pid });

    res.json(insurance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ==========================================
   🟢 INSURANCE OVERVIEW (with remaining coverage)
========================================== */
exports.getInsuranceOverview = async (req, res) => {
  try {
    const { patientId } = req.params;

    let pid = patientId;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      const email = String(patientId).trim().toLowerCase();
      const patient = await Patient.findOne({ email }).select("_id");
      if (!patient) {
        return res.status(404).json({ success: false, message: "Patient not found" });
      }
      pid = patient._id;
    }

    const policies = await Insurance.find({ patient: pid }).lean();
    const approvedClaims = await Claim.find({
      patient: pid,
      status: { $in: ["approved", "paid"] },
    }).lean();

    const usedByPatient = approvedClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
    const overview = policies.map((p) => {
      const total = p.coverageAmount || 0;
      // Per-policy used approximation: we allocate total used across policies evenly
      // For simplicity here, compute remaining as total - usedByPatient (bounded)
      const remaining = Math.max(total - usedByPatient, 0);
      return {
        ...p,
        remainingCoverage: remaining,
      };
    });

    res.json({ success: true, data: overview, used: usedByPatient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ==========================================
   🟢 ADD POLICY DOCUMENT (IPFS)
========================================== */
exports.addPolicyDocument = async (req, res) => {
  try {
    const { policyId } = req.params;
    let policy = null;

    if (mongoose.Types.ObjectId.isValid(policyId)) {
      policy = await Insurance.findById(policyId);
    } else {
      policy = await Insurance.findOne({ policyNumber: policyId });
    }

    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { buffer, originalname, mimetype } = req.file;
    const ipfs = await uploadFileToIPFS(buffer, originalname, mimetype);
    policy.documents.push({
      ipfsHash: ipfs.hash,
      fileName: originalname,
      mimeType: mimetype,
    });
    await policy.save();

    res.status(201).json({
      success: true,
      message: "Document added to policy",
      data: { ipfsHash: ipfs.hash, fileName: originalname, mimeType: mimetype },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
