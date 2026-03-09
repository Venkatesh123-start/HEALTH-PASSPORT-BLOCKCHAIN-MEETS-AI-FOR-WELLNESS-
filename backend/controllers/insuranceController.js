const Insurance = require("../models/Insurance");
const InsuranceUser = require("../models/InsuranceUser");
const { generateDID } = require("../services/blockchainService");

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

// Add Insurance
exports.addInsurance = async (req, res) => {
  try {
    const insurance = await Insurance.create(req.body);

    res.status(201).json({
      message: "Insurance added successfully",
      insurance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Insurance by Patient
exports.getInsuranceByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const insurance = await Insurance.find({ patient: patientId });

    res.json(insurance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};