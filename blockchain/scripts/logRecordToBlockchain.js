// logRecordToBlockchain.js
// Ethers.js script to log medical record IPFS hash and patientId to HealthRegistry

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

// ===== CONFIGURATION =====
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const CONTRACT_ADDRESS_PATH = path.join(__dirname, "health-registry-address.txt");
const ABI_PATH = path.join(__dirname, "..", "artifacts", "HealthRegistryABI.json");
// =========================

/**
 * Load the HealthRegistry contract instance
 */
function loadContract() {
  // Load contract address
  if (!fs.existsSync(CONTRACT_ADDRESS_PATH)) {
    throw new Error("Contract address file not found. Please deploy HealthRegistry first.");
  }
  const contractAddress = fs.readFileSync(CONTRACT_ADDRESS_PATH, "utf8").trim();

  // Load ABI
  if (!fs.existsSync(ABI_PATH)) {
    throw new Error("ABI file not found. Please deploy HealthRegistry first.");
  }
  const abi = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

  // Connect to network
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  return { contract, wallet, provider, contractAddress };
}

/**
 * Log a medical record to the blockchain
 * @param {string} ipfsHash - The IPFS CID of the uploaded file
 * @param {string} patientId - The patient's MongoDB ObjectId
 * @param {string} recordType - Type of medical record
 * @returns {Promise<{txHash: string, recordIndex: number, blockNumber: number}>}
 */
async function logRecord(ipfsHash, patientId, recordType = "Other") {
  console.log("\n📝 Logging record to HealthRegistry...");
  console.log("  IPFS Hash:", ipfsHash);
  console.log("  Patient ID:", patientId);
  console.log("  Record Type:", recordType);

  const { contract, wallet, contractAddress } = loadContract();
  
  console.log("\n📍 Contract Address:", contractAddress);
  console.log("👤 From Address:", wallet.address);

  // Send transaction
  console.log("\n⏳ Sending transaction...");
  const tx = await contract.logRecord(ipfsHash, patientId, recordType);
  
  console.log("📤 Transaction Hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await tx.wait();
  
  console.log("\n✅ Transaction confirmed!");
  console.log("📦 Block Number:", receipt.blockNumber);
  console.log("⛽ Gas Used:", receipt.gasUsed.toString());

  // Extract record index from event
  let recordIndex = null;
  if (receipt.events && receipt.events.length > 0) {
    const event = receipt.events.find((e) => e.event === "RecordLogged");
    if (event) {
      recordIndex = event.args.recordIndex.toNumber();
      console.log("🔢 Record Index:", recordIndex);
    }
  }

  return {
    txHash: tx.hash,
    recordIndex,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

/**
 * Get a record from the blockchain by index
 * @param {number} index - The record index
 */
async function getRecord(index) {
  const { contract } = loadContract();
  
  const result = await contract.getRecord(index);
  
  return {
    ipfsHash: result.ipfsHash,
    patientId: result.patientId,
    uploadedBy: result.uploadedBy,
    timestamp: new Date(result.timestamp.toNumber() * 1000).toISOString(),
    recordType: result.recordType,
  };
}

/**
 * Get all record indices for a patient
 * @param {string} patientId - The patient's MongoDB ObjectId
 */
async function getPatientRecords(patientId) {
  const { contract } = loadContract();
  
  const indices = await contract.getPatientRecordIndices(patientId);
  return indices.map((i) => i.toNumber());
}

/**
 * Check if a record has been logged
 * @param {string} ipfsHash - The IPFS CID to check
 */
async function isRecordLogged(ipfsHash) {
  const { contract } = loadContract();
  return await contract.isRecordLogged(ipfsHash);
}

/**
 * Get total number of records
 */
async function getTotalRecords() {
  const { contract } = loadContract();
  const total = await contract.getTotalRecords();
  return total.toNumber();
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  node logRecordToBlockchain.js log <ipfsHash> <patientId> [recordType]");
    console.log("  node logRecordToBlockchain.js get <index>");
    console.log("  node logRecordToBlockchain.js patient <patientId>");
    console.log("  node logRecordToBlockchain.js check <ipfsHash>");
    console.log("  node logRecordToBlockchain.js total");
    return;
  }

  const command = args[0];

  switch (command) {
    case "log":
      if (args.length < 3) {
        console.error("Error: log command requires ipfsHash and patientId");
        process.exit(1);
      }
      const result = await logRecord(args[1], args[2], args[3] || "Other");
      console.log("\n📋 Result:", JSON.stringify(result, null, 2));
      break;

    case "get":
      if (args.length < 2) {
        console.error("Error: get command requires record index");
        process.exit(1);
      }
      const record = await getRecord(parseInt(args[1]));
      console.log("\n📋 Record:", JSON.stringify(record, null, 2));
      break;

    case "patient":
      if (args.length < 2) {
        console.error("Error: patient command requires patientId");
        process.exit(1);
      }
      const indices = await getPatientRecords(args[1]);
      console.log("\n📋 Patient record indices:", indices);
      break;

    case "check":
      if (args.length < 2) {
        console.error("Error: check command requires ipfsHash");
        process.exit(1);
      }
      const logged = await isRecordLogged(args[1]);
      console.log("\n📋 Is logged:", logged);
      break;

    case "total":
      const total = await getTotalRecords();
      console.log("\n📋 Total records:", total);
      break;

    default:
      console.error("Unknown command:", command);
      process.exit(1);
  }
}

// Export for use as a module
module.exports = {
  logRecord,
  getRecord,
  getPatientRecords,
  isRecordLogged,
  getTotalRecords,
  loadContract,
};

// Run CLI if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error:", error.message);
      process.exit(1);
    });
}
