const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // User info
    user: { type: mongoose.Schema.Types.ObjectId },
    userEmail: { type: String },
    userRole: { type: String },
    
    // Request info
    method: { type: String, required: true },
    endpoint: { type: String, required: true },
    action: { type: String, required: true },
    
    // Request details
    requestBody: { type: mongoose.Schema.Types.Mixed },
    requestParams: { type: mongoose.Schema.Types.Mixed },
    requestQuery: { type: mongoose.Schema.Types.Mixed },
    
    // Response info
    statusCode: { type: Number },
    responseTime: { type: Number }, // in ms
    
    // Client info
    ipAddress: { type: String },
    userAgent: { type: String },
    
    // Additional details
    details: { type: String },
    success: { type: Boolean, default: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ endpoint: 1, createdAt: -1 });
auditLogSchema.index({ method: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);