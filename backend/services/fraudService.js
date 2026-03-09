const AuditLog = require("../models/AuditLog");

// Simple Fraud Detection
const detectFraud = async (userId, action) => {
  try {
    // Count actions in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentActions = await AuditLog.countDocuments({
      user: userId,
      createdAt: { $gte: fiveMinutesAgo },
    });

    // If too many actions → suspicious
    if (recentActions > 20) {
      return {
        fraudDetected: true,
        message: "Suspicious activity detected",
      };
    }

    return {
      fraudDetected: false,
    };
  } catch (error) {
    throw new Error("Fraud detection error: " + error.message);
  }
};

module.exports = {
  detectFraud,
};