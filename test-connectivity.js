/**
 * test-connectivity.js
 * Tests connectivity to all MediVault services:
 * - MongoDB
 * - Ganache (Blockchain)
 * - ML Service
 */

const mongoose = require("mongoose");
const axios = require("axios");
const Web3 = require("web3");

// Configuration
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/medivault";
const GANACHE_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5002";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
};

/**
 * Test MongoDB Connection
 */
async function testMongoDB() {
  log.info(`Testing MongoDB at: ${MONGO_URI}`);
  
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    // Ping the database
    await mongoose.connection.db.admin().ping();
    
    log.success("MongoDB is connected and responding");
    await mongoose.disconnect();
    return true;
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Test Ganache Blockchain Provider
 */
async function testGanache() {
  log.info(`Testing Ganache at: ${GANACHE_URL}`);
  
  try {
    const web3 = new Web3(GANACHE_URL);
    
    // Get block number to verify connection
    const blockNumber = await web3.eth.getBlockNumber();
    
    // Get network ID
    const networkId = await web3.eth.net.getId();
    
    // Get accounts
    const accounts = await web3.eth.getAccounts();
    
    log.success(`Ganache is active - Block: ${blockNumber}, Network ID: ${networkId}, Accounts: ${accounts.length}`);
    return true;
  } catch (error) {
    log.error(`Ganache connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Test ML Service
 */
async function testMLService() {
  log.info(`Testing ML Service at: ${ML_SERVICE_URL}`);
  
  try {
    // First check health endpoint
    const healthResponse = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    
    if (healthResponse.data.status !== "healthy") {
      throw new Error("Health check returned unhealthy status");
    }
    
    // Send dummy prediction request with 10 symptoms + 9 vitals
    const dummyFeatures = [
      // Symptoms (10): fever, cough, fatigue, headache, shortness_of_breath, chest_pain, nausea, dizziness, muscle_pain, sore_throat
      1, 1, 0, 1, 0, 0, 0, 0, 0, 0,
      // Vitals (9): temperature, heartRate, systolicBP, diastolicBP, respiratoryRate, oxygenSaturation, weight, height, bloodGlucose
      100.4, 85, 130, 85, 18, 97, 75, 175, 105,
    ];
    
    const predictionResponse = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { features: dummyFeatures },
      { timeout: 10000 }
    );
    
    const hasValidPredictions = 
      predictionResponse.data.predictions && 
      Array.isArray(predictionResponse.data.predictions) &&
      predictionResponse.data.predictions.length > 0;
    
    if (hasValidPredictions) {
      const topPrediction = predictionResponse.data.predictions[0];
      log.success(`ML Service is active - Model responding with predictions`);
      log.info(`  Sample prediction: ${topPrediction.disease} (${topPrediction.confidence}% confidence)`);
      return true;
    } else {
      throw new Error("Invalid prediction response format");
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      log.error(`ML Service not running at ${ML_SERVICE_URL}`);
    } else {
      log.error(`ML Service test failed: ${error.message}`);
    }
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`
${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗
║           MediVault System Connectivity Test                ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  const results = {
    mongodb: false,
    ganache: false,
    mlService: false,
  };

  // Test all services
  log.header("1. Testing MongoDB...");
  results.mongodb = await testMongoDB();

  log.header("2. Testing Ganache (Blockchain)...");
  results.ganache = await testGanache();

  log.header("3. Testing ML Service...");
  results.mlService = await testMLService();

  // Summary
  console.log(`
${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗
║                    Test Results Summary                      ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`  MongoDB:      ${results.mongodb ? colors.green + "✓ PASS" : colors.red + "✗ FAIL"}${colors.reset}`);
  console.log(`  Ganache:      ${results.ganache ? colors.green + "✓ PASS" : colors.red + "✗ FAIL"}${colors.reset}`);
  console.log(`  ML Service:   ${results.mlService ? colors.green + "✓ PASS" : colors.red + "✗ FAIL"}${colors.reset}`);

  const allPassed = results.mongodb && results.ganache && results.mlService;

  if (allPassed) {
    console.log(`
${colors.bold}${colors.green}╔════════════════════════════════════════════════════════════╗
║                     SYSTEM READY                             ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);
    process.exit(0);
  } else {
    console.log(`
${colors.bold}${colors.red}╔════════════════════════════════════════════════════════════╗
║               SYSTEM NOT READY - Check failed services       ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

    // Provide troubleshooting hints
    console.log(`${colors.yellow}Troubleshooting:${colors.reset}`);
    if (!results.mongodb) {
      console.log(`  • MongoDB: Run 'mongod' or check if MongoDB service is running`);
    }
    if (!results.ganache) {
      console.log(`  • Ganache: Run 'ganache' in a terminal`);
    }
    if (!results.mlService) {
      console.log(`  • ML Service: cd ml-service && python app.py`);
    }

    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
