# 🔄 Refund Functionality Demo

## Overview
Both `real-test-base-to-stellar.js` and `real-test-stellar-to-base.js` now include refund functionality to test the cancellation mechanism of HTLC contracts when timeouts occur.

## How to Test Refunds

### Base-to-Stellar Refund Test
```bash
node real-test-base-to-stellar.js --refund
```

### Stellar-to-Base Refund Test
```bash
node real-test-stellar-to-base.js --refund
```

## What the Refund Test Does

1. **Creates Short-Timeout HTLC**: Creates a new escrow with very short timeouts (30 seconds for cancellation)
2. **Waits for Timeout**: Waits 35 seconds to ensure the cancellation period is reached
3. **Executes Cancellation**: Calls the `cancel()` function on the escrow contract
4. **Verifies Refund**: Confirms that funds are returned to the maker and safety deposit to the taker

## Refund Mechanics

### Timelock Periods
- **Withdrawal Period**: 10 seconds (taker can claim with secret)
- **Public Withdrawal**: 20 seconds (anyone can claim with secret)
- **Cancellation Period**: 30 seconds (taker can cancel and refund)

### Fund Distribution on Cancellation
- **Main Amount**: Returned to the maker (original depositor)
- **Safety Deposit**: Given to the taker (cancellation incentive)

## Recent Test Results

### Base-to-Stellar Refund ✅
- **Escrow Created**: `0x1634f4FE57F4e165440EFF4a97520E25940FEE85`
- **Cancellation TX**: `0x41ae78763433d1767ccac8aeeea45777a210b3d755f8719d7efb0befe1afdf92`
- **Gas Used**: 27,350 gas
- **Amount**: 0.001 ETH successfully refunded

### Stellar-to-Base Refund ✅
- **Escrow Created**: `0xFC81d9CE83b113770083cC431A7287A25055A3C4`
- **Cancellation TX**: `0xe8292e9dde305c746f8b9af687e169a31567173fd73473be085952ec3d8f5172`
- **Gas Used**: 27,380 gas
- **Amount**: 0.001 ETH successfully refunded

## Key Features

### Real Contract Integration
- Uses actual deployed HTLC contracts on Base Sepolia
- No mocks or simulations - real blockchain transactions
- Actual gas consumption and transaction fees

### Time-based Security
- Enforces proper timelock sequences
- Prevents premature cancellations
- Demonstrates timeout-based refund mechanism

### Cross-chain Compatibility
- Same refund mechanism works for both swap directions
- Maintains atomic swap guarantees
- Protects both parties in case of failed swaps

## Error Handling
The refund tests include comprehensive error handling:
- Validates timeout periods before attempting cancellation
- Provides helpful error messages if refund fails
- Explains potential reasons for failures (timing, permissions, etc.)

## Production Considerations
In production, the timeout periods would be much longer:
- **Withdrawal**: 1 hour
- **Public Withdrawal**: 6 hours  
- **Cancellation**: 24 hours

This gives sufficient time for normal swap completion while providing safety nets for stuck swaps.