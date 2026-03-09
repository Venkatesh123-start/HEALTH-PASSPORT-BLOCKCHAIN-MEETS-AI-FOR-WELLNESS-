// deploy.js
const fs = require("fs");
const path = require("path");
const Web3 = require("web3");
const solc = require("solc");

// ===== CONFIGURATION =====
const RPC_URL = "http://127.0.0.1:8545"; // Ganache RPC
const CONTRACT_PATH = path.join(__dirname, "MediVault.sol");
const CONTRACT_ADDRESS_PATH = path.join(__dirname, "contract-address.txt");
// =========================

// Initialize Web3
const web3 = new Web3(RPC_URL);

async function main() {
  try {
    // Get accounts from Ganache
    const accounts = await web3.eth.getAccounts();
    if (accounts.length === 0) {
      throw new Error("No accounts found on Ganache!");
    }
    const deployer = accounts[0];
    console.log("🚀 Deploying MediVault contract from account:", deployer);

    // Read Solidity contract
    if (!fs.existsSync(CONTRACT_PATH)) {
      throw new Error("MediVault.sol not found in scripts folder!");
    }
    const source = fs.readFileSync(CONTRACT_PATH, "utf8");

    // Compile contract
    const input = {
      language: "Solidity",
      sources: {
        "MediVault.sol": { content: source },
      },
      settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    const contractFile = output.contracts["MediVault.sol"]["MediVault"];
    const abi = contractFile.abi;
    const bytecode = contractFile.evm.bytecode.object;

    // Create contract instance
    const contract = new web3.eth.Contract(abi);

    // Deploy contract
    const deployedContract = await contract
      .deploy({ data: "0x" + bytecode })
      .send({ from: deployer, gas: 5000000 });

    console.log("✅ Contract deployed successfully!");
    console.log("📄 Contract Address:", deployedContract.options.address);

    // Save deployed contract address
    fs.writeFileSync(CONTRACT_ADDRESS_PATH, deployedContract.options.address);
    console.log("💾 Contract address saved to contract-address.txt");
  } catch (err) {
    console.error("❌ Deployment failed:", err);
  }
}

main();