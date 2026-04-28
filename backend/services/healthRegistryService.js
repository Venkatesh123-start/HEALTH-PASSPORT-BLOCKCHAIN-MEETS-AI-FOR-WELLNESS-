// backend/services/healthRegistryService.js
// Service to interact with the HealthRegistry smart contract using ethers.js

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

// Configuration
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ABI_PATH = path.join(__dirname, "..", "config", "HealthRegistryABI.json");
const CONTRACT_ADDRESS_PATH = path.join(__dirname, "..", "..", "blockchain", "scripts", "health-registry-address.txt");

let contract = null;
let provider = null;
let wallet = null;
let contractAddress = null;

/**
 * Initialize the HealthRegistry contract connection
 */
const initializeContract = () => {
  try {
    // Check if already initialized
    if (contract) return true;

    // Load contract address
    if (!fs.existsSync(CONTRACT_ADDRESS_PATH)) {
      console.warn("⚠️ HealthRegistry contract address not found. Deploy the contract first.");
      return false;
    }
    contractAddress = fs.readFileSync(CONTRACT_ADDRESS_PATH, "utf8").trim();

    // Load ABI
    if (!fs.existsSync(ABI_PATH)) {
      console.warn("⚠️ HealthRegistry ABI not found. Deploy the contract first.");
      return false;
    }
    const abi = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

    // Connect to network
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    if (!PRIVATE_KEY) {
      console.warn("⚠️ PRIVATE_KEY not set in environment variables");
      return false;
    }
    
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`✅ HealthRegistry service initialized at: ${contractAddress}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize HealthRegistry:", error.message);
    return false;
  }
};

/**
 * Log a medical record to the blockchain
 * @param {string} ipfsHash - The IPFS CID of the uploaded file
 * @param {string} patientId - The patient's MongoDB ObjectId
 * @param {string} recordType - Type of medical record
 * @returns {Promise<{success: boolean, txHash?: string, recordIndex?: number, error?: string}>}
 */
const logRecordToBlockchain = async (ipfsHash, patientId, recordType = "Other") => {
  try {
    if (!initializeContract()) {
      return { 
        success: false, 
        error: "HealthRegistry contract not available. Record saved without blockchain logging.",
        blockchainAvailable: false,
      };
    }

    console.log(`📝 Logging record to blockchain: ${ipfsHash} for patient ${patientId}`);

    const tx = await contract.logRecord(ipfsHash, patientId, recordType);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Extract record index from event
    let recordIndex = null;
    if (receipt.events && receipt.events.length > 0) {
      const event = receipt.events.find((e) => e.event === "RecordLogged");
      if (event) {
        recordIndex = event.args.recordIndex.toNumber();
      }
    }

    return {
      success: true,
      txHash: tx.hash,
      recordIndex,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("❌ Blockchain logging failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if a record has been logged to the blockchain
 * @param {string} ipfsHash - The IPFS CID to check
 * @returns {Promise<boolean>}
 */
const isRecordOnBlockchain = async (ipfsHash) => {
  try {
    if (!initializeContract()) return false;
    return await contract.isRecordLogged(ipfsHash);
  } catch (error) {
    console.error("❌ Failed to check blockchain:", error.message);
    return false;
  }
};

/**
 * Get a record from the blockchain
 * @param {number} index - The record index
 */
const getRecordFromBlockchain = async (index) => {
  try {
    if (!initializeContract()) return null;

    const result = await contract.getRecord(index);
    return {
      ipfsHash: result.ipfsHash,
      patientId: result.patientId,
      uploadedBy: result.uploadedBy,
      timestamp: new Date(result.timestamp.toNumber() * 1000),
      recordType: result.recordType,
    };
  } catch (error) {
    console.error("❌ Failed to get record from blockchain:", error.message);
    return null;
  }
};

/**
 * Get all record indices for a patient from blockchain
 * @param {string} patientId - The patient's MongoDB ObjectId
 */
const getPatientBlockchainRecords = async (patientId) => {
  try {
    if (!initializeContract()) return [];

    const indices = await contract.getPatientRecordIndices(patientId);
    return indices.map((i) => i.toNumber());
  } catch (error) {
    console.error("❌ Failed to get patient records from blockchain:", error.message);
    return [];
  }
};

/**
 * Get the health of the blockchain connection
 */
const getBlockchainHealth = async () => {
  try {
    if (!initializeContract()) {
      return { connected: false, error: "Contract not initialized" };
    }

    const blockNumber = await provider.getBlockNumber();
    const totalRecords = await contract.getTotalRecords();

    return {
      connected: true,
      rpcUrl: RPC_URL,
      contractAddress,
      currentBlock: blockNumber,
      totalRecords: totalRecords.toNumber(),
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

/**
 * Get recent event logs from the HealthRegistry contract for a patient
 * @param {string} patientId - The patient's MongoDB ObjectId
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Array>} - Array of event logs
 */
const getPatientEventLogs = async (patientId, limit = 10) => {
  try {
    if (!initializeContract()) {
      return [];
    }

    // Get RecordLogged events for this patient
    const filter = contract.filters.RecordLogged(null, patientId);
    
    // Get events from last 10000 blocks (or all if fewer)
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);
    
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);
    
    // Process events
    const logs = await Promise.all(
      events.slice(-limit).reverse().map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        return {
          eventType: "RecordLogged",
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block ? new Date(block.timestamp * 1000) : new Date(),
          data: {
            ipfsHash: event.args?.ipfsHash || "N/A",
            patientId: event.args?.patientId || patientId,
            recordType: event.args?.recordType || "Other",
            recordIndex: event.args?.recordIndex?.toNumber?.() || 0,
          },
        };
      })
    );

    return logs;
  } catch (error) {
    console.error("❌ Failed to get patient event logs:", error.message);
    return [];
  }
};

/**
 * Get recent global event logs from the blockchain
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Array>} - Array of recent event logs
 */
const getRecentEventLogs = async (limit = 20) => {
  try {
    if (!initializeContract()) {
      return [];
    }

    // Get all RecordLogged events
    const filter = contract.filters.RecordLogged();
    
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 5000);
    
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);
    
    // Process last N events
    const logs = await Promise.all(
      events.slice(-limit).reverse().map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        return {
          eventType: "RecordLogged",
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block ? new Date(block.timestamp * 1000) : new Date(),
          data: {
            ipfsHash: event.args?.ipfsHash || "N/A",
            patientId: event.args?.patientId || "N/A",
            recordType: event.args?.recordType || "Other",
          },
        };
      })
    );

    return logs;
  } catch (error) {
    console.error("❌ Failed to get recent event logs:", error.message);
    return [];
  }
};

// Initialize on module load
initializeContract();

module.exports = {
  logRecordToBlockchain,
  isRecordOnBlockchain,
  getRecordFromBlockchain,
  getPatientBlockchainRecords,
  getBlockchainHealth,
  getPatientEventLogs,
  getRecentEventLogs,
  initializeContract,
};
