const Lab = require("../models/Lab");
const LabUser = require("../models/LabUser");
const LabReport = require("../models/LabReport");
const Patient = require("../models/Patient");
const { generateDID } = require("../services/blockchainService");
const path = require("path");
const fs = require("fs");

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
    console.log("\n========== LAB REPORT UPLOAD ==========");
    console.log("[Upload] Request body keys:", Object.keys(req.body));
    console.log("[Upload] Request body:", req.body);
    console.log("[Upload] File received:", req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log("[Upload] File details:", {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path
      });
    }
    console.log("[Upload] User:", req.user._id, req.user.role, req.user.labName);
    
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
        console.log("[Upload] Found patient:", patient._id, patient.name);
      } else {
        console.log("[Upload] Patient not found for ID:", patientId);
      }
    }

    const reportData = {
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
    };

    // Add file info if uploaded
    if (req.file) {
      reportData.reportFile = {
        filename: req.file.filename,
        path: req.file.path,
      };
      console.log("[Upload] Added file to report data:", reportData.reportFile);
    } else {
      console.log("[Upload] No file attached to this report");
    }

    const labReport = await LabReport.create(reportData);
    console.log("[Upload] Lab report created successfully:");
    console.log("[Upload] Report ID:", labReport._id);
    console.log("[Upload] Report has file:", !!labReport.reportFile);
    if (labReport.reportFile) {
      console.log("[Upload] File in DB:", labReport.reportFile);
    }
    console.log("========================================\n");

    res.status(201).json({
      success: true,
      message: "Lab report added successfully",
      labReport,
    });
  } catch (error) {
    console.error("[Upload] ERROR:", error);
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
    console.log("\n========== FETCH PATIENT LAB REPORTS ==========");
    console.log("[GetPatientReports] Patient ID:", patientId);
    console.log("[GetPatientReports] User:", req.user._id, req.user.role);

    // Verify requesting user is patient or a doctor/admin
    if (req.user.role === "patient" && req.user._id.toString() !== patientId) {
      console.log("[GetPatientReports] ACCESS DENIED - User not authorized");
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const reports = await LabReport.find({ patient: patientId })
      .populate("uploadedBy", "name labName")
      .populate("doctor", "name specialty")
      .sort({ createdAt: -1 });

    console.log("[GetPatientReports] Found", reports.length, "reports");
    reports.forEach((r, i) => {
      console.log(`[GetPatientReports] Report ${i + 1}:`, {
        id: r._id,
        testName: r.testName,
        hasFile: !!r.reportFile,
        reportFile: r.reportFile
      });
    });
    console.log("=============================================\n");

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error("[GetPatientReports] ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Download Lab Report
exports.downloadLabReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log("\n========== DOWNLOAD LAB REPORT ==========");
    console.log("[Download] Report ID:", reportId);
    console.log("[Download] User:", req.user._id, req.user.role);

    const report = await LabReport.findById(reportId);

    if (!report) {
      console.log("[Download] Report NOT FOUND");
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    console.log("[Download] Report found:", report._id, report.testName);
    console.log("[Download] Report file:", report.reportFile);

    if (!report.reportFile || !report.reportFile.path) {
      console.log("[Download] NO FILE ATTACHED to this report");
      return res.status(404).json({ 
        success: false, 
        message: "No file attached to this report. Only text data is available.",
        hasFile: false 
      });
    }

    // Permission check: only patient, doctor, or uploader (lab) can download
    const reportPatientId = report.patient ? report.patient.toString() : null;
    const userId = req.user._id.toString();
    
    const isPatient = req.user.role === "patient" && reportPatientId === userId;
    const isUploader = report.uploadedBy && report.uploadedBy.toString() === userId;
    const isDoctorOrAdmin = ["doctor", "admin"].includes(req.user.role);

    console.log("[Download] Permission check:", { isPatient, isUploader, isDoctorOrAdmin, reportPatientId, userId });

    if (!isPatient && !isUploader && !isDoctorOrAdmin) {
      console.log("[Download] PERMISSION DENIED");
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    const filePath = path.resolve(report.reportFile.path);
    console.log("[Download] Resolved file path:", filePath);

    if (!fs.existsSync(filePath)) {
      console.log("[Download] FILE NOT FOUND on disk:", filePath);
      return res.status(404).json({ success: false, message: "Physical file not found on server" });
    }

    console.log("[Download] SENDING FILE:", report.reportFile.filename);
    console.log("==========================================\n");
    res.download(filePath, report.reportFile.filename);
  } catch (error) {
    console.error("[Download] ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
