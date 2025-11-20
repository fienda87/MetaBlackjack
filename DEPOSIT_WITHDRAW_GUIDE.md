# Deposit/Withdraw System Integration Guide

**Status:** ✅ Phase 3 - Deposit/Withdraw Flow (Complete)  
**Contracts Deployed:** Polygon Amoy Testnet  
**Date:** November 19, 2025

---

## 📋 Overview

The deposit/withdraw system is a hybrid on-chain/off-chain architecture that allows players to:
1. **Faucet:** Claim initial tokens (one-time, 100 GBC)
2. **Deposit:** Move tokens to escrow for gameplay
3. **Play:** All gameplay is instant and off-chain (no gas fees)
4. **Withdraw:** Return tokens to wallet with backend signature verification

---

## 🚀 Quick Start

### Frontend Integration

```typescript
// Import hooks in your component
import { useGBCFaucet } from '@/hooks/useGBCFaucet'
import { useGBCDeposit } from '@/hooks/useGBCDeposit'
import { useGBCWithdraw } from '@/hooks/useGBCWithdraw'
import DepositWithdrawModal from '@/components/DepositWithdrawModal'

// Use pre-built modal
<DepositWithdrawModal />

// Or use hooks directly for custom UI
const { claim, canClaim } = useGBCFaucet(userAddress)
const { depositWithApproval } = useGBCDeposit(userAddress)
const { withdraw } = useGBCWithdraw(userAddress)
```

---

## 📦 Deployed Contract Addresses

| Contract | Address | Network |
|----------|---------|---------|
| **GBC Token** | `0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a` | Polygon Amoy |
| **Faucet** | `0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7` | Polygon Amoy |
| **Deposit Escrow** | `0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22` | Polygon Amoy |
| **Game Withdraw** | `0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3` | Polygon Amoy |

**Environment Variables:**
```env
NEXT_PUBLIC_FAUCET_ADDRESS=0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7
NEXT_PUBLIC_DEPOSIT_ADDRESS=0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22
NEXT_PUBLIC_WITHDRAW_ADDRESS=0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3
BACKEND_SIGNER_PRIVATE_KEY=<backend-wallet-private-key>
```

---

## 🔌 Frontend Hooks

### 1. useGBCFaucet

Claim initial tokens.

```typescript
const {
  canClaim,              // bool: can user claim?
  formattedClaimAmount,  // string: "100"
  isClaiming,            // bool: transaction pending?
  isClaimConfirmed,      // bool: confirmed?
  claim,                 // async (): Promise<void>
  refetch,               // async (): Promise<void>
} = useGBCFaucet(address)

// Usage
if (canClaim) {
  await claim()
}
```

### 2. useGBCDeposit

Approve and deposit tokens to escrow.

```typescript
const {
  // Approval state
  allowance,             // string: Wei amount
  needsApproval,         // bool: needs approval?
  isApproving,           // bool: approval pending?
  isApprovalConfirmed,   // bool: approved?
  
  // Deposit state
  escrowBalance,         // string: Wei amount
  formattedEscrowBalance,// string: "100.50"
  isDepositing,          // bool: deposit pending?
  isDepositConfirmed,    // bool: confirmed?
  
  // Actions
  approve,               // async (amount): Promise<void>
  deposit,               // async (amount): Promise<void>
  depositWithApproval,   // async (amount): Promise<void> - smart flow
  refetch,               // async (): Promise<void>
} = useGBCDeposit(address)

// Usage - smart approve + deposit
await depositWithApproval('100') // Handles approval if needed
```

### 3. useGBCWithdraw

Withdraw tokens with signature verification.

```typescript
const {
  // State
  playerNonce,           // number: current nonce
  contractBalance,       // string: Wei amount
  
  // Transaction state
  isWithdrawing,         // bool: pending?
  isWithdrawConfirmed,   // bool: confirmed?
  hash,                  // string: tx hash
  error,                 // Error | undefined
  
  // Actions
  initiateWithdrawal,    // async (amount): Promise<{signature, nonce, finalBalance}>
  submitWithdrawal,      // async (amount, finalBalance, nonce, signature): Promise<void>
  withdraw,              // async (amount): Promise<{success, hash, message}> - complete flow
  refetch,               // async (): Promise<void>
} = useGBCWithdraw(address)

// Usage - complete flow (get signature + submit)
await withdraw('100')
```

---

## 🔗 Backend API Endpoints

### POST /api/withdrawal/initiate

Generate withdrawal signature from backend.

**Request:**
```json
{
  "playerAddress": "0x4c950023B40131944c7F0D116e86D046A7e7EE20",
  "amount": "100.5"
}
```

**Response:**
```json
{
  "signature": "0x...",
  "nonce": 12345,
  "finalBalance": "899.5",
  "playerAddress": "0x4c95...",
  "timestamp": "2025-11-19T10:30:00Z"
}
```

**Implementation Notes:**
- Backend verifies player exists in database
- Backend checks player has sufficient off-chain balance
- Backend generates nonce for replay protection
- Backend signs message with `BACKEND_SIGNER_PRIVATE_KEY`
- Message format must match contract: `keccak256(abi.encodePacked(player, amount, finalBalance, nonce))`

### GET /api/withdrawal/initiate?playerAddress=0x...

Get withdrawal history.

**Response:**
```json
{
  "playerAddress": "0x4c95...",
  "withdrawals": [
    {
      "amount": "100",
      "timestamp": "2025-11-19T10:30:00Z",
      "txHash": "0x...",
      "status": "confirmed"
    }
  ],
  "totalWithdrawn": "250"
}
```

### GET /api/deposit/balance?playerAddress=0x...

Get player's on-chain and off-chain balance.

**Response:**
```json
{
  "playerAddress": "0x4c95...",
  "onChainBalance": "500.50",
  "offChainBalance": "250.25",
  "totalBalance": "750.75",
  "lastUpdated": "2025-11-19T10:30:00Z"
}
```

### GET /api/faucet/status?playerAddress=0x...

Check faucet claim status.

**Response:**
```json
{
  "playerAddress": "0x4c95...",
  "canClaim": true,
  "claimAmount": "100",
  "lastClaimTime": null,
  "nextClaimTime": null,
  "cooldownDays": 30,
  "timestamp": "2025-11-19T10:30:00Z"
}
```

---

## 🎯 User Flow

### Step 1: Connect Wallet
```typescript
<ConnectButton />
```

### Step 2: Claim Faucet (Optional)
```typescript
const { canClaim, claim, isClaiming } = useGBCFaucet(address)

<Button onClick={claim} disabled={!canClaim || isClaiming}>
  Claim 100 GBC
</Button>
```

### Step 3: Approve & Deposit
```typescript
const { depositWithApproval, isDepositing } = useGBCDeposit(address)

const handleDeposit = async (amount: string) => {
  await depositWithApproval(amount)
}
```

### Step 4: Play Games
```typescript
// All gameplay is off-chain and instant
// No blockchain interaction
const gameResult = await playBlackjack(betAmount)
```

### Step 5: Withdraw
```typescript
const { withdraw, isWithdrawing } = useGBCWithdraw(address)

const handleWithdraw = async (amount: string) => {
  const result = await withdraw(amount)
  console.log('Withdrawn:', result.hash)
}
```

---

## 🔐 Security Considerations

### 1. Signature Verification
- Withdrawal requires signature from `BACKEND_SIGNER_ADDRESS`
- Contract recovers signer from signature using ECDSA
- Invalid signatures are rejected on-chain

### 2. Nonce Protection
- Each withdrawal uses unique nonce
- Used nonces are tracked in smart contract
- Prevents replay attack from reusing old signatures

### 3. Balance Verification
- Backend verifies player has sufficient off-chain balance
- Contract verifies signature matches message
- Final balance must be <= current balance (no creation of funds)

### 4. Access Control
- Only owner can set backend signer
- Only backend can sign withdrawals
- Players can only withdraw their own funds

---

## 🧪 Testing the Flow

### Manual Testing Steps

1. **Claim Faucet:**
   ```
   1. Go to app
   2. Connect wallet
   3. Click "Claim Faucet" in Deposit/Withdraw modal
   4. Confirm in MetaMask
   5. Wait for confirmation
   6. See "100 GBC added to wallet"
   ```

2. **Deposit:**
   ```
   1. Click "Deposit" tab
   2. Enter amount (e.g., 50)
   3. Click "Deposit 50 GBC"
   4. Approve spending in MetaMask (first time only)
   5. Confirm deposit transaction
   6. Wait for confirmation
   7. See escrow balance updated
   ```

3. **Play Games:**
   ```
   1. Go to GameTable
   2. Bet with GBC (off-chain, instant)
   3. Play multiple games
   4. Balance updates in real-time
   ```

4. **Withdraw:**
   ```
   1. Click "Withdraw" tab
   2. Enter amount (e.g., 25)
   3. Click "Withdraw 25 GBC"
   4. Backend generates signature
   5. Confirm withdrawal in MetaMask
   6. Contract verifies signature
   7. GBC transferred to wallet
   8. See wallet balance updated
   ```

### Automated Testing

Run test suite:
```bash
npm test src/__tests__/deposit-withdraw.test.ts
```

---

## 🐛 Troubleshooting

### "Insufficient Balance"
- **Cause:** User tried to deposit more than wallet balance
- **Fix:** Check wallet balance before depositing

### "Approval Failed"
- **Cause:** MetaMask rejected approval transaction
- **Fix:** Ensure network is set to Polygon Amoy

### "Nonce Already Used"
- **Cause:** Attempted to submit withdrawal with old signature
- **Fix:** Get new signature from `/api/withdrawal/initiate`

### "Invalid Signature"
- **Cause:** Signature doesn't match message or signer not verified
- **Fix:** Ensure backend private key is correct

### "Escrow Contract Not Solvent"
- **Cause:** Not enough GBC in escrow to pay withdrawals
- **Fix:** Fund escrow contract with GBC tokens

---

## 📊 Gas Costs (Polygon)

| Operation | Gas | Cost (MATIC) | Cost (USD) |
|-----------|-----|--------------|-----------|
| Faucet claim | 60,000 | ~0.0003 | ~$0.00012 |
| Approve | 45,000 | ~0.0002 | ~$0.00008 |
| Deposit | 80,000 | ~0.0004 | ~$0.00016 |
| Withdraw | 100,000 | ~0.0005 | ~$0.0002 |

**Total for new player (faucet + approve + deposit + withdraw):**
- ~285,000 gas
- ~$0.0006 USD
- Essentially free!

---

## 📝 Next Steps

1. **Fund Faucet Contract**
   ```bash
   # Transfer 10,000+ GBC to faucet
   npm run transfer:to-faucet -- --amount 10000
   ```

2. **Fund Escrow Contract**
   ```bash
   # Transfer 50,000+ GBC to escrow
   npm run transfer:to-escrow -- --amount 50000
   ```

3. **Verify Contracts on Polygonscan**
   ```bash
   npm run verify:contracts
   ```

4. **Deploy Event Listener**
   ```bash
   npm run listener:start
   ```

5. **Monitor Transactions**
   - Watch `/api/withdrawal/initiate` logs
   - Monitor contract events on Polygonscan
   - Alert on anomalies (replay attempts, etc.)

---

## 🎉 Success Criteria

- ✅ Faucet claims work (users get 100 GBC)
- ✅ Deposits verified on-chain (DepositEvent emitted)
- ✅ Gameplay works off-chain (instant, no gas)
- ✅ Withdrawals verified with signature (WithdrawEvent emitted)
- ✅ Nonce prevents replay attacks
- ✅ Balances reconcile between blockchain and database
- ✅ Users can complete full cycle: claim → deposit → play → withdraw

---

## 📞 Support

For issues or questions:
1. Check `/src/hooks/` for hook implementations
2. Check `/src/app/api/` for endpoint implementations
3. Check WEB3_ROADMAP.md for architecture details
4. Check `/blockchain/contracts/` for Solidity implementations

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Status:** Phase 3 Complete ✅
