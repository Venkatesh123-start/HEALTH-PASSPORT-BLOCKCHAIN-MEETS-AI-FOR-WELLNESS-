const mongoose = require("mongoose");

const doctorPatientAccessSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "revoked"],
      default: "pending",
    },
    requestedBy: {
      type: String,
      enum: ["patient", "doctor"],
      required: true,
    },
    accessType: {
      type: String,
      enum: ["full", "limited", "emergency"],
      default: "full",
    },
    grantedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique doctor-patient pairs
doctorPatientAccessSchema.index({ doctor: 1, patient: 1 }, { unique: true });

module.exports = mongoose.models.DoctorPatientAccess || mongoose.model("DoctorPatientAccess", doctorPatientAccessSchema);
