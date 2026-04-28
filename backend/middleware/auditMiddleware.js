/**
 * Audit Log Middleware
 * Records every POST request to the audit_logs collection
 */

const AuditLog = require("../models/AuditLog");

// Fields to redact from request body for security
const SENSITIVE_FIELDS = ["password", "confirmPassword", "token", "privateKey", "secret"];

/**
 * Redact sensitive fields from an object
 */
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  
  const redacted = { ...obj };
  
  for (const field of SENSITIVE_FIELDS) {
    if (redacted[field]) {
      redacted[field] = "[REDACTED]";
    }
  }
  
  return redacted;
};

/**
 * Extract action name from endpoint
 */
const getActionFromEndpoint = (method, endpoint) => {
  const parts = endpoint.split("/").filter(Boolean);
  
  // Common action mappings
  const actionMappings = {
    "auth/login": "User Login",
    "auth/signup": "User Registration",
    "auth/register": "User Registration",
    "predict": "AI Disease Prediction",
    "records": "Medical Record Operation",
    "appointments": "Appointment Operation",
    "visits": "Patient Visit Operation",
    "patients": "Patient Operation",
    "doctors": "Doctor Operation",
  };
  
  // Check for mapped actions
  for (const [pattern, action] of Object.entries(actionMappings)) {
    if (endpoint.includes(pattern)) {
      return `${method} - ${action}`;
    }
  }
  
  // Default action from endpoint
  const resource = parts[parts.length - 1] || "unknown";
  return `${method} - ${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
};

/**
 * Audit Log Middleware
 * Records POST requests to audit_logs collection
 */
const auditMiddleware = async (req, res, next) => {
  // Only audit POST requests
  if (req.method !== "POST") {
    return next();
  }
  
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end to capture response
  res.end = function (chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Create audit log entry asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const auditEntry = {
          // User info (from auth middleware if available)
          user: req.user?._id || null,
          userEmail: req.user?.email || null,
          userRole: req.user?.role || null,
          
          // Request info
          method: req.method,
          endpoint: req.originalUrl || req.url,
          action: getActionFromEndpoint(req.method, req.originalUrl || req.url),
          
          // Request details (redact sensitive data)
          requestBody: redactSensitiveData(req.body),
          requestParams: req.params,
          requestQuery: req.query,
          
          // Response info
          statusCode: res.statusCode,
          responseTime,
          
          // Client info
          ipAddress: req.ip || req.connection?.remoteAddress || req.headers["x-forwarded-for"],
          userAgent: req.headers["user-agent"],
          
          // Success status
          success: res.statusCode >= 200 && res.statusCode < 400,
        };
        
        await AuditLog.create(auditEntry);
      } catch (error) {
        // Log error but don't crash - auditing should not affect main flow
        console.error("Audit log error:", error.message);
      }
    });
  };
  
  next();
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      endpoint,
      method,
      startDate,
      endDate,
      success,
    } = req.query;
    
    const query = {};
    
    if (userId) query.user = userId;
    if (endpoint) query.endpoint = { $regex: endpoint, $options: "i" };
    if (method) query.method = method;
    if (success !== undefined) query.success = success === "true";
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);
    
    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

module.exports = {
  auditMiddleware,
  getAuditLogs,
};
