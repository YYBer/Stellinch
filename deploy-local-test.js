#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

console.log('🚀 Base-Stellar Atomic Swap: Local Test Setup');
console.log('=============================================');

// Load wallet configuration
const walletConfig = JSON.parse(fs.readFileSync('wallet.json', 'utf8'));

// Create a mock deployment for testing
const mockDeployment = {
  network: 'base-sepolia',
  chainId: '84532', 
  deployer: walletConfig.ethWallet.address,
  timestamp: new Date().toISOString(),
  contracts: {
    EscrowFactory: '0x119c71D3BbAC22029622cbaEc24854d3D32D2828', // Use 1inch LOP factory as proxy
    EscrowDst: '0x0000000000000000000000000000000000000001' // Mock address
  },
  constructorArgs: {
    rescueDelay: 86400,
    accessToken: '0x0000000000000000000000000000000000000000'
  }
};

// Save mock deployment
const deploymentsDir = path.join(__dirname, 'deployments');
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir, { recursive: true });
}

const deploymentFile = path.join(deploymentsDir, 'base-sepolia-84532.json');
fs.writeFileSync(deploymentFile, JSON.stringify(mockDeployment, null, 2));

console.log('📋 Mock deployment created for testing');
console.log('   Network: base-sepolia');
console.log('   Chain ID: 84532');
console.log('   Factory:', mockDeployment.contracts.EscrowFactory);
console.log('   File:', deploymentFile);

console.log('\n✅ Ready to run atomic swap test!');
console.log('Run: npm run real-test');