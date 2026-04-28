const mongoose = require("mongoose");

const insuranceSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    policyNumber: { type: String, required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", index: true },
    coverageAmount: { type: Number, default: 0 },
    policyType: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["active", "expired", "suspended"], default: "active", index: true },
    documents: [
      {
        ipfsHash: { type: String, trim: true },
        fileName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

insuranceSchema.index({ patient: 1, policyNumber: 1 });

module.exports = mongoose.models.Insurance || mongoose.model("Insurance", insuranceSchema);
