const mongoose = require("mongoose");

/**
 * Vitals Schema
 * Stores patient vital signs with encryption for data protection
 * Fields are encrypted before storage and decrypted on retrieval
 */
const vitalsSchema = new mongoose.Schema(
  {
    // Patient reference
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient reference is required"],
      index: true,
    },

    // Recorded by (can be patient or doctor)
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Role of the person who recorded
    recorderRole: {
      type: String,
      enum: ["patient", "doctor"],
      required: true,
    },

    // Encrypted vital signs data (stored as encrypted JSON string)
    encryptedData: {
      type: String,
      required: true,
    },

    // Encryption IV for AES decryption
    encryptionIV: {
      type: String,
      required: true,
    },

    // Notes (optional, also encrypted)
    encryptedNotes: {
      type: String,
      default: null,
    },

    // Timestamp of when vitals were recorded
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient querying
vitalsSchema.index({ patient: 1, recordedAt: -1 });

module.exports = mongoose.model("Vitals", vitalsSchema);
