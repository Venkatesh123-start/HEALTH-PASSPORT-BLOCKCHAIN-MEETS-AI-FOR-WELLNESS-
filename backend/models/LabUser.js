const mongoose = require("mongoose");

const labUserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "lab" },
    // Lab-specific fields
    labName: String,
    licenseNumber: String,
    address: String,
    phone: String,
    // Blockchain / RBAC fields
    did: {
      type: String,
      unique: true,
      sparse: true,
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

module.exports = mongoose.model("LabUser", labUserSchema);
