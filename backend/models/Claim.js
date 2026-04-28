const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    // Allow submittedBy to be either InsuranceUser or Patient
    submittedBy: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    submittedByModel: { type: String, enum: ["InsuranceUser", "Patient"], default: "InsuranceUser" },
    insurance: { type: mongoose.Schema.Types.ObjectId, ref: "Insurance" },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, trim: true },
    description: { type: String, trim: true },
    hospitalName: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    treatmentDate: { type: Date },
    records: [{ type: mongoose.Schema.Types.ObjectId, ref: "Record" }],
    documents: [
      {
        ipfsHash: { type: String, trim: true },
        fileName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "paid", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

claimSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model("Claim", claimSchema);
