const mongoose = require("mongoose");

const insuranceSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  policyNumber: { type: String, required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  coverageAmount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.Insurance || mongoose.model("Insurance", insuranceSchema);