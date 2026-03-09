const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Patient = require("../models/Patient");
const Vitals = require("../models/Vitals");
const {
  predictDisease,
  getRiskScore,
  getAIInsights,
  checkMLServiceHealth,
} = require("../config/mlService");

/**
 * @route   GET /api/ai/health
 * @desc    Check ML service health
 * @access  Public
 */
router.get("/health", async (req, res, next) => {
  try {
    const health = await checkMLServiceHealth();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/predict
 * @desc    Get disease prediction based on symptoms
 * @access  Private
 */
router.post("/predict", protect, async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Symptoms array is required",
      });
    }

    const prediction = await predictDisease({ symptoms });
    
    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/risk-score
 * @desc    Calculate health risk score
 * @access  Private
 */
router.post("/risk-score", protect, async (req, res, next) => {
  try {
    const patientData = req.body;

    if (!patientData || Object.keys(patientData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Patient data is required",
      });
    }

    const riskScore = await getRiskScore(patientData);
    
    res.json({
      success: true,
      data: riskScore,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/insights
 * @desc    Get AI insights for medical records
 * @access  Private
 */
router.post("/insights", protect, async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!records) {
      return res.status(400).json({
        success: false,
        message: "Medical records are required",
      });
    }

    const insights = await getAIInsights({ records });
    
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ai/risk/:patientId
 * @desc    Get health risk assessment for a patient
 * @access  Private
 */
router.get("/risk/:patientId", protect, async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Fetch patient data
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Fetch latest vitals
    const latestVitals = await Vitals.findOne({ patient: patientId })
      .sort({ createdAt: -1 });

    // Calculate risk based on available data
    let riskScore = 0;
    let riskFactors = [];

    // Age-based risk
    if (patient.age) {
      if (patient.age > 60) {
        riskScore += 20;
        riskFactors.push("Age > 60");
      } else if (patient.age > 45) {
        riskScore += 10;
        riskFactors.push("Age 45-60");
      }
    }

    // Blood pressure risk
    if (latestVitals) {
      if (latestVitals.bloodPressureSystolic > 140 || latestVitals.bloodPressureDiastolic > 90) {
        riskScore += 25;
        riskFactors.push("High blood pressure");
      }

      // Heart rate risk
      if (latestVitals.heartRate > 100) {
        riskScore += 15;
        riskFactors.push("Elevated heart rate");
      } else if (latestVitals.heartRate < 60) {
        riskScore += 10;
        riskFactors.push("Low heart rate");
      }

      // Blood sugar risk
      if (latestVitals.bloodSugar > 126) {
        riskScore += 20;
        riskFactors.push("High blood sugar");
      }

      // SpO2 risk
      if (latestVitals.spO2 && latestVitals.spO2 < 95) {
        riskScore += 15;
        riskFactors.push("Low oxygen saturation");
      }

      // BMI risk (if height and weight available)
      if (latestVitals.weight && patient.height) {
        const heightM = patient.height / 100;
        const bmi = latestVitals.weight / (heightM * heightM);
        if (bmi > 30) {
          riskScore += 15;
          riskFactors.push("Obesity (BMI > 30)");
        } else if (bmi > 25) {
          riskScore += 8;
          riskFactors.push("Overweight (BMI 25-30)");
        }
      }
    }

    // Medical history risk
    if (patient.medicalHistory && patient.medicalHistory.length > 0) {
      const highRiskConditions = ["diabetes", "hypertension", "heart disease", "cancer", "stroke"];
      const conditions = patient.medicalHistory.map(h => h.toLowerCase());
      highRiskConditions.forEach(condition => {
        if (conditions.some(c => c.includes(condition))) {
          riskScore += 15;
          riskFactors.push(`History of ${condition}`);
        }
      });
    }

    // Cap score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine level
    let level;
    if (riskScore >= 60) {
      level = "High";
    } else if (riskScore >= 30) {
      level = "Medium";
    } else {
      level = "Low";
    }

    res.json({
      success: true,
      data: {
        score: riskScore,
        level,
        factors: riskFactors,
        lastUpdated: latestVitals?.createdAt || patient.updatedAt,
        recommendations: getRecommendations(level, riskFactors),
      },
    });
  } catch (error) {
    console.error("Risk calculation error:", error);
    next(error);
  }
});

// Helper function for recommendations
function getRecommendations(level, factors) {
  const recommendations = [];
  
  if (factors.includes("High blood pressure")) {
    recommendations.push("Monitor blood pressure regularly");
    recommendations.push("Reduce sodium intake");
  }
  if (factors.includes("High blood sugar")) {
    recommendations.push("Monitor blood glucose levels");
    recommendations.push("Consider dietary adjustments");
  }
  if (factors.includes("Elevated heart rate")) {
    recommendations.push("Consider stress management techniques");
  }
  if (factors.some(f => f.includes("BMI") || f.includes("weight"))) {
    recommendations.push("Regular exercise recommended");
    recommendations.push("Consider nutritional counseling");
  }
  
  if (level === "High") {
    recommendations.push("Schedule a consultation with your doctor");
  } else if (level === "Medium") {
    recommendations.push("Continue regular health monitoring");
  } else {
    recommendations.push("Maintain healthy lifestyle habits");
  }
  
  return recommendations;
}

module.exports = router;