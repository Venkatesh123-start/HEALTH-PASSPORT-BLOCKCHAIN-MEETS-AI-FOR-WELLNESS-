const mongoose = require("mongoose");

const diseaseResultSchema = new mongoose.Schema(
  {
    disease: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const vitalInputSchema = new mongoose.Schema(
  {
    temperature: { type: Number }, // °F
    heartRate: { type: Number }, // bpm
    systolicBP: { type: Number }, // mmHg
    diastolicBP: { type: Number }, // mmHg
    respiratoryRate: { type: Number }, // breaths/min
    oxygenSaturation: { type: Number }, // %
    weight: { type: Number }, // kg
    height: { type: Number }, // cm
    bloodGlucose: { type: Number }, // mg/dL
  },
  { _id: false }
);

const aiPredictionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symptoms: [
      {
        type: String,
        required: true,
      },
    ],
    vitals: {
      type: vitalInputSchema,
      required: true,
    },
    results: [diseaseResultSchema],
    topPrediction: {
      type: String,
    },
    overallConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
    mlServiceResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    notes: {
      type: String,
    },
    // Wellness score (0-100) - inverse of risk
    wellnessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    // AI-generated recommendations based on prediction
    recommendations: [
      {
        type: String,
      },
    ],
    // Who initiated: patient self-check or doctor
    initiatedBy: {
      type: String,
      enum: ["patient", "doctor"],
      default: "doctor",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
aiPredictionSchema.index({ patient: 1, createdAt: -1 });
aiPredictionSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model("AIPrediction", aiPredictionSchema);
