const AIPrediction = require("../models/AIPrediction");
const Patient = require("../models/Patient");
const { mlClient } = require("../config/mlService");

// List of available symptoms for the prediction form
const AVAILABLE_SYMPTOMS = [
  "fever",
  "cough",
  "fatigue",
  "headache",
  "shortness_of_breath",
  "chest_pain",
  "nausea",
  "dizziness",
  "muscle_pain",
  "sore_throat",
];

// Recommendations database based on conditions
const CONDITION_RECOMMENDATIONS = {
  Influenza: [
    "Rest and stay hydrated with plenty of fluids",
    "Take over-the-counter fever reducers like acetaminophen",
    "Avoid contact with others to prevent spreading",
    "Consult a doctor if symptoms worsen or persist beyond 7 days",
  ],
  "Common Cold": [
    "Get plenty of rest and sleep",
    "Stay hydrated with water, juice, and warm broths",
    "Use saline nasal drops for congestion",
    "Consider honey for cough relief (adults only)",
  ],
  "COVID-19": [
    "Isolate immediately and get tested",
    "Monitor oxygen levels if possible",
    "Stay hydrated and rest",
    "Seek emergency care if breathing becomes difficult",
  ],
  Pneumonia: [
    "Seek immediate medical attention",
    "Complete any prescribed antibiotic course",
    "Rest and avoid strenuous activities",
    "Monitor breathing and fever closely",
  ],
  Bronchitis: [
    "Avoid smoke and air irritants",
    "Use a humidifier to ease breathing",
    "Stay hydrated to thin mucus",
    "Rest your voice and body",
  ],
  "Asthma Exacerbation": [
    "Use your rescue inhaler as prescribed",
    "Remove yourself from triggers",
    "Sit upright to ease breathing",
    "Seek emergency care if no improvement in 15 minutes",
  ],
  Migraine: [
    "Rest in a dark, quiet room",
    "Apply cold or warm compresses",
    "Stay hydrated and avoid triggers",
    "Take prescribed migraine medication at onset",
  ],
  Hypertension: [
    "Reduce sodium intake immediately",
    "Practice stress-reduction techniques",
    "Take blood pressure medication as prescribed",
    "Schedule a follow-up with your doctor",
  ],
  Anemia: [
    "Increase iron-rich foods in your diet",
    "Consider iron supplements after consulting a doctor",
    "Get adequate rest",
    "Have blood work done to confirm diagnosis",
  ],
  default: [
    "Schedule an appointment with your healthcare provider",
    "Keep track of your symptoms and their duration",
    "Maintain adequate hydration and rest",
    "Avoid self-medication without professional advice",
  ],
};

/**
 * Calculate wellness score based on symptoms and vitals
 * Higher score = healthier, Lower score = more concerning
 */
const calculateWellnessScore = (symptoms, vitals, topConfidence) => {
  let score = 100;

  // Deduct for each symptom present (up to 40 points total)
  const symptomPenalty = Math.min(symptoms.length * 4, 40);
  score -= symptomPenalty;

  // Vital sign penalties
  if (vitals.temperature) {
    if (vitals.temperature >= 102) score -= 15;
    else if (vitals.temperature >= 100.4) score -= 8;
    else if (vitals.temperature < 97) score -= 5;
  }

  if (vitals.heartRate) {
    if (vitals.heartRate > 120 || vitals.heartRate < 50) score -= 12;
    else if (vitals.heartRate > 100 || vitals.heartRate < 60) score -= 6;
  }

  if (vitals.oxygenSaturation) {
    if (vitals.oxygenSaturation < 90) score -= 20;
    else if (vitals.oxygenSaturation < 95) score -= 10;
  }

  if (vitals.systolicBP && vitals.diastolicBP) {
    if (vitals.systolicBP > 180 || vitals.diastolicBP > 120) score -= 15;
    else if (vitals.systolicBP > 140 || vitals.diastolicBP > 90) score -= 8;
    else if (vitals.systolicBP < 90 || vitals.diastolicBP < 60) score -= 10;
  }

  if (vitals.bloodGlucose) {
    if (vitals.bloodGlucose > 300 || vitals.bloodGlucose < 70) score -= 15;
    else if (vitals.bloodGlucose > 180) score -= 8;
  }

  // Factor in prediction confidence (higher confidence in disease = lower wellness)
  if (topConfidence > 70) score -= 10;
  else if (topConfidence > 50) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Get recommendations based on predicted conditions
 */
const getRecommendations = (results) => {
  const recommendations = new Set();

  results.forEach((result) => {
    const conditionRecs =
      CONDITION_RECOMMENDATIONS[result.disease] ||
      CONDITION_RECOMMENDATIONS.default;
    conditionRecs.slice(0, 2).forEach((rec) => recommendations.add(rec));
  });

  // Always add general recommendations
  recommendations.add(
    "Monitor your symptoms and seek medical attention if they worsen"
  );

  return Array.from(recommendations).slice(0, 5);
};

/**
 * @desc    Get disease prediction from ML service
 * @route   POST /api/predict
 * @access  Private
 */
const predictDisease = async (req, res) => {
  try {
    const { patientId, symptoms, vitals } = req.body;

    // Validate required fields
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one symptom is required",
      });
    }

    if (!vitals) {
      return res.status(400).json({
        success: false,
        message: "Vital signs are required",
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Prepare features for ML service
    // Convert symptoms to binary array (1 if present, 0 if not)
    const symptomFeatures = AVAILABLE_SYMPTOMS.map((s) =>
      symptoms.includes(s) ? 1 : 0
    );

    // Normalize vitals for ML model
    const vitalFeatures = [
      vitals.temperature || 98.6,
      vitals.heartRate || 72,
      vitals.systolicBP || 120,
      vitals.diastolicBP || 80,
      vitals.respiratoryRate || 16,
      vitals.oxygenSaturation || 98,
      vitals.weight || 70,
      vitals.height || 170,
      vitals.bloodGlucose || 100,
    ];

    // Combine all features
    const features = [...symptomFeatures, ...vitalFeatures];

    let mlResponse;
    let results = [];

    try {
      // Call ML service
      const response = await mlClient.post("/predict", { features });
      mlResponse = response.data;

      // Parse ML response - expecting top 3 diseases with percentages
      if (mlResponse.predictions && Array.isArray(mlResponse.predictions)) {
        results = mlResponse.predictions.slice(0, 3).map((p) => ({
          disease: p.disease,
          confidence: Math.round(p.confidence * 100) / 100,
        }));
      } else if (mlResponse.prediction) {
        // Fallback for single prediction response
        results = [
          {
            disease: mlResponse.prediction,
            confidence: Math.round((mlResponse.risk_score || 0.5) * 100),
          },
        ];
      }
    } catch (mlError) {
      console.error("ML Service error:", mlError.message);
      
      // Generate mock predictions if ML service is unavailable
      results = generateMockPredictions(symptoms, vitals);
      mlResponse = { mock: true, error: mlError.message };
    }

    // Ensure we have at least 3 results
    while (results.length < 3) {
      results.push({
        disease: "No additional prediction",
        confidence: 0,
      });
    }

    // Get top prediction
    const topPrediction = results[0]?.disease || "Unknown";
    const overallConfidence = results[0]?.confidence || 0;

    // Calculate wellness score
    const wellnessScore = calculateWellnessScore(symptoms, vitals, overallConfidence);

    // Get recommendations
    const recommendations = getRecommendations(results);

    // Save prediction to database
    const prediction = new AIPrediction({
      patient: patientId,
      requestedBy: req.user._id,
      requestedByRole: "doctor",
      symptoms,
      vitals,
      results,
      topPrediction,
      overallConfidence,
      wellnessScore,
      recommendations,
      initiatedBy: "doctor",
      status: "completed",
      mlServiceResponse: mlResponse,
    });

    await prediction.save();

    res.status(200).json({
      success: true,
      data: {
        id: prediction._id,
        patient: {
          id: patient._id,
          name: patient.name,
        },
        symptoms,
        vitals,
        results,
        topPrediction,
        overallConfidence,
        wellnessScore,
        recommendations,
        createdAt: prediction.createdAt,
      },
    });
  } catch (error) {
    console.error("Predict disease error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get prediction",
      error: error.message,
    });
  }
};

/**
 * @desc    Get prediction history for a patient
 * @route   GET /api/predict/history/:patientId
 * @access  Private
 */
const getPredictionHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const predictions = await AIPrediction.find({ patient: patientId })
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (error) {
    console.error("Get prediction history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get prediction history",
      error: error.message,
    });
  }
};

/**
 * @desc    Get my predictions (for patient)
 * @route   GET /api/predict/my-predictions
 * @access  Private (Patient)
 */
const getMyPredictions = async (req, res) => {
  try {
    // Find patient by user email
    const patient = await Patient.findOne({ email: req.user.email });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const predictions = await AIPrediction.find({ patient: patient._id })
      .populate("requestedBy", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (error) {
    console.error("Get my predictions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get predictions",
      error: error.message,
    });
  }
};

/**
 * @desc    Get available symptoms list
 * @route   GET /api/predict/symptoms
 * @access  Public
 */
const getSymptomsList = async (req, res) => {
  res.status(200).json({
    success: true,
    data: AVAILABLE_SYMPTOMS.map((s) => ({
      id: s,
      label: s
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    })),
  });
};

/**
 * Generate mock predictions when ML service is unavailable
 */
const generateMockPredictions = (symptoms, vitals) => {
  const diseases = {
    fever: ["Influenza", "Common Cold", "COVID-19"],
    cough: ["Bronchitis", "Pneumonia", "Asthma"],
    fatigue: ["Anemia", "Thyroid Disorder", "Chronic Fatigue Syndrome"],
    headache: ["Migraine", "Tension Headache", "Sinusitis"],
    shortness_of_breath: ["Asthma", "COPD", "Heart Failure"],
    chest_pain: ["Angina", "GERD", "Costochondritis"],
    nausea: ["Gastritis", "Food Poisoning", "Vertigo"],
    dizziness: ["Vertigo", "Hypotension", "Anemia"],
    muscle_pain: ["Fibromyalgia", "Viral Infection", "Arthritis"],
    sore_throat: ["Pharyngitis", "Tonsillitis", "Strep Throat"],
  };

  // Collect potential diseases based on symptoms
  const potentialDiseases = {};
  symptoms.forEach((symptom) => {
    const related = diseases[symptom] || [];
    related.forEach((disease, index) => {
      const score = (3 - index) * 10 + Math.random() * 20;
      potentialDiseases[disease] =
        (potentialDiseases[disease] || 0) + score;
    });
  });

  // Add vital-based adjustments
  if (vitals.temperature > 100.4) {
    potentialDiseases["Influenza"] =
      (potentialDiseases["Influenza"] || 0) + 15;
    potentialDiseases["COVID-19"] =
      (potentialDiseases["COVID-19"] || 0) + 10;
  }

  if (vitals.heartRate > 100) {
    potentialDiseases["Anxiety"] =
      (potentialDiseases["Anxiety"] || 0) + 10;
  }

  // Sort and get top 3
  const sorted = Object.entries(potentialDiseases)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Normalize to percentages
  const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0);

  return sorted.map(([disease, score]) => ({
    disease,
    confidence: Math.round((score / totalScore) * 100),
  }));
};

/**
 * @desc    Patient self-prediction (wellness check)
 * @route   POST /api/predict/self
 * @access  Private (Patient)
 */
const patientSelfPredict = async (req, res) => {
  try {
    const { symptoms, vitals } = req.body;

    // Find patient by user email
    const patient = await Patient.findOne({ email: req.user.email });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    // Validate symptoms
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one symptom",
      });
    }

    // Validate vitals
    if (!vitals) {
      return res.status(400).json({
        success: false,
        message: "Vital signs are required",
      });
    }

    // Prepare features for ML service
    const symptomFeatures = AVAILABLE_SYMPTOMS.map((s) =>
      symptoms.includes(s) ? 1 : 0
    );

    const vitalFeatures = [
      vitals.temperature || 98.6,
      vitals.heartRate || 72,
      vitals.systolicBP || 120,
      vitals.diastolicBP || 80,
      vitals.respiratoryRate || 16,
      vitals.oxygenSaturation || 98,
      vitals.weight || 70,
      vitals.height || 170,
      vitals.bloodGlucose || 100,
    ];

    const features = [...symptomFeatures, ...vitalFeatures];

    let mlResponse;
    let results = [];

    try {
      const response = await mlClient.post("/predict", { features });
      mlResponse = response.data;

      if (mlResponse.predictions && Array.isArray(mlResponse.predictions)) {
        results = mlResponse.predictions.slice(0, 3).map((p) => ({
          disease: p.disease,
          confidence: Math.round(p.confidence * 100) / 100,
        }));
      }
    } catch (mlError) {
      console.error("ML Service error:", mlError.message);
      results = generateMockPredictions(symptoms, vitals);
      mlResponse = { mock: true, error: mlError.message };
    }

    // Ensure we have at least 3 results
    while (results.length < 3) {
      results.push({ disease: "No additional prediction", confidence: 0 });
    }

    const topPrediction = results[0]?.disease || "Unknown";
    const overallConfidence = results[0]?.confidence || 0;

    // Calculate wellness score
    const wellnessScore = calculateWellnessScore(symptoms, vitals, overallConfidence);

    // Get recommendations
    const recommendations = getRecommendations(results);

    // Save prediction
    const prediction = new AIPrediction({
      patient: patient._id,
      requestedBy: req.user._id,
      requestedByRole: "patient",
      symptoms,
      vitals,
      results,
      topPrediction,
      overallConfidence,
      wellnessScore,
      recommendations,
      initiatedBy: "patient",
      status: "completed",
      mlServiceResponse: mlResponse,
    });

    await prediction.save();

    res.status(200).json({
      success: true,
      data: {
        id: prediction._id,
        symptoms,
        vitals,
        results,
        topPrediction,
        overallConfidence,
        wellnessScore,
        recommendations,
        createdAt: prediction.createdAt,
      },
    });
  } catch (error) {
    console.error("Patient self-predict error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get prediction",
      error: error.message,
    });
  }
};

module.exports = {
  predictDisease,
  patientSelfPredict,
  getPredictionHistory,
  getMyPredictions,
  getSymptomsList,
  AVAILABLE_SYMPTOMS,
};
