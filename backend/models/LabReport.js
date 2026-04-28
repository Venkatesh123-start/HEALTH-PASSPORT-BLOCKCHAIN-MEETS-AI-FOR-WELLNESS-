const mongoose = require("mongoose");

const labReportSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientAddress: {
      type: String, // Blockchain/wallet address
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabUser",
    },
    labName: {
      type: String,
    },
    testName: {
      type: String,
      required: true,
    },
    testType: {
      type: String,
      enum: ["blood", "urine", "imaging", "biopsy", "genetic", "other"],
      default: "other",
    },
    results: {
      type: String,
    },
    resultData: {
      type: mongoose.Schema.Types.Mixed, // For structured test results
    },
    reportHash: {
      type: String, // IPFS hash
    },
    blockchainTxHash: {
      type: String, // Blockchain transaction hash
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "reviewed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["normal", "urgent", "critical"],
      default: "normal",
    },
    notes: {
      type: String,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    reportFile: {
      filename: String,
      path: String,
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.LabReport || mongoose.model("LabReport", labReportSchema);
