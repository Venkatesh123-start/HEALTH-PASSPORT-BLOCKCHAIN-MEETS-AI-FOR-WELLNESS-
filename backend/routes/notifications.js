const express = require("express");
const router = express.Router();

const {
  getUserNotifications,
  createNotification,
  getPatientNotifications,
  markAsRead,
  deleteNotification,
} = require("../controllers/notificationsController");

const { protect } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");

// Get all notifications for a patient
router.get(
  "/patient/:patientId",
  protect,
  checkRole(["patient", "doctor", "lab", "insurance", "admin"]),
  getPatientNotifications
);

// Get all notifications for any user (by ID)
router.get(
  "/:userId",
  protect,
  checkRole(["patient", "doctor", "lab", "insurance", "admin"]),
  getUserNotifications
);

// Create a new notification for a user
router.post(
  "/:userId",
  protect,
  checkRole(["admin", "doctor", "lab", "insurance", "patient"]),
  createNotification
);

// Mark a notification as read
router.patch(
  "/:notificationId/read",
  protect,
  checkRole(["patient", "doctor", "lab", "insurance", "admin"]),
  markAsRead
);

// Delete a notification
router.delete(
  "/:notificationId",
  protect,
  checkRole(["patient", "doctor", "lab", "insurance", "admin"]),
  deleteNotification
);

module.exports = router;
