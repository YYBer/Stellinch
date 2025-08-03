#!/usr/bin/env node

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { StellarHTLC, StellarHTLCConfig } from '../../stellar/htlc-contract';

interface AtomicSwapOrder {
  orderId: string;
  timestamp: number;
  network: string;
  chainId: number;
  
  maker: {
    address: string;
    provides: {
      asset: "ETH" | "ERC20";
      amount: string;
      token?: string;
    };
    wants: {
      asset: "XLM" | "STELLAR_TOKEN";
      amount: string;
      address: string;
      publicKey?: string;
    };
  };
  
  secret: string;
  hashlock: string;
  
  timelock: {
    withdrawalPeriod: number;
    cancellationPeriod: number;
  };
  
  status: "CREATED" | "FILLED" | "COMPLETED" | "CANCELLED";
  
  contracts: {
    escrowFactory: string;
    accessToken: string;
  };

  stellarHTLC?: {
    address: string;
    contractId: string;
    amount: string;
    network: string;
    claimBefore: number;
  };
}

// Load wallet configuration securely
import walletConfig from '../../wallet.json';

// Stellar configuration
const STELLAR_CONFIG = {
  makerAddress: walletConfig.stellarMaker.address,
  takerAddress: walletConfig.stellarTaker.address,
  takerSecret: walletConfig.stellarTaker.secret,
  network: 'testnet' as const
};

async function main() {
  console.log("🚀 CREATING ATOMIC SWAP ORDER (ETH ↔ XLM)");
  console.log("==========================================");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = chainId === 8453 ? "base" : chainId === 11155111 ? "sepolia" : "unknown";
  
  console.log("🌐 EVM Network:", networkName);
  console.log("🔗 Chain ID:", chainId);
  console.log("🌟 Stellar Network:", STELLAR_CONFIG.network);
  
  // Get maker account
  const [maker] = await ethers.getSigners();
  console.log("👤 MAKER (EVM):", maker.address);
  console.log("👤 MAKER (Stellar):", STELLAR_CONFIG.makerAddress);
  
  const makerBalance = await ethers.provider.getBalance(maker.address);
  console.log("💰 MAKER Balance:", ethers.formatEther(makerBalance), "ETH");
  
  // Generate secure random secret
  const secretBytes = crypto.randomBytes(32);
  const secret = "0x" + secretBytes.toString("hex");
  const hashlock = ethers.sha256(secret);
  
  console.log("\n🔐 CRYPTOGRAPHIC SETUP:");
  console.log("=======================");
  console.log("🔑 Secret:", secret);
  console.log("🔒 Hashlock:", hashlock);
  
  // Get deployed contracts (using 1inch LOP contracts)
  const factoryAddress = "0x119c71D3BbAC22029622cbaEc24854d3D32D2828"; // 1inch LOP on Base
  const accessTokenAddress = "0x0000000000000000000000000000000000000000"; // No access token needed
  
  console.log("\n📋 CONTRACTS:");
  console.log("=============");
  console.log("🏭 Factory:", factoryAddress);
  console.log("🎫 Access Token:", accessTokenAddress);
  
  // Create order with cross-chain functionality
  const orderId = `stellar_order_${Date.now()}`;
  const timestamp = Date.now();
  
  // Set timelock for 24 hours from now
  const claimBefore = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
  
  const order: AtomicSwapOrder = {
    orderId,
    timestamp,
    network: networkName,
    chainId,
    
    maker: {
      address: maker.address,
      provides: {
        asset: "ETH",
        amount: ethers.parseEther("0.001").toString() // 0.001 ETH
      },
      wants: {
        asset: "XLM",
        amount: "10.0", // 10 XLM
        address: STELLAR_CONFIG.makerAddress
      }
    },
    
    secret,
    hashlock,
    
    timelock: {
      withdrawalPeriod: 3600,     // 1 hour withdrawal period
      cancellationPeriod: 86400   // 24 hour cancellation period
    },
    
    status: "CREATED",
    
    contracts: {
      escrowFactory: factoryAddress,
      accessToken: accessTokenAddress
    }
  };

  // Initialize Stellar HTLC
  const htlcConfig: StellarHTLCConfig = {
    secret,
    hashlock,
    amount: order.maker.wants.amount,
    makerAddress: STELLAR_CONFIG.makerAddress,
    takerAddress: STELLAR_CONFIG.takerAddress,
    timelock: claimBefore,
    network: STELLAR_CONFIG.network
  };

  const stellarHTLC = new StellarHTLC(htlcConfig);
  
  // Add Stellar HTLC details to order
  order.stellarHTLC = {
    address: STELLAR_CONFIG.takerAddress,
    contractId: stellarHTLC.getContractId(),
    amount: order.maker.wants.amount,
    network: STELLAR_CONFIG.network,
    claimBefore
  };
  
  console.log("\n📋 ORDER DETAILS:");
  console.log("=================");
  console.log("📄 Order ID:", orderId);
  console.log("👤 MAKER (EVM):", order.maker.address);
  console.log("👤 MAKER (Stellar):", order.maker.wants.address);
  console.log("💰 MAKER provides:", ethers.formatEther(order.maker.provides.amount), "ETH");
  console.log("🌟 MAKER wants:", order.maker.wants.amount, "XLM");
  console.log("🏠 Stellar HTLC Contract:", stellarHTLC.getContractId());
  console.log("⏰ Withdrawal period:", order.timelock.withdrawalPeriod, "seconds");
  console.log("⏰ Cancellation period:", order.timelock.cancellationPeriod, "seconds");
  console.log("⏰ Stellar timelock:", new Date(claimBefore * 1000).toISOString());
  
  console.log("\n🌟 STELLAR HTLC DETAILS:");
  console.log("========================");
  console.log("🔸 Contract ID:", stellarHTLC.getContractId());
  console.log("🔸 Amount:", order.stellarHTLC.amount, "XLM");
  console.log("🔸 Maker Address:", STELLAR_CONFIG.makerAddress);
  console.log("🔸 Taker Address:", STELLAR_CONFIG.takerAddress);
  console.log("🔸 Claim Before:", new Date(claimBefore * 1000).toISOString());
  console.log("🔸 Network:", STELLAR_CONFIG.network);
  
  // Save order to file
  const ordersDir = path.join(__dirname, "../../orders");
  if (!fs.existsSync(ordersDir)) {
    fs.mkdirSync(ordersDir, { recursive: true });
  }
  
  const orderPath = path.join(ordersDir, `${orderId}.json`);
  fs.writeFileSync(orderPath, JSON.stringify(order, null, 2));
  
  // Create and save HTLC contract details
  const htlcDir = path.join(__dirname, "../../stellar/contracts");
  if (!fs.existsSync(htlcDir)) {
    fs.mkdirSync(htlcDir, { recursive: true });
  }
  
  const htlcPath = path.join(htlcDir, `${stellarHTLC.getContractId()}.json`);
  fs.writeFileSync(htlcPath, JSON.stringify({
    contractId: stellarHTLC.getContractId(),
    config: htlcConfig,
    summary: stellarHTLC.getSummary(),
    orderId
  }, null, 2));
  
  console.log("\n✅ CROSS-CHAIN ORDER CREATED SUCCESSFULLY!");
  console.log("==========================================");
  console.log("📄 Order ID:", orderId);
  console.log("🔑 Secret:", secret);
  console.log("🔒 Hashlock:", hashlock);
  console.log("💾 Order saved to:", orderPath);
  console.log("🌟 HTLC saved to:", htlcPath);
  
  console.log("\n🎯 NEXT STEPS:");
  console.log("==============");
  console.log("1. 🔵 TAKER funds Stellar HTLC with", order.maker.wants.amount, "XLM");
  console.log("2. 🔵 MAKER creates EVM escrow with", ethers.formatEther(order.maker.provides.amount), "ETH");
  console.log("3. 🔵 MAKER claims XLM (reveals secret):");
  console.log("   ORDER_ID=" + orderId + " npm run maker:claim:stellar");
  console.log("4. 🔵 TAKER claims ETH (using revealed secret):");
  console.log("   ORDER_ID=" + orderId + " npm run taker:claim");
  
  console.log("\n🎉 CROSS-CHAIN ATOMIC SWAP READY!");
  console.log("=================================");
  console.log("🔸 Trade:", ethers.formatEther(order.maker.provides.amount), "ETH ↔", order.maker.wants.amount, "XLM");
  console.log("🔸 EVM Chain:", networkName, "(Chain ID:", chainId + ")");
  console.log("🔸 Stellar Network:", STELLAR_CONFIG.network);
  console.log("🔸 Hashlock/Timelock preserved across both chains!");
  console.log("🔸 Bidirectional swap functionality enabled!");
  
  // Generate funding transaction for reference
  console.log("\n📋 STELLAR FUNDING REFERENCE:");
  console.log("=============================");
  try {
    const fundingTx = stellarHTLC.createFundingTransaction();
    console.log("🔸 Funding TX ID:", fundingTx.id);
    console.log("🔸 Memo:", fundingTx.memo);
    console.log("🔸 Amount:", fundingTx.amount, "XLM");
    console.log("🔸 From:", fundingTx.from);
    console.log("🔸 To:", fundingTx.to);
    console.log("🔸 Hash:", fundingTx.hash);
  } catch (error) {
    console.log("🔸 Funding TX will be created by taker");
  }
  
  return order;
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;