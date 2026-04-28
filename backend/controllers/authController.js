const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const LabUser = require("../models/LabUser");
const InsuranceUser = require("../models/InsuranceUser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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

    // Compare password and handle plain-text passwords for migration
    let isMatch = false;
    let passwordNeedsUpdating = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      // Password is most likely hashed
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Password is most likely plain text, compare directly
      isMatch = (user.password === password);
      if (isMatch) {
        passwordNeedsUpdating = true;
      }
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // If the user logged in with a plain-text password, update it to a hash
    if (passwordNeedsUpdating) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
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

const updatePassword = async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    const userId = req.user.id;

    if (!password || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await Patient.findById(userId) || await Doctor.findById(userId) || await LabUser.findById(userId) || await InsuranceUser.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the current password is correct
    let isMatch = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      // Stored password is a hash
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Stored password is plain text
      isMatch = (user.password === password);
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { login, updatePassword };