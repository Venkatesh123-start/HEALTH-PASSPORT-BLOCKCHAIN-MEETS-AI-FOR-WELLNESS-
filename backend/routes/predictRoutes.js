const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { isDoctor, isPatient } = require("../middleware/roleMiddleware");
const {
  predictDisease,
  patientSelfPredict,
  getPredictionHistory,
  getMyPredictions,
  getSymptomsList,
} = require("../controllers/predictController");

/**
 * @route   GET /api/predict/symptoms
 * @desc    Get list of available symptoms
 * @access  Public
 */
router.get("/symptoms", getSymptomsList);

/**
 * @route   POST /api/predict
 * @desc    Get disease prediction based on symptoms and vitals (Doctor)
 * @access  Private (Doctor)
 */
router.post("/", protect, isDoctor, predictDisease);

/**
 * @route   POST /api/predict/self
 * @desc    Patient self-prediction (wellness check)
 * @access  Private (Patient)
 */
router.post("/self", protect, isPatient, patientSelfPredict);

/**
 * @route   GET /api/predict/history/:patientId
 * @desc    Get prediction history for a patient
 * @access  Private (Doctor)
 */
router.get("/history/:patientId", protect, isDoctor, getPredictionHistory);

/**
 * @route   GET /api/predict/my-predictions
 * @desc    Get my predictions (for patient)
 * @access  Private
 */
router.get("/my-predictions", protect, getMyPredictions);

module.exports = router;
