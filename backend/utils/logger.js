const winston = require("winston");
const path = require("path");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${
      stack || message
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    // Console logs
    new winston.transports.Console(),

    // All logs file
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/combined.log"),
    }),

    // Error logs file
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/error.log"),
      level: "error",
    }),
  ],
});

// Stream for Morgan (if you use HTTP request logging)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;