const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const DoctorPatientAccess = require("../models/DoctorPatientAccess");
const Visit = require("../models/Visit");
const { uploadToIPFS } = require("../services/ipfsService");
const {
  registerUserOnBlockchain,
  generateDID,
} = require("../services/blockchainService");

/* ==========================================
   🟢 REGISTER DOCTOR (Public)
========================================== */
const addDoctor = async (req, res) => {
  try {
    const { name, email, password, license, speciality, walletAddress } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Upload to IPFS on the backend (avoids CORS issues)
    const ipfsHash = await uploadToIPFS({ name, email, license, speciality });

    const existingDoctor = await Doctor.findOne({ email });

    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Doctor already exists with this email",
      });
    }

    // Create doctor in MongoDB first
    const doctor = await Doctor.create({
      name,
      email,
      password,
      ipfsHash,
      role: "doctor",
      specialty: speciality || null,
      licenseNumber: license || null,
      walletAddress: walletAddress || null,
    });

    // Register on blockchain and generate DID
    let blockchainResult = { success: false };
    try {
      blockchainResult = await registerUserOnBlockchain(
        name,
        "doctor",
        walletAddress
      );

      if (blockchainResult.success) {
        // Update doctor with DID and blockchain info
        doctor.did = blockchainResult.did;
        doctor.blockchainRegistered = true;
        doctor.blockchainTxHash = blockchainResult.txHash;
        await doctor.save();

        console.log(`✅ Doctor ${email} registered with DID: ${blockchainResult.did}`);
      }
    } catch (blockchainError) {
      console.error("⚠️ Blockchain registration failed (non-blocking):", blockchainError.message);
      // Generate DID locally even if blockchain fails
      doctor.did = generateDID(doctor._id.toString(), email);
      await doctor.save();
    }

    res.status(201).json({
      success: true,
      message: "Doctor registered successfully",
      data: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        did: doctor.did,
        blockchainRegistered: doctor.blockchainRegistered,
        txHash: doctor.blockchainTxHash,
      },
    });
  } catch (error) {
    console.error("Doctor Register Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/* ==========================================
   🔒 GET ALL DOCTORS (Admin)
========================================== */
const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().select("-password");

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🟢 GET DOCTORS LIST FOR PATIENTS
========================================== */
const getDoctorsForPatients = async (req, res) => {
  try {
    // Return limited info for patient view
    const doctors = await Doctor.find()
      .select("name specialty rating hospital profileImage _id")
      .sort({ rating: -1 });

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 GET DOCTOR BY ID
========================================== */
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select("-password");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // If user is a patient, check for approved access
    if (req.user && req.user.role === "patient") {
      const DoctorPatientAccess = require("../models/DoctorPatientAccess");
      const access = await DoctorPatientAccess.findOne({
        patient: req.user.id,
        doctor: doctor._id,
        status: "approved",
      });
      if (!access) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have access to this doctor's details.",
        });
      }
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 GET DOCTOR'S PATIENTS
========================================== */
const getDoctorPatients = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Get all approved access relationships for this doctor
    const accessList = await DoctorPatientAccess.find({
      doctor: doctorId,
      status: "approved",
    }).populate("patient", "name email age gender walletAddress createdAt");

    // Get last visit for each patient
    const patients = await Promise.all(
      accessList.map(async (access) => {
        const lastVisit = await Visit.findOne({ 
          patient: access.patient._id,
          doctor: doctorId 
        }).sort({ createdAt: -1 });

        return {
          _id: access.patient._id,
          name: access.patient.name,
          email: access.patient.email,
          age: access.patient.age || "-",
          gender: access.patient.gender || "-",
          walletAddress: access.patient.walletAddress,
          lastVisit: lastVisit?.createdAt || null,
          accessGranted: true,
          accessType: access.accessType,
          grantedAt: access.grantedAt,
        };
      })
    );

    res.json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("Get Doctor Patients Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 GET PENDING ACCESS REQUESTS
========================================== */
const getAccessRequests = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const requests = await DoctorPatientAccess.find({
      doctor: doctorId,
      status: "pending",
    }).populate("patient", "name email age gender");

    res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get Access Requests Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 APPROVE/REJECT ACCESS REQUEST
========================================== */
const handleAccessRequest = async (req, res) => {
  try {
    const { doctorId, patientId } = req.params;
    const { action } = req.body; // "approve" or "reject"

    const access = await DoctorPatientAccess.findOne({
      doctor: doctorId,
      patient: patientId,
    });

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Access request not found",
      });
    }

    if (action === "approve") {
      access.status = "approved";
      access.grantedAt = new Date();
    } else if (action === "reject") {
      access.status = "rejected";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'approve' or 'reject'",
      });
    }

    await access.save();

    res.json({
      success: true,
      message: `Access request ${action}d successfully`,
      data: access,
    });
  } catch (error) {
    console.error("Handle Access Request Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🔒 REVOKE PATIENT ACCESS
========================================== */
const revokeAccess = async (req, res) => {
  try {
    const { doctorId, patientId } = req.params;

    const access = await DoctorPatientAccess.findOneAndUpdate(
      { doctor: doctorId, patient: patientId },
      { status: "revoked" },
      { new: true }
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Access relationship not found",
      });
    }

    res.json({
      success: true,
      message: "Access revoked successfully",
    });
  } catch (error) {
    console.error("Revoke Access Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🟢 REQUEST ACCESS TO DOCTOR (Patient initiated)
========================================== */
const requestDoctorAccess = async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;

    // Check if relationship already exists
    const existing = await DoctorPatientAccess.findOne({
      doctor: doctorId,
      patient: patientId,
    });

    if (existing) {
      if (existing.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Access already granted",
        });
      }
      if (existing.status === "pending") {
        return res.status(400).json({
          success: false,
          message: "Access request already pending",
        });
      }
      // If rejected or revoked, allow re-request
      existing.status = "pending";
      existing.requestedBy = "patient";
      await existing.save();

      return res.json({
        success: true,
        message: "Access request resubmitted",
        data: existing,
      });
    }

    // Create new access request
    const access = await DoctorPatientAccess.create({
      doctor: doctorId,
      patient: patientId,
      status: "pending",
      requestedBy: "patient",
    });

    res.status(201).json({
      success: true,
      message: "Access request sent successfully",
      data: access,
    });
  } catch (error) {
    console.error("Request Doctor Access Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🟡 UPDATE DOCTOR PROFILE
========================================== */
const updateDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { name, email, specialty, phone, availability } = req.body;

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Check if email is being changed and if it's unique
    if (email && email !== doctor.email) {
      const existingDoctor = await Doctor.findOne({ email });
      if (existingDoctor) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    // Update allowed fields
    if (name) doctor.name = name;
    if (email) doctor.email = email;
    if (specialty) doctor.specialty = specialty;
    if (phone) doctor.phone = phone;
    if (availability) doctor.availability = availability;

    await doctor.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        phone: doctor.phone,
        availability: doctor.availability,
        role: doctor.role,
      },
    });
  } catch (error) {
    console.error("Update Doctor Profile Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ==========================================
   🟡 UPDATE DOCTOR PASSWORD
========================================== */
const updateDoctorPassword = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { current, new: newPassword, confirm } = req.body;

    // Validate input
    if (!current || !newPassword || !confirm) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password, and confirmation are required",
      });
    }

    if (newPassword !== confirm) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Verify current password (stored as plain text)
    if (doctor.password !== current) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    doctor.password = newPassword;
    await doctor.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update Doctor Password Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  addDoctor,
  getDoctors,
  getDoctorById,
  getDoctorsForPatients,
  getDoctorPatients,
  getAccessRequests,
  handleAccessRequest,
  revokeAccess,
  requestDoctorAccess,
  updateDoctorProfile,
  updateDoctorPassword,
};