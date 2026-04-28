// mlService.js
import axios from "axios";

// ===== CONFIGURATION =====
const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL || `${process.env.REACT_APP_BACKEND_URL || '${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}'}`}/api`; // Backend URL

// ===== ML SERVICE FUNCTIONS =====
export const mlService = {
  /**
   * Predict disease based on patient data
   * @param {Object} patientData - Example: { age, symptoms: ["fever","cough"], gender }
   * @returns {Promise<Object>} - Prediction result from backend
   */
  predictDisease: async (patientData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, patientData);
      return response.data; // { prediction: "Disease Name", confidence: 0.92 }
    } catch (error) {
      console.error("Error predicting disease:", error);
      throw error;
    }
  },

  /**
   * Calculate risk or fraud score
   * @param {Object} transactionData - Example: { patientId, doctorId, recordType }
   * @returns {Promise<Object>} - Risk/fraud score from backend
   */
  calculateRiskScore: async (transactionData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/fraud`, transactionData);
      return response.data; // { riskScore: 0.78, flagged: true/false }
    } catch (error) {
      console.error("Error calculating risk score:", error);
      throw error;
    }
  },

  /**
   * Optional: Fetch historical predictions for a patient
   * @param {string} patientId
   * @returns {Promise<Array>} - List of past predictions
   */
  getPredictionHistory: async (patientId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/predictions/${patientId}`);
      return response.data; // Array of { date, prediction, confidence }
    } catch (error) {
      console.error("Error fetching prediction history:", error);
      throw error;
    }
  },
};

export default mlService;