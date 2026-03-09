// controllers/prescriptionController.js
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Visit = require("../models/Visit");
const { logRecordToBlockchain } = require("../services/healthRegistryService");
const crypto = require("crypto");

/**
 * Generate a hash of prescription details for blockchain audit
 * This ensures the prescription cannot be altered after issuance
 */
const generatePrescriptionHash = (prescription) => {
  const dataToHash = {
    patientId: prescription.patient.toString(),
    doctorId: prescription.doctor.toString(),
    medications: prescription.medications.map((med) => ({
      medicationName: med.medicationName,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
    })),
    diagnosis: prescription.diagnosis || "",
    issuedAt: prescription.issuedAt.toISOString(),
  };

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(dataToHash))
    .digest("hex");

  return hash;
};

/**
 * @desc    Create a new prescription
 * @route   POST /api/prescriptions
 * @access  Private (Doctor only)
 */
const createPrescription = async (req, res, next) => {
  try {
    const { patientId, visitId, medications, diagnosis, notes, validUntil } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Get doctor info
    const doctor = await Doctor.findOne({ email: req.user.email });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    // Validate medications array
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one medication is required",
      });
    }

    // Validate each medication
    for (const med of medications) {
      if (!med.medicationName || !med.dosage || !med.frequency || !med.duration) {
        return res.status(400).json({
          success: false,
          message: "Each medication must have name, dosage, frequency, and duration",
        });
      }
    }

    // If visitId provided, verify it belongs to this doctor and patient
    if (visitId) {
      const visit = await Visit.findById(visitId);
      if (!visit) {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
        });
      }
      if (visit.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to add prescription to this visit",
        });
      }
      if (visit.patient.toString() !== patientId) {
        return res.status(400).json({
          success: false,
          message: "Patient does not match the visit",
        });
      }
    }

    // Create prescription
    const prescription = await Prescription.create({
      patient: patientId,
      doctor: doctor._id,
      visit: visitId || null,
      medications,
      diagnosis: diagnosis?.trim() || null,
      notes: notes?.trim() || null,
      validUntil: validUntil ? new Date(validUntil) : null,
      issuedAt: new Date(),
      isFinalized: true,
    });

    // Generate hash for blockchain audit
    const prescriptionHash = generatePrescriptionHash(prescription);
    prescription.blockchainHash = prescriptionHash;

    // Log to blockchain
    const blockchainResult = await logRecordToBlockchain(
      prescriptionHash,
      patientId,
      "Prescription"
    );

    if (blockchainResult.success) {
      prescription.blockchainTxHash = blockchainResult.txHash;
      prescription.blockchainLogged = true;
      prescription.blockchainLoggedAt = new Date();
      console.log(`✅ Prescription logged to blockchain: ${blockchainResult.txHash}`);
    } else {
      console.warn(`⚠️ Blockchain logging failed: ${blockchainResult.error}`);
    }

    await prescription.save();

    // Populate doctor info for response
    await prescription.populate("doctor", "name email specialty");
    await prescription.populate("patient", "name email");

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get prescriptions for a patient
 * @route   GET /api/prescriptions/patient/:patientId
 * @access  Private (Patient owner or Doctor)
 */
const getPatientPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;

    // Authorization check
    if (req.user.role === "patient") {
      // Patients can only view their own prescriptions
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own prescriptions",
        });
      }
    }

    // Build query
    const query = { patient: patientId };
    if (status) {
      query.status = status;
    }

    // Fetch prescriptions
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const prescriptions = await Prescription.find(query)
      .populate("doctor", "name email specialty")
      .populate("visit", "visitDate chiefComplaint")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prescription.countDocuments(query);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my prescriptions (for logged-in patient)
 * @route   GET /api/prescriptions/my-prescriptions
 * @access  Private (Patient only)
 */
const getMyPrescriptions = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    // Get patient ID from user
    const patient = await Patient.findOne({ email: req.user.email });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    // Build query
    const query = { patient: patient._id };
    if (status) {
      query.status = status;
    }

    // Fetch prescriptions
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const prescriptions = await Prescription.find(query)
      .populate("doctor", "name email specialty")
      .populate("visit", "visitDate chiefComplaint")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prescription.countDocuments(query);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single prescription by ID
 * @route   GET /api/prescriptions/:id
 * @access  Private (Patient owner or Doctor)
 */
const getPrescriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id)
      .populate("doctor", "name email specialty")
      .populate("patient", "name email")
      .populate("visit", "visitDate chiefComplaint diagnosis");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Authorization check
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || prescription.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this prescription",
        });
      }
    }

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update prescription status (e.g., mark as completed)
 * @route   PATCH /api/prescriptions/:id/status
 * @access  Private (Doctor or Patient owner)
 */
const updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "completed", "cancelled", "expired"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Authorization: Doctor who issued or patient owner
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ email: req.user.email });
      if (!doctor || prescription.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this prescription",
        });
      }
    } else if (req.user.role === "patient") {
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || prescription.patient.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this prescription",
        });
      }
      // Patients can only mark as completed
      if (status !== "completed") {
        return res.status(403).json({
          success: false,
          message: "Patients can only mark prescriptions as completed",
        });
      }
    }

    prescription.status = status;
    await prescription.save();

    res.json({
      success: true,
      message: "Prescription status updated",
      data: { status: prescription.status },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get prescriptions by doctor
 * @route   GET /api/prescriptions/doctor
 * @access  Private (Doctor only)
 */
const getDoctorPrescriptions = async (req, res, next) => {
  try {
    const { limit = 50, page = 1, patientId } = req.query;

    const doctor = await Doctor.findOne({ email: req.user.email });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const query = { doctor: doctor._id };
    if (patientId) {
      query.patient = patientId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const prescriptions = await Prescription.find(query)
      .populate("patient", "name email")
      .populate("visit", "visitDate")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Prescription.countDocuments(query);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify prescription integrity against blockchain
 * @route   GET /api/prescriptions/:id/verify
 * @access  Private
 */
const verifyPrescription = async (req, res, next) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Regenerate hash from current data
    const currentHash = generatePrescriptionHash(prescription);

    // Compare with stored hash
    const isValid = currentHash === prescription.blockchainHash;

    res.json({
      success: true,
      data: {
        isValid,
        originalHash: prescription.blockchainHash,
        currentHash,
        blockchainTxHash: prescription.blockchainTxHash,
        blockchainLogged: prescription.blockchainLogged,
        message: isValid
          ? "Prescription integrity verified - data has not been tampered with"
          : "WARNING: Prescription data may have been altered",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPrescription,
  getPatientPrescriptions,
  getMyPrescriptions,
  getPrescriptionById,
  updatePrescriptionStatus,
  getDoctorPrescriptions,
  verifyPrescription,
};
