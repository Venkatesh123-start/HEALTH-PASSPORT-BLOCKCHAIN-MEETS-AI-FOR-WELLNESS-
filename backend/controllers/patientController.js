// Get all pending doctor access requests for this patient
const getPendingDoctorRequests = async (req, res) => {
  console.log("[getPendingDoctorRequests] HIT /api/patients/access/requests/pending");
  try {
    const patientId = req.user.id;
    const DoctorPatientAccess = require("../models/DoctorPatientAccess");
    const Doctor = require("../models/Doctor");
    const requests = await DoctorPatientAccess.find({
      patient: patientId,
      status: "pending",
      requestedBy: "doctor",
    }).populate("doctor", "_id name email specialty");
    console.log("[getPendingDoctorRequests] Found requests:", requests.length);
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("[getPendingDoctorRequests] Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Approve or reject a doctor's access request (by patient)
const handleDoctorAccessRequest = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctorId } = req.params;
    const { action } = req.body; // "approve" or "reject"
    const DoctorPatientAccess = require("../models/DoctorPatientAccess");
    const access = await DoctorPatientAccess.findOne({
      doctor: doctorId,
      patient: patientId,
      status: "pending",
      requestedBy: "doctor",
    });
    if (!access) {
      return res.status(404).json({ success: false, message: "No pending request from this doctor." });
    }
    if (action === "approve") {
      access.status = "approved";
      access.grantedAt = new Date();
    } else if (action === "reject") {
      access.status = "rejected";
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Use 'approve' or 'reject'." });
    }
    await access.save();
    res.json({ success: true, message: `Request ${action}d successfully`, data: access });
  } catch (error) {
    console.error("Handle Doctor Access Request Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Patient revokes a doctor's access
const revokeDoctorAccess = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctorId } = req.params;
    const DoctorPatientAccess = require("../models/DoctorPatientAccess");
    const access = await DoctorPatientAccess.findOneAndUpdate(
      { doctor: doctorId, patient: patientId, status: "approved" },
      { status: "revoked" },
      { new: true }
    );
    if (!access) {
      return res.status(404).json({ success: false, message: "No approved access found for this doctor." });
    }
    res.json({ success: true, message: "Access revoked successfully." });
  } catch (error) {
    console.error("Revoke Doctor Access Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const Patient = require("../models/Patient");
const Record = require("../models/Record");
const Visit = require("../models/Visit");
const Vitals = require("../models/Vitals");
const AIPrediction = require("../models/AIPrediction");
const { uploadToIPFS } = require("../services/ipfsService");
const {
  registerUserOnBlockchain,
  generateDID,
} = require("../services/blockchainService");
const {
  getPatientEventLogs,
  getBlockchainHealth,
} = require("../services/healthRegistryService");
const CryptoJS = require("crypto-js");

// Decryption helper for vitals
const decryptVitals = (encryptedData, iv) => {
  try {
    const key = CryptoJS.enc.Utf8.parse(
      process.env.ENCRYPTION_SECRET.padEnd(32, "0").slice(0, 32)
    );
    const ivParsed = CryptoJS.enc.Hex.parse(iv);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: ivParsed,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
};

/* ==========================================
   🟢 REGISTER PATIENT (Public)
========================================== */
const addPatient = async (req, res) => {
  try {
    const { name, email, password, walletAddress } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Upload to IPFS on the backend (avoids CORS issues)
    const ipfsHash = await uploadToIPFS({ name, email });

    const existingPatient = await Patient.findOne({ email });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: "Patient already exists with this email",
      });
    }

    // Create patient in MongoDB first
    const patient = await Patient.create({
      name,
      email,
      password,
      ipfsHash,
      role: "patient",
      walletAddress: walletAddress || null,
    });

    // Register on blockchain and generate DID
    let blockchainResult = { success: false };
    try {
      blockchainResult = await registerUserOnBlockchain(
        name,
        "patient",
        walletAddress
      );

      if (blockchainResult.success) {
        // Update patient with DID and blockchain info
        patient.did = blockchainResult.did;
        patient.blockchainRegistered = true;
        patient.blockchainTxHash = blockchainResult.txHash;
        await patient.save();

        console.log(`✅ Patient ${email} registered with DID: ${blockchainResult.did}`);
      }
    } catch (blockchainError) {
      console.error("⚠️ Blockchain registration failed (non-blocking):", blockchainError.message);
      // Generate DID locally even if blockchain fails
      patient.did = generateDID(patient._id.toString(), email);
      await patient.save();
    }

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        role: patient.role,
        did: patient.did,
        blockchainRegistered: patient.blockchainRegistered,
        txHash: patient.blockchainTxHash,
      },
    });
  } catch (error) {
    console.error("Patient Register Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/* ==========================================
   🔒 GET ALL PATIENTS (Admin)
========================================== */
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().select("-password");

    res.json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 GET PATIENT BY ID (Admin + Doctor)
========================================== */
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select("-password");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 GET LOGGED-IN PATIENT PROFILE
========================================== */
const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id).select("-password");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Get Patient Profile Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 PATIENT 360 DASHBOARD SUMMARY
   Concurrent fetch of all patient data
========================================== */
const getDashboardSummary = async (req, res) => {
  try {
    // req.user is already the patient from auth middleware
    // Use the patient directly instead of doing another lookup
    const patient = req.user;
    
    if (!patient || !patient._id) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const patientId = patient._id;

    // Helper: wrap promise with timeout (for blockchain calls)
    const withTimeout = (promise, ms, fallback) => {
      const timeout = new Promise((resolve) =>
        setTimeout(() => resolve(fallback), ms)
      );
      return Promise.race([promise, timeout]);
    };

    // Concurrent fetch using Promise.all
    const [
      recentRecords,
      recentVisits,
      recentPredictions,
      latestVitals,
      blockchainEvents,
      blockchainHealth,
    ] = await Promise.all([
      // 1. Latest Medical Records (DiagnosticReport in FHIR)
      Record.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title recordType ipfsHash createdAt blockchainLogged blockchainTxHash")
        .lean(),

      // 2. Recent Clinical Visits (Encounter in FHIR)
      Visit.find({ patient: patientId })
        .sort({ visitDate: -1 })
        .limit(5)
        .populate("doctor", "name specialty")
        .select("visitDate visitType chiefComplaint diagnosis status vitals doctor")
        .lean(),

      // 3. AI Predictions
      AIPrediction.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("topPrediction overallConfidence wellnessScore createdAt initiatedBy")
        .lean(),

      // 4. Latest Vitals (Observation in FHIR)
      Vitals.findOne({ patient: patientId, isActive: true })
        .sort({ recordedAt: -1 })
        .lean(),

      // 5. Blockchain Event Logs (Audit Trail) - with 3s timeout
      withTimeout(
        getPatientEventLogs(patientId.toString(), 10),
        3000,
        []
      ),

      // 6. Blockchain Health - with 3s timeout
      withTimeout(
        getBlockchainHealth(),
        3000,
        { connected: false, error: "Timeout" }
      ),
    ]);

    // Decrypt latest vitals if available
    let latestVitalsData = null;
    if (latestVitals) {
      const decrypted = decryptVitals(
        latestVitals.encryptedData,
        latestVitals.encryptionIV
      );
      latestVitalsData = {
        _id: latestVitals._id,
        recordedAt: latestVitals.recordedAt,
        // FHIR-compliant Observation labels
        observations: {
          temperature: decrypted?.temperature
            ? { value: decrypted.temperature, unit: "°F", fhirType: "body-temperature" }
            : null,
          heartRate: decrypted?.heartRate
            ? { value: decrypted.heartRate, unit: "bpm", fhirType: "heart-rate" }
            : null,
          bloodPressure:
            decrypted?.bloodPressureSystolic && decrypted?.bloodPressureDiastolic
              ? {
                  systolic: decrypted.bloodPressureSystolic,
                  diastolic: decrypted.bloodPressureDiastolic,
                  unit: "mmHg",
                  fhirType: "blood-pressure",
                }
              : null,
          respiratoryRate: decrypted?.respiratoryRate
            ? { value: decrypted.respiratoryRate, unit: "breaths/min", fhirType: "respiratory-rate" }
            : null,
          oxygenSaturation: decrypted?.oxygenLevel
            ? { value: decrypted.oxygenLevel, unit: "%", fhirType: "oxygen-saturation" }
            : null,
        },
      };
    }

    // Build recent activities feed (chronological)
    const activities = [];

    // Add visits to activities
    recentVisits.forEach((visit) => {
      activities.push({
        type: "Encounter", // FHIR resource type
        subType: visit.visitType,
        title: `Visit: ${visit.chiefComplaint}`,
        description: visit.diagnosis || "Consultation completed",
        timestamp: visit.visitDate,
        doctor: visit.doctor?.name,
        status: visit.status,
        icon: "visit",
      });
    });

    // Add records to activities
    recentRecords.forEach((record) => {
      activities.push({
        type: "DiagnosticReport", // FHIR resource type
        subType: record.recordType,
        title: record.title,
        description: `${record.recordType} uploaded`,
        timestamp: record.createdAt,
        blockchainLogged: record.blockchainLogged,
        icon: "record",
      });
    });

    // Add predictions to activities
    recentPredictions.forEach((pred) => {
      activities.push({
        type: "Observation", // FHIR resource type (AI wellness check)
        subType: "AI Prediction",
        title: `AI Prediction: ${pred.topPrediction}`,
        description: `Wellness Score: ${pred.wellnessScore || "N/A"}%`,
        timestamp: pred.createdAt,
        confidence: pred.overallConfidence,
        icon: "ai",
      });
    });

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Build response with FHIR-consistent labels
    res.json({
      success: true,
      data: {
        patient: {
          id: patient._id,
          name: patient.name,
          email: patient.email,
          did: patient.did,
        },

        // Health Overview (FHIR: Observations)
        healthOverview: {
          latestVitals: latestVitalsData,
          lastUpdated: latestVitalsData?.recordedAt || null,
        },

        // Recent Activities Feed
        recentActivities: activities.slice(0, 10),

        // Detailed data for cards
        diagnosticReports: recentRecords.map((r) => ({
          ...r,
          fhirType: "DiagnosticReport",
        })),
        encounters: recentVisits.map((v) => ({
          ...v,
          fhirType: "Encounter",
        })),
        aiPredictions: recentPredictions,

        // Blockchain Audit Trail
        blockchainStatus: {
          connected: blockchainHealth.connected,
          contractAddress: blockchainHealth.contractAddress,
          totalRecords: blockchainHealth.totalRecords,
          recentEvents: blockchainEvents.map((e) => ({
            eventType: e.eventType,
            txHash: e.txHash,
            blockNumber: e.blockNumber,
            timestamp: e.timestamp,
            recordType: e.data?.recordType || "Record",
            ipfsHashPreview: e.data?.ipfsHash
              ? `${e.data.ipfsHash.slice(0, 8)}...${e.data.ipfsHash.slice(-6)}`
              : "N/A",
          })),
        },

        // Summary stats
        stats: {
          totalRecords: await Record.countDocuments({ patient: patientId }),
          totalVisits: await Visit.countDocuments({ patient: patientId }),
          totalPredictions: await AIPrediction.countDocuments({ patient: patientId }),
          latestWellnessScore: recentPredictions[0]?.wellnessScore || null,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
      error: error.message,
    });
  }
};

/* ==========================================
   🔒 GET ACCESS STATUS FOR A DOCTOR
========================================== */
const getAccessStatus = async (req, res) => {
  try {
    const { patientId, doctorId } = req.params;
    const DoctorPatientAccess = require("../models/DoctorPatientAccess");

    const access = await DoctorPatientAccess.findOne({
      patient: patientId,
      doctor: doctorId,
    });

    if (!access) {
      return res.json({
        success: true,
        status: null,
        message: "No access relationship exists",
      });
    }

    res.json({
      success: true,
      status: access.status,
      accessType: access.accessType,
      grantedAt: access.grantedAt,
    });
  } catch (error) {
    console.error("Get Access Status Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// Get all doctors with approved access for a patient
const getApprovedDoctors = async (req, res) => {
  try {
    const { patientId } = req.params;
    const DoctorPatientAccess = require("../models/DoctorPatientAccess");
    const Doctor = require("../models/Doctor");
    // Find all approved access records for this patient
    const accessList = await DoctorPatientAccess.find({
      patient: patientId,
      status: "approved",
    });
    const doctorIds = accessList.map((a) => a.doctor);
    // Fetch doctor details
    const doctors = await Doctor.find({ _id: { $in: doctorIds } }).select("_id name specialty email");
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error("Get Approved Doctors Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  addPatient,
  getPatients,
  getPatientById,
  getPatientProfile,
  getDashboardSummary,
  getAccessStatus,
  getApprovedDoctors,
  getPendingDoctorRequests,
  handleDoctorAccessRequest,
  revokeDoctorAccess,
};