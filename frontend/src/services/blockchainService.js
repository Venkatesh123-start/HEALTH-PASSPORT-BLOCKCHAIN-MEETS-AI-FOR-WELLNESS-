// blockchainService.js
import Web3 from "web3";
import MedivaultABI from "../config/MedivaultABI.json";

// ===== CONFIGURATION =====
const RPC_URL = "http://127.0.0.1:8545"; // Ganache RPC
// Contract address - update this after deployment
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ===== INITIALIZE WEB3 =====
let web3;
let contract;

const initWeb3 = () => {
  if (!web3) {
    // Check if MetaMask or another Web3 provider is available
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
    } else {
      // Fallback to local Ganache
      web3 = new Web3(RPC_URL);
    }
    contract = new web3.eth.Contract(MedivaultABI, CONTRACT_ADDRESS);
  }
  return { web3, contract };
};

// ===== SERVICE FUNCTIONS =====
export const blockchainService = {
  // Initialize and get web3 instance
  init: async () => {
    const { web3 } = initWeb3();
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
      } catch (error) {
        console.error("User denied account access");
      }
    }
    return web3;
  },

  // Get connected accounts
  getAccounts: async () => {
    const { web3 } = initWeb3();
    return await web3.eth.getAccounts();
  },

  // Get user info
  getUser: async (address) => {
    try {
      const { contract } = initWeb3();
      const result = await contract.methods.getUser(address).call();
      return {
        name: result[0],
        role: result[1],
        address: result[2],
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  },

  // Register a new user
  registerUser: async (account, name, role) => {
    try {
      const { contract } = initWeb3();
      const tx = await contract.methods.registerUser(name, role).send({
        from: account,
        gas: 500000,
      });
      return tx;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  },

  // Add a medical record (only doctor)
  addRecord: async (doctorAccount, patientAddress, recordHash) => {
    try {
      const { contract } = initWeb3();
      const tx = await contract.methods
        .addRecord(patientAddress, recordHash)
        .send({ from: doctorAccount, gas: 500000 });
      return tx;
    } catch (error) {
      console.error("Error adding record:", error);
      throw error;
    }
  },

  // Get all records of a patient
  getRecords: async (patientAddress) => {
    try {
      const { contract } = initWeb3();
      const records = await contract.methods.getRecords(patientAddress).call();
      return records.map((rec) => ({
        patientName: rec.patientName,
        doctorName: rec.doctorName,
        recordHash: rec.recordHash,
        timestamp: rec.timestamp,
      }));
    } catch (error) {
      console.error("Error fetching records:", error);
      throw error;
    }
  },

  // Update contract address (useful if redeployed)
  setContractAddress: (newAddress) => {
    const { web3 } = initWeb3();
    contract = new web3.eth.Contract(MedivaultABI, newAddress);
  },
};

export default blockchainService;