const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Name is required"],
    trim: true,
  },
  email: { 
    type: String, 
    required: [true, "Email is required"], 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
  },
  password: { 
    type: String, 
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, // Don't return password by default
  },
  role: { 
    type: String, 
    enum: ["patient", "doctor", "admin", "lab", "insurance"], 
    default: "patient",
    required: true,
  },
  // Doctor-specific fields
  specialty: { 
    type: String,
    required: function() { return this.role === "doctor"; },
    trim: true,
  },
  licenseNumber: {
    type: String,
    required: function() { return this.role === "doctor"; },
    trim: true,
  },
  // IPFS hash for additional data
  ipfsHash: {
    type: String,
    trim: true,
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  // Blockchain wallet address (optional)
  walletAddress: {
    type: String,
    trim: true,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index for faster queries (email already indexed via unique: true)
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for checking if user is a doctor
userSchema.virtual("isDoctor").get(function() {
  return this.role === "doctor";
});

// Virtual for checking if user is a patient
userSchema.virtual("isPatient").get(function() {
  return this.role === "patient";
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);