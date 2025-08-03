require("@nomicfoundation/hardhat-toolbox");
const fs = require('fs');
const path = require('path');

// Load wallet configuration
let walletConfig;
try {
  const walletPath = path.join(__dirname, 'wallet.json');
  walletConfig = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
} catch (error) {
  console.error('Failed to load wallet.json:', error.message);
  process.exit(1);
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./evm/contracts",
    tests: "./evm/test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    baseSepolia: {
      url: "https://base-sepolia.drpc.org",
      chainId: 84532,
      accounts: walletConfig.PRIVATE_KEY ? [walletConfig.PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
      gas: 5000000
    },
    baseMainnet: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: walletConfig.PRIVATE_KEY ? [walletConfig.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};