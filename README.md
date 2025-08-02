# Base-Stellar Atomic Swap Implementation

A cross-chain atomic swap system enabling trustless trading between Base (Ethereum Layer 2) and Stellar networks using Hash Time-Locked Contracts (HTLCs).

## 🌟 Overview

This implementation allows users to atomically swap ETH on Base network for XLM on Stellar network (and vice versa) without requiring trust between parties. The system leverages:

- **Base Network**: Ethereum Layer 2 with 1inch Limit Order Protocol integration
- **Stellar Network**: Native HTLC functionality using pre-signed transactions
- **Atomic Guarantees**: Either both parties receive their assets, or both get refunds

## 🔄 Swap Logic

### Core Atomic Swap Process

The atomic swap follows a standardized 4-step process ensuring trustless execution:

```
1. SETUP PHASE
   ├── Maker generates secret (32 random bytes)
   ├── Creates hashlock = SHA256(secret)
   └── Both parties agree on swap terms

2. FUNDING PHASE
   ├── Taker funds Stellar HTLC with XLM
   └── Maker funds Base escrow with ETH

3. CLAIMING PHASE (Secret Reveal)
   ├── Maker claims XLM using secret (reveals secret on Stellar)
   └── Taker extracts secret from Stellar blockchain

4. COMPLETION PHASE
   └── Taker claims ETH using revealed secret
```

### Hash Time-Locked Contracts (HTLCs)

HTLCs provide atomic swap guarantees through two mechanisms:

#### 🔐 **Hashlock Protection**
- Funds can only be claimed with the correct secret
- Secret must hash to the agreed hashlock value
- Uses SHA-256 for cross-chain compatibility

#### ⏰ **Timelock Protection**
Both chains implement sophisticated timelock mechanisms to ensure atomic execution:

**Base/EVM Timelock (Multi-Stage):**
```
Contract Deployed → Finality → Private Withdrawal → Public Withdrawal → Cancellation
├── Stage 1: Private Withdrawal (only taker with secret)
├── Stage 2: Public Withdrawal (anyone with secret + access token)  
└── Stage 3: Cancellation (taker gets automatic refund)
```

**Stellar Timelock (Simple):**
```
Contract Created → Claim Period → Refund Period
├── Claim: Maker can claim XLM with secret
└── Refund: Automatic refund to taker after expiration
```

This ensures funds are never permanently locked and provides multiple recovery mechanisms.

### Detailed Swap Flow

#### Phase 1: Order Creation
```typescript
// Maker creates atomic swap order
const secret = crypto.randomBytes(32);           // 32-byte secret
const hashlock = sha256(secret);                 // SHA-256 hash
const timelock = now + 24_hours;                 // Expiration time

const order = {
  maker: { provides: "0.001 ETH", wants: "10 XLM" },
  secret,      // Only maker knows this initially
  hashlock,    // Public commitment to secret
  timelock     // Refund deadline
};
```

#### Phase 2: Stellar HTLC Creation
```typescript
// Taker funds Stellar HTLC
const stellarHTLC = {
  amount: "10 XLM",
  hashlock,                    // Same hashlock as order
  timelock,                    // Same timelock as order
  recipient: makerAddress,     // Maker can claim with secret
  refundTo: takerAddress       // Taker gets refund if expired
};
```

#### Phase 3: Base Escrow Creation
```typescript
// Maker funds Base escrow (1inch LOP integration with multi-stage timelock)
const baseEscrow = {
  amount: "0.001 ETH",
  hashlock,                    // Same hashlock
  timelocks: {                 // Multi-stage timelock system
    withdrawal: now + 1_hour,        // Private withdrawal starts
    publicWithdrawal: now + 6_hours, // Public withdrawal starts  
    cancellation: now + 24_hours     // Cancellation period starts
  },
  recipient: takerAddress,     // Taker can claim with secret
  refundTo: makerAddress       // Maker gets refund after cancellation
};
```

#### Phase 4: Secret Reveal & Claims
```typescript
// Maker claims XLM (reveals secret)
stellarTransaction = stellarHTLC.claim(secret);
// Secret is now visible on Stellar blockchain!

// Taker extracts secret from Stellar transaction
extractedSecret = parseTransaction(stellarTransaction);

// Taker claims ETH using revealed secret
baseEscrow.claim(extractedSecret);
```

## 🛡️ Security Guarantees

### Atomic Properties
- **Atomicity**: Either both parties get their desired assets, or both get refunds
- **Consistency**: No partial states - swap completes fully or not at all
- **Isolation**: Each swap is independent and doesn't affect others
- **Durability**: Once completed, swaps cannot be reversed

### Timelock Safety

**Stellar Side:**
```
If timelock expires before secret reveal:
└── Stellar HTLC → Automatic refund XLM to Taker
```

**Base/EVM Side (Multi-Stage Protection):**
```
Timeline Protection Stages:
├── Hour 1-6:   Private Withdrawal (only taker with secret)
├── Hour 6-24:  Public Withdrawal (anyone with secret + access token)
└── Hour 24+:   Cancellation (taker gets automatic ETH refund)

If no secret is revealed and all timeouts expire:
└── Base Escrow → Refunds ETH to Maker during cancellation period
```

**Result**: Both parties recover their original assets if swap fails at any stage.

### Hash Security
- Uses SHA-256 for cryptographic security
- 256-bit secrets provide collision resistance
- Same hash function across both chains ensures compatibility

## 📁 Architecture

```
stellinch/
├── evm/                     # Base network integration
│   ├── contracts/          # Smart contracts & libraries
│   └── scripts/            # Order creation & claiming
├── stellar/                # Stellar network integration
│   ├── htlc-contract.ts   # HTLC implementation
│   └── contracts/         # Generated HTLC instances
├── orders/                 # Swap order storage
└── test-stellar-swap.js   # Comprehensive test suite
```

## 🚀 Usage

### Prerequisites
```bash
npm install
# Configure wallets and API keys (see .env.example)
```

### Create Atomic Swap Order
```bash
# Generate new cross-chain swap order
npx hardhat run evm/scripts/create-stellar-order.ts --network base
```

### Execute Maker Claim (Reveals Secret)
```bash
# Maker claims XLM and reveals secret
ORDER_ID=stellar_order_123 npx hardhat run evm/scripts/maker-claim-stellar.ts
```

### Monitor Secret Reveal
```bash
# Taker extracts secret from Stellar blockchain
# Then claims ETH using revealed secret
ORDER_ID=stellar_order_123 npm run taker:claim
```

## 🧪 Testing

Run the comprehensive test suite:
```bash
node test-stellar-swap.js
```

Tests verify:
- ✅ Order creation with valid secrets/hashlocks
- ✅ HTLC functionality and timelock handling
- ✅ Secret reveal mechanism
- ✅ Bidirectional swap capabilities (ETH↔XLM, XLM↔ETH)
- ✅ Network integration and API connectivity
- ✅ Cross-chain atomic guarantees

## 🔧 Configuration

### Network Settings
```typescript
// Base Network (Ethereum L2) - Multi-Stage Timelock System
const baseConfig = {
  chainId: 8453,
  rpc: "https://base.llamarpc.com",
  lopContract: "0x119c71D3BbAC22029622cbaEc24854d3D32D2828",
  timelockStages: {
    withdrawal: 3600,        // 1 hour - private withdrawal
    publicWithdrawal: 21600, // 6 hours - public withdrawal  
    cancellation: 86400      // 24 hours - cancellation period
  }
};

// Stellar Network - Simple Timelock
const stellarConfig = {
  network: "testnet", // or "mainnet"
  horizon: "https://horizon-testnet.stellar.org",
  defaultTimelock: 86400 // 24 hours simple timelock
};
```

### Supported Assets
- **Base**: ETH, ERC-20 tokens
- **Stellar**: XLM, Stellar tokens

## 🔐 Security Considerations

### Private Key Management
- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider hardware wallets for mainnet

### Timelock Configuration

**Stellar Network:**
- Simple timelock: 24-48 hours from contract creation
- Allow time for maker to claim XLM and reveal secret

**Base/EVM Network (Multi-Stage):**
- **Private Withdrawal**: 1-6 hours (taker only)
- **Public Withdrawal**: 6-24 hours (anyone with access token)
- **Cancellation**: 24+ hours (automatic refund)
- Account for network congestion and confirmation times

The multi-stage approach provides multiple opportunities for completion and prevents permanent fund locks.

### Amount Validation
- Verify amounts before funding HTLCs
- Check decimal precision differences between networks
- Validate sufficient balances before swap initiation

## 🤝 How It Works: Trust-Minimized Trading

1. **No Custodian**: No third party holds funds during the swap
2. **Cryptographic Proof**: Hash functions ensure secret authenticity
3. **Time-Bounded**: Automatic refunds prevent permanent fund loss
4. **Verifiable**: All transactions are publicly auditable on both blockchains
5. **Atomic**: Impossible for only one party to receive their assets

This creates a trustless bridge between Base and Stellar ecosystems, enabling secure cross-chain value transfer without counterparty risk.

## 📖 Further Reading

- [Hash Time-Locked Contracts](https://en.bitcoin.it/wiki/Hash_Time_Locked_Contracts)
- [Atomic Swaps](https://en.bitcoin.it/wiki/Atomic_swap)
- [Stellar HTLC Documentation](https://developers.stellar.org/)
- [1inch Limit Order Protocol](https://docs.1inch.io/docs/limit-order-protocol/introduction)

## ⚠️ Disclaimer

This implementation is for educational and development purposes. Conduct thorough testing and audits before mainnet deployment. Always verify timelock and hashlock parameters before funding any HTLC.
