const Review = require("../models/Review");
const Doctor = require("../models/Doctor");

// Add a review for a doctor
exports.addReview = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { patientId, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }
    // Prevent duplicate reviews by same patient for same doctor
    const existing = await Review.findOne({ doctor: doctorId, patient: patientId });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already reviewed this doctor." });
    }
    const review = await Review.create({ doctor: doctorId, patient: patientId, rating, comment });
    // Update doctor's average rating
    const agg = await Review.aggregate([
      { $match: { doctor: review.doctor } },
      { $group: { _id: "$doctor", avgRating: { $avg: "$rating" } } }
    ]);
    let updatedDoctor = null;
    if (agg.length > 0) {
      updatedDoctor = await Doctor.findByIdAndUpdate(
        doctorId,
        { rating: agg[0].avgRating },
        { new: true }
      ).select("name specialty rating hospital profileImage _id");
    } else {
      updatedDoctor = await Doctor.findById(doctorId).select("name specialty rating hospital profileImage _id");
    }
    res.status(201).json({ success: true, review, doctor: updatedDoctor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get reviews for a doctor
exports.getReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const reviews = await Review.find({ doctor: doctorId }).populate("patient", "name");
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
