// backend/services/blockchainService.js
const { web3, account, contract } = require("../config/blockchain");
const crypto = require("crypto");

/**
 * Blockchain Service
 * Handles interactions with the MediVault smart contract
 */

// Role mapping from string to contract enum value
const ROLE_MAP = {
  patient: 0, // Role.Patient
  doctor: 1, // Role.Doctor
  insurance: 2, // Role.Insurance
  lab: 3, // Role.Lab
};

/**
 * Generate a Decentralized Identifier (DID) for a user
 * Format: did:medivault:<sha256-hash-of-userId-email>
 * @param {string} userId - MongoDB user ID
 * @param {string} email - User email
 * @returns {string} DID string
 */
const generateDID = (userId, email) => {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${email}:${Date.now()}`)
    .digest("hex")
    .substring(0, 32);

  return `did:medivault:${hash}`;
};

/**
 * Register a user on the blockchain
 * Logs user DID and role to the smart contract
 *
 * @param {string} name - User's name
 * @param {string} role - User's role (patient, doctor, insurance, lab)
 * @param {string} walletAddress - User's wallet address (optional)
 * @returns {Promise<{success: boolean, txHash: string, did: string}>}
 */
const registerUserOnBlockchain = async (name, role, walletAddress = null) => {
  try {
    const roleValue = ROLE_MAP[role.toLowerCase()];

    if (roleValue === undefined) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Use provided wallet address or default account
    const fromAddress = walletAddress || account.address;

    // Generate DID
    const did = generateDID(fromAddress, name);

    console.log(`📝 Registering user on blockchain:`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: ${role} (${roleValue})`);
    console.log(`   Address: ${fromAddress}`);
    console.log(`   DID: ${did}`);

    // Call smart contract registerUser function
    const tx = await contract.methods.registerUser(name, roleValue).send({
      from: account.address, // Always use server account for gas
      gas: 200000,
    });

    console.log(`✅ User registered on blockchain`);
    console.log(`   TX Hash: ${tx.transactionHash}`);
    console.log(`   Block: ${tx.blockNumber}`);

    return {
      success: true,
      txHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      did: did,
      walletAddress: fromAddress,
    };
  } catch (error) {
    // Handle "User already registered" error gracefully
    if (error.message?.includes("User already registered")) {
      console.log(`ℹ️ User already registered on blockchain`);
      return {
        success: true,
        alreadyRegistered: true,
        did: generateDID(walletAddress || account.address, name),
      };
    }

    console.error("❌ Blockchain registration error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get user info from blockchain
 * @param {string} address - User's wallet address
 * @returns {Promise<{name: string, role: string, address: string}>}
 */
const getUserFromBlockchain = async (address) => {
  try {
    const user = await contract.methods.getUser(address).call();
    return {
      success: true,
      name: user[0],
      role: Object.keys(ROLE_MAP).find((key) => ROLE_MAP[key] === Number(user[1])),
      address: user[2],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if user is registered on blockchain
 * @param {string} address - User's wallet address
 * @returns {Promise<boolean>}
 */
const isUserRegistered = async (address) => {
  try {
    const user = await contract.methods.users(address).call();
    return user.userAddress !== "0x0000000000000000000000000000000000000000";
  } catch (error) {
    return false;
  }
};

/**
 * Add medical record to blockchain (Doctor only)
 * @param {string} patientAddress - Patient's wallet address
 * @param {string} recordHash - IPFS hash of the record
 * @returns {Promise<{success: boolean, txHash: string}>}
 */
const addRecordToBlockchain = async (patientAddress, recordHash) => {
  try {
    const tx = await contract.methods.addRecord(patientAddress, recordHash).send({
      from: account.address,
      gas: 200000,
    });

    return {
      success: true,
      txHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
    };
  } catch (error) {
    console.error("❌ Add record error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get all records for a patient from blockchain
 * @param {string} patientAddress - Patient's wallet address
 * @returns {Promise<Array>}
 */
const getRecordsFromBlockchain = async (patientAddress) => {
  try {
    const records = await contract.methods.getRecords(patientAddress).call();
    return {
      success: true,
      records: records.map((r) => ({
        patientName: r.patientName,
        doctorName: r.doctorName,
        recordHash: r.recordHash,
        timestamp: new Date(Number(r.timestamp) * 1000),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      records: [],
    };
  }
};

module.exports = {
  generateDID,
  registerUserOnBlockchain,
  getUserFromBlockchain,
  isUserRegistered,
  addRecordToBlockchain,
  getRecordsFromBlockchain,
  ROLE_MAP,
};
