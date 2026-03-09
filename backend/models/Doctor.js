const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    ipfsHash: String,
    role: { type: String, default: "doctor" },
    // Doctor-specific RBAC fields
    specialty: String,
    licenseNumber: String,
    // Blockchain / RBAC fields
    did: {
      type: String,
      unique: true,
      sparse: true, // Allow null values
    },
    walletAddress: {
      type: String,
      sparse: true,
    },
    blockchainRegistered: {
      type: Boolean,
      default: false,
    },
    blockchainTxHash: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);