const Claim = require("../models/Claim");
const Patient = require("../models/Patient");
const Insurance = require("../models/Insurance");
const Notification = require("../models/Notification");
const multer = require("multer");
const { uploadFileToIPFS } = require("../services/ipfsService");

// Create claim (Insurance only)
const mongoose = require("mongoose");
const createClaim = async (req, res, next) => {
  try {
    const { patientId, insuranceId, amount, type, description, recordIds } = req.body;

    let pid = patientId;
    if (!pid) {
      return res.status(400).json({ success: false, message: "patientId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      const email = String(pid).trim().toLowerCase();
      const p = await Patient.findOne({ email }).select("_id");
      if (!p) {
        return res.status(404).json({ success: false, message: "Patient not found" });
      }
      pid = p._id;
    }

    const patient = await Patient.findById(pid);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    let insurance = null;
    if (insuranceId) {
      if (mongoose.Types.ObjectId.isValid(insuranceId)) {
        insurance = await Insurance.findById(insuranceId);
      } else {
        // Try resolve by policyNumber
        insurance = await Insurance.findOne({ policyNumber: String(insuranceId).trim() });
      }
    }

    const claim = await Claim.create({
      patient: pid,
      submittedBy: req.user._id,
      insurance: insurance?._id || null,
      amount: amt,
      type: type?.trim() || "",
      description: description?.trim() || "",
      records: Array.isArray(recordIds) ? recordIds : [],
    });

    // Notify patient
    try {
      await Notification.create({
        userId: patientId,
        userModel: "Patient",
        title: "New insurance claim submitted",
        message: `A claim of $${Number(amount).toLocaleString()} has been submitted.`,
        type: "insurance",
        metadata: { claimId: claim._id, amount: Number(amount) },
      });
    } catch (_) {}

    res.status(201).json({ success: true, message: "Claim submitted", data: claim });
  } catch (error) {
    next(error);
  }
};

// Get claims for current insurance user
const getMyClaims = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { submittedBy: req.user._id };
    if (status) query.status = status;

    const claims = await Claim.find(query)
      .populate("patient", "name email")
      .populate("insurance", "companyName policyNumber")
      .populate("records", "title recordType createdAt");

    res.json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    next(error);
  }
};

// Update claim status (Insurance only)
const updateClaimStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ["pending", "approved", "rejected"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Use: ${valid.join(", ")}` });
    }

    const claim = await Claim.findOne({ _id: id, submittedBy: req.user._id });
    if (!claim) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    claim.status = status;
    await claim.save();

    // Notify patient
    try {
      await Notification.create({
        userId: claim.patient,
        userModel: "Patient",
        title: "Insurance claim updated",
        message: `Your claim of $${claim.amount.toLocaleString()} is now ${status}.`,
        type: "insurance",
        metadata: { claimId: claim._id, status },
      });
    } catch (_) {}

    res.json({ success: true, message: "Claim status updated", data: { status: claim.status } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createClaim, getMyClaims, updateClaimStatus };

// Create claim (Patient with file uploads)
const createPatientClaim = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const {
      insuranceId,
      amount,
      type,
      description,
      hospitalName,
      doctorName,
      treatmentDate,
      recordIds,
    } = req.body;

    if (!amount || Number.isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    let insurance = null;
    if (insuranceId) {
      insurance = await Insurance.findById(insuranceId);
    }

    const documents = [];
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        const resIPFS = await uploadFileToIPFS(f.buffer, f.originalname, f.mimetype);
        documents.push({
          ipfsHash: resIPFS.hash,
          fileName: f.originalname,
          mimeType: f.mimetype,
        });
      }
    }

    const claim = await Claim.create({
      patient: req.user._id,
      submittedBy: req.user._id,
      submittedByModel: "Patient",
      insurance: insurance?._id || null,
      amount: Number(amount),
      type: type?.trim() || "",
      description: description?.trim() || "",
      hospitalName: hospitalName?.trim() || "",
      doctorName: doctorName?.trim() || "",
      treatmentDate: treatmentDate ? new Date(treatmentDate) : null,
      records: Array.isArray(recordIds) ? recordIds : [],
      documents,
      status: "pending",
    });

    try {
      await Notification.create({
        userId: req.user._id,
        userModel: "Patient",
        title: "Claim submitted",
        message: `Your claim of $${Number(amount).toLocaleString()} has been submitted and is pending review.`,
        type: "insurance",
        metadata: { claimId: claim._id, amount: Number(amount) },
      });
    } catch (_) {}

    res.status(201).json({ success: true, message: "Claim submitted", data: claim });
  } catch (error) {
    next(error);
  }
};

// Get claims for patient
const getClaimsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { role } = req.user;
    if (role?.toLowerCase() === "patient" && String(req.user._id) !== patientId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const { status } = req.query;
    const query = { patient: patientId };
    if (status) query.status = status;
    const claims = await Claim.find(query)
      .sort({ createdAt: -1 })
      .populate("insurance", "companyName policyNumber")
      .populate("patient", "name email");
    res.json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    next(error);
  }
};

module.exports.createPatientClaim = createPatientClaim;
module.exports.getClaimsByPatient = getClaimsByPatient;
