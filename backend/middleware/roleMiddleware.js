// middleware/roleMiddleware.js

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies user role from JWT token before allowing access
 */

// Allowed roles in the system
const VALID_ROLES = ["patient", "doctor", "admin", "lab", "insurance"];

/**
 * Authorize multiple roles (legacy support)
 * @param {...string} roles - Allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized: No user found" 
      });
    }

    // Check if user's role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: "Forbidden: Access denied for your role" 
      });
    }

    next();
  };
};

/**
 * Check if user has specific role(s)
 * Usage: checkRole(['Doctor']) or checkRole(['Doctor', 'Admin'])
 * @param {string[]} allowedRoles - Array of allowed role names (case-insensitive)
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user exists (should be set by auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Authentication required",
      });
    }

    // Normalize roles to lowercase for comparison
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
    const userRole = req.user.role?.toLowerCase();

    // Validate user has a role
    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User role not defined",
      });
    }

    // Check if user's role is in allowed list
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires one of these roles: ${allowedRoles.join(", ")}`,
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is a Doctor
 * Shorthand for checkRole(['Doctor'])
 */
const isDoctor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  if (req.user.role?.toLowerCase() !== "doctor") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only doctors can access this resource",
    });
  }

  next();
};

/**
 * Middleware to check if user is a Patient
 * Shorthand for checkRole(['Patient'])
 */
const isPatient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  if (req.user.role?.toLowerCase() !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only patients can access this resource",
    });
  }

  next();
};

/**
 * Middleware to check if user is Admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
  }

  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admin access required",
    });
  }

  next();
};

/**
 * Middleware to deny specific roles
 * Usage: denyRoles(['Patient']) - blocks patients but allows others
 * @param {string[]} deniedRoles - Array of denied role names
 */
const denyRoles = (deniedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Authentication required",
      });
    }

    const normalizedDeniedRoles = deniedRoles.map((r) => r.toLowerCase());
    const userRole = req.user.role?.toLowerCase();

    if (normalizedDeniedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' cannot access this resource`,
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
  checkRole,
  isDoctor,
  isPatient,
  isAdmin,
  denyRoles,
  VALID_ROLES,
};