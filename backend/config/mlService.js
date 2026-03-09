// backend/config/mlService.js
const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5002";

/**
 * ML Service Client
 * Provides methods to interact with the Python ML microservice
 */
const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Health check for ML service
 */
const checkMLServiceHealth = async () => {
  try {
    const response = await mlClient.get("/health");
    return { connected: true, status: response.data };
  } catch (error) {
    console.warn("⚠️ ML Service not available:", error.message);
    return { connected: false, error: error.message };
  }
};

/**
 * Get disease prediction from ML service
 * @param {Object} symptoms - Patient symptoms data
 */
const predictDisease = async (symptoms) => {
  try {
    const response = await mlClient.post("/predict", symptoms);
    return response.data;
  } catch (error) {
    throw new Error(`ML Prediction failed: ${error.message}`);
  }
};

/**
 * Get risk score analysis
 * @param {Object} patientData - Patient health data
 */
const getRiskScore = async (patientData) => {
  try {
    const response = await mlClient.post("/risk-score", patientData);
    return response.data;
  } catch (error) {
    throw new Error(`Risk score calculation failed: ${error.message}`);
  }
};

/**
 * Get AI insights for medical records
 * @param {Object} records - Medical records data
 */
const getAIInsights = async (records) => {
  try {
    const response = await mlClient.post("/insights", records);
    return response.data;
  } catch (error) {
    throw new Error(`AI insights failed: ${error.message}`);
  }
};

console.log(`✅ ML Service configured at: ${ML_SERVICE_URL}`);

module.exports = {
  mlClient,
  checkMLServiceHealth,
  predictDisease,
  getRiskScore,
  getAIInsights,
  ML_SERVICE_URL,
};
