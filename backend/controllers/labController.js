const Lab = require("../models/Lab");
const LabUser = require("../models/LabUser");
const LabReport = require("../models/LabReport");
const Patient = require("../models/Patient");
const { generateDID } = require("../services/blockchainService");

/* ==========================================
   🔐 LAB USER REGISTRATION
========================================== */
exports.registerLabUser = async (req, res) => {
  try {
    const { name, email, password, labName, licenseNumber, address, phone } = req.body;

    // Check if email already exists
    const existingUser = await LabUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate blockchain DID
    const did = generateDID(email);

    // Create lab user
    const labUser = await LabUser.create({
      name,
      email,
      password,
      labName,
      licenseNumber,
      address,
      phone,
      did,
      role: "lab",
    });

    res.status(201).json({
      success: true,
      message: "Lab user registered successfully",
      user: {
        _id: labUser._id,
        name: labUser.name,
        email: labUser.email,
        role: labUser.role,
        labName: labUser.labName,
        did: labUser.did,
      },
    });
  } catch (error) {
    console.error("Lab Registration Error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

/* ==========================================
   🟢 LAB REPORT FUNCTIONS
========================================== */

// Add Lab Report
exports.addLabReport = async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientAddress,
      testName,
      testType,
      results,
      resultData,
      reportHash,
      blockchainTxHash,
      priority,
      notes,
      doctorId,
    } = req.body;

    // Validate patient exists if patientId provided
    let patient = null;
    let resolvedPatientName = patientName;

    if (patientId) {
      patient = await Patient.findById(patientId);
      if (patient) {
        resolvedPatientName = patient.name;
      }
    }

    const labReport = await LabReport.create({
      patient: patientId || null,
      patientName: resolvedPatientName || "Unknown",
      patientAddress,
      uploadedBy: req.user._id,
      labName: req.user.labName || "Lab",
      testName: testName || "General Test",
      testType: testType || "other",
      results,
      resultData,
      reportHash,
      blockchainTxHash,
      status: "pending",
      priority: priority || "normal",
      notes,
      doctor: doctorId || null,
    });

    res.status(201).json({
      success: true,
      message: "Lab report added successfully",
      labReport,
    });
  } catch (error) {
    console.error("Add Lab Report Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Lab Reports
exports.getLabReports = async (req, res) => {
  try {
    const { status, patientId, limit } = req.query;
    
    let query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by patient if provided
    if (patientId) {
      query.patient = patientId;
    }

    // For lab users, only show their reports
    if (req.user.role === "lab") {
      query.uploadedBy = req.user._id;
    }

    let reportsQuery = LabReport.find(query)
      .populate("patient", "name email")
      .populate("uploadedBy", "name labName")
      .populate("doctor", "name specialty")
      .sort({ createdAt: -1 });

    if (limit) {
      reportsQuery = reportsQuery.limit(parseInt(limit));
    }

    const reports = await reportsQuery;

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error("Get Lab Reports Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Lab Dashboard Stats
exports.getLabDashboardStats = async (req, res) => {
  try {
    const labUserId = req.user._id;

    const totalReports = await LabReport.countDocuments({ uploadedBy: labUserId });
    const pendingReports = await LabReport.countDocuments({ uploadedBy: labUserId, status: "pending" });
    const processingReports = await LabReport.countDocuments({ uploadedBy: labUserId, status: "processing" });
    const completedReports = await LabReport.countDocuments({ uploadedBy: labUserId, status: "completed" });

    const recentReports = await LabReport.find({ uploadedBy: labUserId })
      .populate("patient", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalReports,
          pendingReports,
          processingReports,
          completedReports,
        },
        recentReports,
      },
    });
  } catch (error) {
    console.error("Lab Dashboard Stats Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Lab Report Status
exports.updateLabReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, results, notes } = req.body;

    const report = await LabReport.findByIdAndUpdate(
      reportId,
      { status, results, notes },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    res.json({
      success: true,
      message: "Report updated successfully",
      data: report,
    });
  } catch (error) {
    console.error("Update Lab Report Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get All Patients (for lab to select when uploading)
exports.getPatients = async (req, res) => {
  try {
    const patients = await Patient.find({}, "name email walletAddress _id");
    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error("Get Patients Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Lab Reports for a specific patient (for patient view)
exports.getPatientLabReports = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify the requesting user is the patient or a doctor/admin
    if (req.user.role === "patient" && req.user._id.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const reports = await LabReport.find({ patient: patientId })
      .populate("uploadedBy", "name labName")
      .populate("doctor", "name specialty")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error("Get Patient Lab Reports Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};