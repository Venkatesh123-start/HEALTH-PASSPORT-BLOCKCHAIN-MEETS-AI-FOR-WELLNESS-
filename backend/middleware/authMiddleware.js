// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const LabUser = require("../models/LabUser");
const InsuranceUser = require("../models/InsuranceUser");

const protect = async (req, res, next) => {
  let token;

  // Debug: log headers
  console.log("[protect middleware] req.headers:", req.headers);

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("[protect middleware] Extracted token:", token);

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "medivaultsecret"
      );

      // Lookup user based on role from token
      let user = null;
      const role = decoded.role?.toLowerCase();

      if (role === "patient") {
        user = await Patient.findById(decoded.id).select("-password");
      } else if (role === "doctor") {
        user = await Doctor.findById(decoded.id).select("-password");
      } else if (role === "lab") {
        user = await LabUser.findById(decoded.id).select("-password");
      } else if (role === "insurance") {
        user = await InsuranceUser.findById(decoded.id).select("-password");
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } else {
      console.log("[protect middleware] No Authorization header or not Bearer format");
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

module.exports = { protect };