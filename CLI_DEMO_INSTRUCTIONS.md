# CLI Demo Instructions for Base-Stellar Atomic Swap

## Overview
This demo shows how to run atomic swaps between Base mainnet and Stellar testnet using the configured scripts.

## Prerequisites

### Required Funds
- **Base ETH Maker Wallet**: Needs ~0.0015 ETH for gas + swap amounts
- **Base ETH Taker Wallet**: Has 0.004 ETH ✅
- **Stellar Accounts**: Auto-funded on testnet with ~10,000 XLM each ✅

### Current Configuration
- **Base Mainnet**: Chain ID 8453, RPC: https://mainnet.base.org
- **Stellar Testnet**: Auto-funded accounts with 9,000+ XLM each
- **1inch API Key**: dyqTRYbTBcOMYmZitPfJ9FP2j1dQVgBv (configured for Base mainnet)
- **Wallet Management**: All keys stored in `wallet.json` (no .env needed)

## Current Status
✅ **Configured for Base Mainnet + Stellar Testnet**
✅ **Contracts Deployed**: EscrowFactory at `0x9636704326e625BE026e0ED35d7Cb4Ff63D33d20`
✅ **Scripts Updated**: Using wallet.json, .env removed
✅ **Stellar Accounts Funded**: ~10,000 XLM each on testnet
⚠️ **ETH Maker Needs More Funding**: 0.0008 ETH current, needs 0.0015 ETH

### Account Balances
- **ETH Maker**: 0xa04c0DFA9B5229104E34676E640d7Dd18F70de17 (0.0038 ETH ✅)
- **ETH Taker**: 0x7A5e47655CA56EADC48A46Ba4c3a0618eA02380E (0.001 ETH ✅)
- **Stellar Maker**: GCYYNNOGU2NX2KQN3MVFTA2A2EMJ7K3BMYUQB7AVZ7FX4J4YW7MMFMWN (10,050 XLM ✅)
- **Stellar Taker**: GBI4P5IHHXBQQ4BQQBF453NOEAWVAOJIBNMVQQXRZS4PSUUCZ3XWIJOY (9,950 XLM ✅)

## CLI Commands

### 1. Base-to-Stellar Swap
```bash
node real-test-base-to-stellar.js
```
**What it does:**
- ETH Maker locks 0.001 ETH on Base mainnet
- Stellar Taker locks 10 XLM on Stellar mainnet 
- Stellar Maker reveals secret to claim XLM
- ETH Taker uses revealed secret to claim ETH

### 2. Stellar-to-Base Swap  
```bash
node real-test-stellar-to-base.js
```
**What it does:**
- Similar flow but initiated from Stellar side
- Creates HTLC on Base and payment on Stellar

### 3. Base-to-Stellar Refund Test
```bash
node real-test-base-to-stellar.js --refund
```
**What it does:**
- Tests timeout and refund functionality for Base HTLC
- Creates short-timeout escrow and demonstrates cancellation
- Shows maker can recover funds after timeout

### 4. Stellar-to-Base Refund Test
```bash
node real-test-stellar-to-base.js --refund
```
**What it does:**
- Tests timeout and refund functionality for Base HTLC in reverse direction
- Creates short-timeout escrow and demonstrates cancellation
- Shows refund mechanism works in both swap directions

## Demo Flow

### Step 1: Fund ETH Maker Account
Only one account needs funding:

**Base Mainnet (ETH):**
- Send 0.001 ETH to ETH Maker: `0xa04c0DFA9B5229104E34676E640d7Dd18F70de17`
- ETH Taker already has 0.004 ETH ✅

**Stellar Testnet (XLM):**
- Both accounts auto-funded with ~10,000 XLM each ✅

### Step 2: Run Base-to-Stellar Demo
```bash
node real-test-base-to-stellar.js
```

Expected output shows:
1. ✅ Network connections established
2. ✅ Hashlock generated  
3. ✅ ETH locked in Base HTLC
4. ✅ XLM locked on Stellar
5. ✅ Secret revealed on Stellar
6. ✅ ETH claimed using revealed secret

### Step 3: Run Stellar-to-Base Demo
```bash
node real-test-stellar-to-base.js
```

Similar flow but reverse direction.

### Step 4: Test Refunds
```bash
# Test Base-to-Stellar refund functionality
node real-test-base-to-stellar.js --refund

# Test Stellar-to-Base refund functionality  
node real-test-stellar-to-base.js --refund
```

Demonstrates timeout and cancellation functionality in both directions.

## Contract Addresses

### Base Mainnet Deployment
- **EscrowFactory**: `0x9636704326e625BE026e0ED35d7Cb4Ff63D33d20`
- **EscrowDst Implementation**: `0x090D94412beBC2c14c3F7D1a094986d5F2862BDd`
- **Explorer**: https://basescan.org

### Successful Transaction Example
- **Base HTLC Creation**: https://basescan.org/tx/0xee12e98d4c364c8b0eaf33c49cbb2b495c80e29fabbb4b135cd23b7a7e6ec481
- **Escrow Contract**: https://basescan.org/address/0x65a8124948548e5f077e6c5cF70A65C1F45DE4Fc

## Network Configuration

### Base Mainnet
```javascript
{
  rpc: 'https://mainnet.base.org',
  chainId: 8453,
  explorer: 'https://basescan.org'
}
```

### Stellar Testnet  
```javascript
{
  network: 'testnet',
  server: 'https://horizon-testnet.stellar.org',
  networkPassphrase: StellarSdk.Networks.TESTNET
}
```

## Troubleshooting

### Common Issues

1. **Insufficient Funds Error**
   ```
   insufficient funds for intrinsic transaction cost
   ```
   **Solution**: Fund the ETH accounts with more ETH

2. **Stellar Account Issues**
   ```
   Stellar taker account not found
   ```
   **Solution**: Accounts auto-funded on testnet via Friendbot

3. **Wrong Deployment**
   ```
   could not decode result data
   ```
   **Solution**: Ensure using correct mainnet deployment file

### Configuration Files
- **Wallet Config**: `wallet.json` (contains private keys)
- **Deployment Info**: `deployments/baseMainnet-8453.json`
- **Environment**: `.env` (contains PRIVATE_KEY)

## Security Notes
- ✅ All transactions use real mainnet contracts
- ✅ Atomic swap properties enforced by smart contracts
- ✅ Timelock protection prevents stuck funds
- ✅ SHA-256 hashlock ensures cross-chain compatibility
- ⚠️ Private keys in wallet.json - keep secure
- ⚠️ Demo uses real funds on mainnet

## Results
Successful swaps save results to `swap-results/` directory with transaction hashes and contract addresses for verification.