const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
  // Core fields
  title: { 
    type: String, 
    required: [true, "Title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"],
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },
  
  // IPFS storage
  ipfsHash: { 
    type: String, 
    required: [true, "IPFS hash is required"],
    trim: true,
  },
  fileSize: { 
    type: Number,
    required: [true, "File size is required"],
    min: [0, "File size cannot be negative"],
  },
  
  // File metadata
  fileName: {
    type: String,
    trim: true,
  },
  // Original filename (before encryption)
  originalFileName: {
    type: String,
    trim: true,
  },
  // Encrypted filename stored on IPFS
  encryptedFileName: {
    type: String,
    trim: true,
  },
  mimeType: {
    type: String,
    trim: true,
  },
  recordType: {
    type: String,
    enum: ["Prescription", "Lab Report", "Scan", "Diagnosis", "Insurance", "Other"],
    default: "Other",
  },
  
  // Relationships
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Patient", 
    required: [true, "Patient reference is required"],
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId,
    // Can be Doctor or Patient, no specific ref
  },
  uploadedByRole: {
    type: String,
    enum: ["doctor", "patient", "lab"],
    trim: true,
  },
  
  // Blockchain tracking
  blockchainTxHash: {
    type: String,
    trim: true,
  },
  blockchainLogged: {
    type: Boolean,
    default: false,
  },
  
  // Encryption fields
  isEncrypted: {
    type: Boolean,
    default: false,
  },
  // Symmetric key used to encrypt the file (encrypted with master secret or patient's public key)
  secretKey: {
    type: String,
    trim: true,
  },
  // Encryption algorithm used
  encryptionAlgorithm: {
    type: String,
    default: "AES-256",
    trim: true,
  },
  // Initialization vector (for AES encryption)
  encryptionIV: {
    type: String,
    trim: true,
  },
  
  // Access control
  accessList: [{
    userId: mongoose.Schema.Types.ObjectId,
    userRole: {
      type: String,
      enum: ["doctor", "patient", "lab"],
    },
  }],
  
}, { timestamps: true });

// Indexes for efficient queries
recordSchema.index({ patient: 1, createdAt: -1 });
recordSchema.index({ ipfsHash: 1 });
recordSchema.index({ uploadedBy: 1 });

// Virtual for IPFS gateway URL
recordSchema.virtual("ipfsUrl").get(function() {
  return `https://ipfs.io/ipfs/${this.ipfsHash}`;
});

// Virtual for local IPFS URL
recordSchema.virtual("localIpfsUrl").get(function() {
  return `http://127.0.0.1:8080/ipfs/${this.ipfsHash}`;
});

module.exports = mongoose.models.Record || mongoose.model("Record", recordSchema);