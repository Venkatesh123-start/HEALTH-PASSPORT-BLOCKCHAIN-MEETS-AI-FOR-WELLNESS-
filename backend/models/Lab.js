const mongoose = require("mongoose");

const labSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  testsAvailable: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.models.Lab || mongoose.model("Lab", labSchema);