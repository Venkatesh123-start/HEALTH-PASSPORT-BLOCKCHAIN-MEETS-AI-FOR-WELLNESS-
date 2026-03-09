const express = require("express");
const router = express.Router();

// Import controllers
const {
  getUserNotifications,
  createNotification,
} = require("../controllers/notificationsController");

// Routes
router.get("/:userId", getUserNotifications);       // Get all notifications for a user
router.post("/:userId", createNotification);       // Create a new notification for a user

module.exports = router;