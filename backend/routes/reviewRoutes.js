const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// Add a review for a doctor
router.post("/doctor/:doctorId/review", reviewController.addReview);
// Get all reviews for a doctor
router.get("/doctor/:doctorId/reviews", reviewController.getReviews);

module.exports = router;
