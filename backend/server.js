require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const logger = require("./utils/logger");
const connectDB = require("./config/db");
const { checkMLServiceHealth, ML_SERVICE_URL } = require("./config/mlService");
const { RPC_URL, CONTRACT_ADDRESS } = require("./config/blockchain");
const { auditMiddleware } = require("./middleware/auditMiddleware");

const app = express();

/* =========================
   🔹 CORS Configuration
========================= */

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const corsOptions = {
  origin: [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

/* =========================
   🔹 Middleware Setup
========================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// HTTP request logging
app.use(morgan("combined", { stream: logger.stream }));

// Request timestamp middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Audit log middleware - records all POST requests
app.use(auditMiddleware);

/* =========================
   🔹 Database Connection
========================= */

connectDB()
  .then(() => {
    logger.info("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    logger.error("❌ MongoDB Connection Failed: " + err.message);
    process.exit(1);
  });

/* =========================
   🔹 Routes
========================= */

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));
app.use("/api/insurance", require("./routes/insuranceRoutes"));
app.use("/api/labs", require("./routes/labRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/records", require("./routes/recordRoutes"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/ai", require("./routes/ai"));

app.use("/api/visits", require("./routes/visitRoutes"));
app.use("/api/predict", require("./routes/predictRoutes"));
app.use("/api/vitals", require("./routes/vitalsRoutes"));
app.use("/api/prescriptions", require("./routes/prescriptionRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));

/* =========================
   🔹 Health Check Routes
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 MediVault API Running Successfully",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Comprehensive health check endpoint
app.get("/api/health", async (req, res) => {
  const mlHealth = await checkMLServiceHealth();
  
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: { status: "connected" },
      mongodb: { 
        status: mongoose.connection.readyState === 1 ? "connected" : "disconnected" 
      },
      blockchain: { 
        status: "configured",
        ganacheUrl: RPC_URL,
        contractAddress: CONTRACT_ADDRESS,
      },
      mlService: {
        status: mlHealth.connected ? "connected" : "disconnected",
        url: ML_SERVICE_URL,
        details: mlHealth,
      },
    },
    frontend: {
      allowedOrigin: FRONTEND_URL,
    },
  };

  const httpStatus = health.services.mongodb.status === "connected" ? 200 : 503;
  res.status(httpStatus).json(health);
});

/* =========================
   🔹 404 Handler
========================= */

app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

/* =========================
   🔹 Global Error Handler
========================= */

app.use((err, req, res, next) => {
  // Log error details
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    timestamp: new Date().toISOString(),
  });

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  
  // Handle specific error types
  let message = err.message || "Internal Server Error";
  let errors = null;

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Send error response
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
});

/* =========================
   🔹 Server Start
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});