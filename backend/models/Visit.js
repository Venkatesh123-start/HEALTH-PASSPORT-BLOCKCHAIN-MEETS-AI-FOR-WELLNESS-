const mongoose = require("mongoose");

// Nested Prescription Schema
const prescriptionSchema = new mongoose.Schema({
  medication: {
    type: String,
    required: [true, "Medication name is required"],
    trim: true,
  },
  dosage: {
    type: String,
    required: [true, "Dosage is required"],
    trim: true,
  },
  frequency: {
    type: String,
    required: [true, "Frequency is required"],
    trim: true,
    // e.g., "twice daily", "every 8 hours", "as needed"
  },
  duration: {
    type: String,
    required: [true, "Duration is required"],
    trim: true,
    // e.g., "7 days", "2 weeks", "ongoing"
  },
  instructions: {
    type: String,
    trim: true,
    // e.g., "Take with food", "Avoid alcohol"
  },
});

// Vitals Sub-Schema
const vitalsSchema = new mongoose.Schema({
  temperature: {
    value: { type: Number },
    unit: { type: String, default: "°F" },
  },
  heartRate: {
    value: { type: Number },
    unit: { type: String, default: "bpm" },
  },
  bloodPressure: {
    systolic: { type: Number },
    diastolic: { type: Number },
    unit: { type: String, default: "mmHg" },
  },
  respiratoryRate: {
    value: { type: Number },
    unit: { type: String, default: "breaths/min" },
  },
  oxygenSaturation: {
    value: { type: Number },
    unit: { type: String, default: "%" },
  },
  weight: {
    value: { type: Number },
    unit: { type: String, default: "kg" },
  },
  height: {
    value: { type: Number },
    unit: { type: String, default: "cm" },
  },
});

// Main Visit Schema
const visitSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient reference is required"],
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor reference is required"],
      index: true,
    },
    visitDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    visitType: {
      type: String,
      enum: ["routine", "follow-up", "emergency", "consultation", "procedure"],
      default: "routine",
    },
    chiefComplaint: {
      type: String,
      required: [true, "Chief complaint is required"],
      trim: true,
    },
    vitals: vitalsSchema,
    symptoms: [{
      type: String,
      trim: true,
    }],
    diagnosis: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    prescriptions: [prescriptionSchema],
    followUpDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "completed",
    },
    attachments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
    }],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
visitSchema.index({ patient: 1, visitDate: -1 });
visitSchema.index({ doctor: 1, visitDate: -1 });

// Virtual for formatted visit date
visitSchema.virtual("formattedDate").get(function () {
  return this.visitDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Ensure virtuals are included in JSON
visitSchema.set("toJSON", { virtuals: true });
visitSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Visit", visitSchema);
