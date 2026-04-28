// frontend/src/config/blockchain.js
import Web3 from "web3";
import MedivaultABI from "./MedivaultABI.json";

// ===== CONFIGURATION =====
const RPC_URL = "http://127.0.0.1:8545"; // Ganache RPC
const CONTRACT_ADDRESS = "0x3a4a45F4437d0cB90Aa38e7DD2DAdfc286f419eE"; // Deployed MediVault contract address
// =========================

// Initialize Web3
let web3;
let contract;
let account = null;

// Check if MetaMask or another Web3 provider is available
if (typeof window !== "undefined" && window.ethereum) {
  web3 = new Web3(window.ethereum);
} else {
  // Fallback to local Ganache
  web3 = new Web3(RPC_URL);
}

// Create contract instance
contract = new web3.eth.Contract(MedivaultABI, CONTRACT_ADDRESS);

// Function to connect wallet and get account
export const connectWallet = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
      return account;
    } catch (error) {
      console.error("User denied account access");
      throw error;
    }
  } else {
    // Use Ganache accounts
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];
    return account;
  }
};

// Function to get current account
export const getAccount = async () => {
  if (account) return account;
  const accounts = await web3.eth.getAccounts();
  return accounts[0];
};

console.log("✅ Blockchain configured. Contract ready at:", CONTRACT_ADDRESS);

export { web3, contract };