require("dotenv").config();
require("@nomiclabs/hardhat-waffle"); // optional if using Waffle tests

module.exports = {
  solidity: "0.8.21",
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      url: process.env.RPC_URL || "http://127.0.0.1:7545",
      accounts: [process.env.PRIVATE_KEY].filter(Boolean)
    }
  }
};