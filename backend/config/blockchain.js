// backend/config/blockchain.js
const Web3 = require("web3");
const path = require("path");
const fs = require("fs");

// ===== CONFIGURATION (from environment variables) =====
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545"; // Ganache RPC
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
// =======================================================

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error("❌ Missing PRIVATE_KEY or CONTRACT_ADDRESS in environment variables");
  process.exit(1);
}

// Load ABI
const ABI_PATH = path.join(__dirname, "MedivaultABI.json");
if (!fs.existsSync(ABI_PATH)) {
  console.error("❌ MedivaultABI.json not found! Create it in config folder.");
  process.exit(1);
}
const abi = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

// Initialize Web3
const web3 = new Web3(RPC_URL);
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

// Create contract instance
const contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);

console.log(`✅ Blockchain configured at: ${RPC_URL}`);
console.log(`✅ Contract ready at: ${CONTRACT_ADDRESS}`);

module.exports = { web3, account, contract, RPC_URL, CONTRACT_ADDRESS };