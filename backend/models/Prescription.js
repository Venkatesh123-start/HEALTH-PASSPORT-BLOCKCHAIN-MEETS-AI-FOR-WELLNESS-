const mongoose = require("mongoose");

/**
 * Prescription Schema
 * Standalone collection for better querying, blockchain audit, and access control
 */
const prescriptionSchema = new mongoose.Schema(
  {
    // Patient reference
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient reference is required"],
      index: true,
    },

    // Visit reference (optional - can be standalone prescription)
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      index: true,
    },

    // Issuing doctor
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor reference is required"],
      index: true,
    },

    // Prescription medications (array for multiple meds)
    medications: [
      {
        medicationName: {
          type: String,
          required: [true, "Medication name is required"],
          trim: true,
        },
        dosage: {
          type: String,
          required: [true, "Dosage is required"],
          trim: true,
          // e.g., "500mg", "10ml"
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
        specialInstructions: {
          type: String,
          trim: true,
          // e.g., "Take with food", "Avoid alcohol"
        },
        route: {
          type: String,
          enum: ["oral", "topical", "injection", "inhalation", "intravenous", "other"],
          default: "oral",
        },
      },
    ],

    // Prescription metadata
    diagnosis: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    // Prescription date
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },

    // Valid until (for expiry tracking)
    validUntil: {
      type: Date,
    },

    // Blockchain audit trail
    blockchainHash: {
      type: String,
      trim: true,
    },
    blockchainTxHash: {
      type: String,
      trim: true,
    },
    blockchainLogged: {
      type: Boolean,
      default: false,
    },
    blockchainLoggedAt: {
      type: Date,
    },

    // Immutability flag - once set, prescription cannot be modified
    isFinalized: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
prescriptionSchema.index({ patient: 1, issuedAt: -1 });
prescriptionSchema.index({ doctor: 1, issuedAt: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ blockchainHash: 1 });

// Virtual for formatted date
prescriptionSchema.virtual("formattedDate").get(function () {
  return this.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Ensure virtuals are included in JSON
prescriptionSchema.set("toJSON", { virtuals: true });
prescriptionSchema.set("toObject", { virtuals: true });

// Pre-save middleware to prevent modification of finalized prescriptions
prescriptionSchema.pre("save", function (next) {
  if (!this.isNew && this.isFinalized && this.isModified()) {
    // Allow only status changes on finalized prescriptions
    const modifiedPaths = this.modifiedPaths();
    const allowedModifications = ["status"];
    const hasDisallowedModifications = modifiedPaths.some(
      (path) => !allowedModifications.includes(path)
    );

    if (hasDisallowedModifications) {
      return next(new Error("Cannot modify finalized prescription"));
    }
  }
  next();
});

module.exports = mongoose.model("Prescription", prescriptionSchema);
