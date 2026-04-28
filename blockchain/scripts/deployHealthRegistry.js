// deployHealthRegistry.js
// Script to deploy the HealthRegistry smart contract using ethers.js

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const solc = require("solc");

// ===== CONFIGURATION =====
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || null; // Will use first Ganache account if not set
const CONTRACT_PATH = path.join(__dirname, "..", "contracts", "HealthRegistry.sol");
const OUTPUT_PATH = path.join(__dirname, "health-registry-address.txt");
const ABI_OUTPUT_PATH = path.join(__dirname, "..", "artifacts", "HealthRegistryABI.json");
// =========================

async function main() {
  console.log("🚀 Deploying HealthRegistry contract...\n");

  // Connect to Ganache
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Get accounts from Ganache and use the first one
  let wallet;
  if (PRIVATE_KEY) {
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  } else {
    // Use Ganache's getSigner which has access to unlocked accounts
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error("No accounts available in Ganache");
    }
    wallet = provider.getSigner(accounts[0]);
    console.log("📍 Using Ganache unlocked account");
  }
  
  const deployerAddress = await wallet.getAddress();
  console.log("📍 Network:", RPC_URL);
  console.log("👤 Deployer:", deployerAddress);
  
  const balance = await provider.getBalance(deployerAddress);
  console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH\n");
  
  if (balance.isZero()) {
    console.log("⚠️  Deployer account has 0 balance. Trying first Ganache account...");
    const accounts = await provider.listAccounts();
    for (let i = 0; i < accounts.length; i++) {
      const accBalance = await provider.getBalance(accounts[i]);
      if (!accBalance.isZero()) {
        wallet = provider.getSigner(accounts[i]);
        console.log("✅ Using account:", accounts[i]);
        console.log("💰 Balance:", ethers.utils.formatEther(accBalance), "ETH\n");
        break;
      }
    }
  }

  // Read and compile the contract
  if (!fs.existsSync(CONTRACT_PATH)) {
    throw new Error(`Contract not found at ${CONTRACT_PATH}`);
  }
  
  const source = fs.readFileSync(CONTRACT_PATH, "utf8");
  console.log("📄 Compiling HealthRegistry.sol...");

  const input = {
    language: "Solidity",
    sources: {
      "HealthRegistry.sol": { content: source },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for compilation errors
  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("❌ Compilation errors:");
      errors.forEach((e) => console.error(e.formattedMessage));
      process.exit(1);
    }
  }

  const contractOutput = output.contracts["HealthRegistry.sol"]["HealthRegistry"];
  const abi = contractOutput.abi;
  const bytecode = "0x" + contractOutput.evm.bytecode.object;

  console.log("✅ Compilation successful!\n");

  // Deploy the contract
  console.log("📤 Deploying to blockchain...");
  
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log("⏳ Waiting for deployment confirmation...");
  await contract.deployed();

  console.log("\n✅ HealthRegistry deployed successfully!");
  console.log("📍 Contract Address:", contract.address);
  console.log("🔗 Transaction Hash:", contract.deployTransaction.hash);

  // Save contract address
  fs.writeFileSync(OUTPUT_PATH, contract.address);
  console.log(`\n💾 Contract address saved to: ${OUTPUT_PATH}`);

  // Save ABI
  const artifactsDir = path.dirname(ABI_OUTPUT_PATH);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  fs.writeFileSync(ABI_OUTPUT_PATH, JSON.stringify(abi, null, 2));
  console.log(`💾 ABI saved to: ${ABI_OUTPUT_PATH}`);

  // Also copy to backend config
  const backendAbiPath = path.join(__dirname, "..", "..", "backend", "config", "HealthRegistryABI.json");
  fs.writeFileSync(backendAbiPath, JSON.stringify(abi, null, 2));
  console.log(`💾 ABI copied to backend: ${backendAbiPath}`);

  console.log("\n🎉 Deployment complete!");
  
  return contract.address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
