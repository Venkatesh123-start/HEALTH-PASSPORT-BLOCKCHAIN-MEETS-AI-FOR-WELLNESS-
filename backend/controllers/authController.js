const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const LabUser = require("../models/LabUser");
const InsuranceUser = require("../models/InsuranceUser");
const jwt = require("jsonwebtoken");

/* ==========================================
   🔐 LOGIN USER (All 4 Roles)
========================================== */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    let user = null;

    // Map role to model lookup order
    const roleModelMap = {
      patient: [Patient, Doctor, LabUser, InsuranceUser],
      doctor: [Doctor, Patient, LabUser, InsuranceUser],
      lab: [LabUser, Patient, Doctor, InsuranceUser],
      insurance: [InsuranceUser, Patient, Doctor, LabUser],
    };

    // Get the model order for the specified role, or default order
    const modelsToCheck = role && roleModelMap[role] 
      ? roleModelMap[role] 
      : [Patient, Doctor, LabUser, InsuranceUser];

    // Check each model in order
    for (const Model of modelsToCheck) {
      user = await Model.findOne({ email });
      if (user) break;
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password (plain text for now)
    if (user.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT Token with role-specific claims
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        did: user.did,
      },
      process.env.JWT_SECRET || "medivaultsecret",
      { expiresIn: "1d" }
    );

    // Build response with full user data for RBAC
    const userData = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      did: user.did,
      walletAddress: user.walletAddress,
      blockchainRegistered: user.blockchainRegistered,
    };

    // Add role-specific fields
    if (user.role === "doctor") {
      userData.specialty = user.specialty;
      userData.licenseNumber = user.licenseNumber;
    } else if (user.role === "lab") {
      userData.labName = user.labName;
      userData.licenseNumber = user.licenseNumber;
    } else if (user.role === "insurance") {
      userData.companyName = user.companyName;
      userData.licenseNumber = user.licenseNumber;
    }

    res.json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = { login };