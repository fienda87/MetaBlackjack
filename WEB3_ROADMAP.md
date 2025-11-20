# MetaBlackjack Web3 Integration - Complete Roadmap

**Project:** MetaBlackjack with GBC Token Economy  
**Chain:** Polygon Amoy Testnet  
**Token Contract:** `0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a`  
**Status:** Phase 1 (Game Integration) - In Progress

---

## 📋 Table of Contents

1. [Smart Contract System Overview](#1-smart-contract-system-overview)
2. [Gas-Free Betting Mechanism](#2-gas-free-betting-mechanism)
3. [Player Lifecycle](#3-player-lifecycle)
4. [System Architecture](#4-system-architecture)
5. [Security Model](#5-security-model)
6. [Smart Contract Design](#6-smart-contract-design)
7. [Backend Integration](#7-backend-integration)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Smart Contract System Overview

MetaBlackjack uses a **hybrid on-chain/off-chain** architecture with three main smart contracts:

### A. Faucet Contract

**Purpose:** Onboard new players with initial GBC tokens (airdrop)

**Features:**
- Sends small amount of GBC to new wallet (e.g., 200 GBC)
- One-time per wallet address to prevent abuse
- Automatically triggers when player connects wallet for first time
- Reduces barrier to entry for new players

**Flow:**
```
Player connects wallet
    ↓
Frontend checks if wallet claimed faucet
    ↓
If not claimed: Display "Claim 200 GBC" button
    ↓
User clicks button
    ↓
Faucet contract sends 200 GBC to wallet
    ↓
Wallet now has GBC to deposit into game
```

**Contract Requirements:**
- `owner` who can withdraw unclaimed funds
- `claimAmount` configurable (default: 200 GBC)
- `claimedAddresses` mapping to track claimed wallets
- `claim()` function with reentrancy guard

---

### B. Deposit Contract (Escrow)

**Purpose:** Hold GBC tokens in custody while player plays

**Features:**
- Receives GBC from player wallet via `approve()` + `transferFrom()`
- Keeps tokens in secure escrow during gameplay
- Emits `DepositEvent` when tokens received
- Backend listens to events and credits off-chain balance
- Supports multiple deposits from same wallet

**Flow:**
```
Player has GBC in wallet (from faucet or personal)
    ↓
Frontend: User enters deposit amount (e.g., 500 GBC)
    ↓
Step 1: MetaMask approve() - Gives contract permission
    ↓
Step 2: MetaMask deposit() - Transfers GBC to contract
    ↓
Smart Contract:
  - Checks allowance
  - Transfers tokens to contract address
  - Emits DepositEvent(player, amount, timestamp)
    ↓
Backend listens to events:
  - Receives DepositEvent
  - Queries blockchain to verify
  - Adds amount to player's off-chain balance in database
  - Updates wallet balance in game
    ↓
Player sees: "Balance: 500 GBC" in game UI
```

**Contract Requirements:**
- `deposit(uint256 amount)` function
- `DepositEvent(address indexed player, uint256 amount, uint256 timestamp)` event
- `tokenBalance` mapping to track escrow amounts
- Integration with GBCToken ERC20 contract

---

### C. Withdraw Contract

**Purpose:** Safely return GBC to player wallet with verification

**Features:**
- Verifies signature from backend (anti-cheat)
- Performs signature verification on-chain
- Transfers tokens from escrow to player wallet
- Emits `WithdrawEvent` for record
- Player pays gas fee

**Flow:**
```
Player clicks "Withdraw 300 GBC"
    ↓
Frontend sends request to backend:
  {
    playerAddress: "0x4c95...",
    amount: 300,
    finalBalance: 200  // after withdrawal
  }
    ↓
Backend validates:
  - Player exists in database
  - Requested amount ≤ off-chain balance
  - Calculate gas estimate
    ↓
Backend generates signature:
  - Signs message with backend's private key
  - Message = keccak256(abi.encodePacked(
      playerAddress, 
      amount, 
      finalBalance, 
      nonce
    ))
  - Returns { signature, nonce } to frontend
    ↓
Frontend submits to smart contract:
  withdraw(amount, finalBalance, nonce, signature)
    ↓
Smart Contract verifies:
  - Recover signer from signature
  - Check signer == backend address
  - Check nonce not already used
  - Check contract has enough GBC
    ↓
If valid:
  - Transfer GBC to player
  - Mark nonce as used
  - Emit WithdrawEvent(player, amount)
    ↓
Backend receives event:
  - Updates player's off-chain balance
  - Records withdrawal in database
    ↓
Player sees: "Withdrawn! Balance: 200 GBC"
```

**Contract Requirements:**
- `withdraw(uint256 amount, uint256 finalBalance, uint256 nonce, bytes signature)` function
- `usedNonces` mapping to prevent replay attacks
- `backendSigner` address stored in contract
- `WithdrawEvent` emission for audit trail
- ECDSA signature recovery

---

## 2. Gas-Free Betting Mechanism

### Core Principle

**All gameplay actions (bet, win, lose, balance changes) happen OFF-CHAIN without blockchain transactions.**

Only deposit/withdraw create on-chain transactions (large, infrequent).

### Why Off-Chain Gameplay?

| Aspect | On-Chain Every Bet | Off-Chain (Current) |
|--------|-------------------|-------------------|
| **Gas Cost** | $0.50 - $2.00 per bet | $0 |
| **Speed** | 10-30 seconds per action | Instant (<500ms) |
| **UX** | Slow, interrupts flow | Real-time, smooth |
| **Scalability** | Limited by blockchain | Unlimited |
| **Cost to Operator** | $5000+ daily | Negligible |

### Gameplay Flow (All Off-Chain)

```
1. BET PLACEMENT (Off-Chain)
   Player clicks "Burn 50 GBC"
   ↓
   Frontend calls: /api/game/bet
   {
     gameId: "game_123",
     playerId: "player_456",
     betAmount: 50,
     betType: "gbc"  // or "fiat"
   }
   ↓
   Backend:
   - Checks off-chain balance ≥ 50 GBC
   - Deducts 50 GBC from off-chain balance (just DB update)
   - Creates Game record with status="BETTING"
   - Returns gameId to frontend
   ↓
   Frontend: Deal cards

2. GAMEPLAY (Off-Chain)
   Player hits, stands, doubles, etc.
   ↓
   Each action → API call to /api/game/{gameId}/action
   ↓
   Backend:
   - Updates game state in database
   - Runs blackjack logic (no blockchain)
   - Tracks all moves
   ↓
   Frontend: Animate cards

3. GAME END (Off-Chain)
   Dealer's final hand determined
   ↓
   Backend calculates:
   - Winner determination
   - Payout calculation
   - New balance
   ↓
   Backend records:
   - Game result in database
   - Player's new balance
   - Bet history entry
   ↓
   Frontend: Show result modal

4. PERIODIC SETTLEMENT (Off-Chain)
   Backend maintains:
   - Player off-chain balance (in database)
   - Bet history
   - Win/loss statistics
   ↓
   Only when player deposits/withdraws → blockchain interaction
```

### Server-Side Balance Tracking

```typescript
// Database Schema (simplified)
interface PlayerBalance {
  playerId: string
  walletAddress: string
  offChainBalance: number      // In game (database)
  onChainBalance: number       // In contract (blockchain)
  totalDeposited: number       // All-time
  totalWithdrawn: number       // All-time
  pendingWithdrawal?: number   // Awaiting signature
  lastUpdated: timestamp
}

// When deposit event arrives from blockchain
function onDepositEvent(event) {
  const { playerAddress, amount } = event
  const player = await db.players.findByWallet(playerAddress)
  
  // Add to off-chain balance
  player.offChainBalance += amount
  player.onChainBalance += amount
  player.totalDeposited += amount
  
  await db.players.save(player)
  await db.logs.create({
    type: 'DEPOSIT',
    playerId: player.id,
    amount,
    txHash: event.transactionHash,
    timestamp: now()
  })
}

// When player wins a bet
function onGameEnd(game) {
  const { playerId, betAmount, result, payout } = game
  const player = await db.players.findById(playerId)
  
  // Update off-chain balance only
  if (result === 'WIN') {
    player.offChainBalance += payout
  }
  // If loss, already deducted at bet time
  
  await db.players.save(player)
  await db.bets.create({
    playerId,
    gameId: game.id,
    betAmount,
    result,
    payout: result === 'WIN' ? payout : 0,
    timestamp: now()
  })
}

// When player requests withdrawal
async function initiateWithdraw(playerId, amount) {
  const player = await db.players.findById(playerId)
  
  // Validate
  if (player.offChainBalance < amount) {
    throw new Error('Insufficient balance')
  }
  
  // Create withdrawal record
  const withdrawal = await db.withdrawals.create({
    playerId,
    amount,
    status: 'PENDING_SIGNATURE',
    requestedAt: now()
  })
  
  // Generate signature
  const nonce = await getNextNonce(playerId)
  const messageHash = solidityKeccak256(
    ['address', 'uint256', 'uint256', 'uint256'],
    [player.walletAddress, amount, player.offChainBalance - amount, nonce]
  )
  
  const signature = signMessage(messageHash, BACKEND_PRIVATE_KEY)
  
  return {
    amount,
    finalBalance: player.offChainBalance - amount,
    nonce,
    signature,
    withdrawalId: withdrawal.id
  }
}

// After withdrawal confirmed on-chain
function onWithdrawEvent(event) {
  const { playerAddress, amount } = event
  const player = await db.players.findByWallet(playerAddress)
  
  // Deduct from both balances
  player.offChainBalance -= amount
  player.onChainBalance -= amount
  player.totalWithdrawn += amount
  
  await db.players.save(player)
}
```

---

## 3. Player Lifecycle

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    METABLACKJACK PLAYER LIFECYCLE                   │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: ONBOARDING
═══════════════════════════════════════════════════════════════════════

1. Player visits metablackjack.com
   ├─ Frontend: Render ConnectWalletButton
   └─ No blockchain call yet

2. Player clicks "Connect Wallet"
   ├─ MetaMask prompts
   ├─ Player approves connection
   └─ Frontend gets wallet address (0x4c95...)

3. Player clicks "Sign In"
   ├─ MetaMask: "Sign message" prompt
   ├─ Player signs message (off-chain, no gas)
   ├─ Frontend sends signature to /api/auth/web3-login
   ├─ Backend verifies signature and creates session
   └─ Player logged in ✓

4. [OPTIONAL] Player claims faucet
   ├─ Frontend: Check if wallet claimed faucet
   ├─ If not: Show "Claim 100 GBC Free" button
   ├─ Player clicks button
   ├─ Faucet contract sends 100 GBC to wallet
   ├─ MetaMask: Gas fee (~$0.01)
   └─ Wallet now has 100 GBC

5. Player deposits GBC
   ├─ Frontend: User enters "500 GBC"
   ├─ Step 1: MetaMask approve() → Faucet contract to use 500 GBC
   │          Gas: ~$0.02
   ├─ Step 2: MetaMask deposit() → Send 500 GBC to deposit contract
   │          Gas: ~$0.05
   ├─ On-chain: Deposit contract receives 500 GBC
   ├─ Event: DepositEvent emitted
   ├─ Backend: Listens to event, credits 500 GBC to off-chain balance
   └─ UI: "Balance: 500 GBC" ✓

Phase 2: GAMEPLAY (All Off-Chain)
═══════════════════════════════════════════════════════════════════════

1. Player plays blackjack
   ├─ Click "Bet 50 GBC"
   ├─ Frontend API: POST /api/game/bet { amount: 50 }
   ├─ Backend: Deduct 50 from off-chain balance (DB update only)
   ├─ Backend: Deal cards
   ├─ No blockchain call
   ├─ No gas fee
   └─ Total time: <500ms ✓

2. Player hits/stands/doubles
   ├─ Each action → API call
   ├─ Backend updates game state (off-chain)
   ├─ No blockchain
   ├─ Instant response
   └─ Smooth UX ✓

3. Game ends
   ├─ Backend calculates result (WIN/LOSE/PUSH)
   ├─ Updates off-chain balance
   ├─ Records bet history
   ├─ No blockchain call
   └─ Result shown instantly ✓

4. Repeat: Play many games
   └─ All off-chain, instant, no gas

Phase 3: WITHDRAWAL
═══════════════════════════════════════════════════════════════════════

1. Player accumulated balance: 750 GBC
   ├─ Won several games
   └─ All recorded off-chain

2. Player clicks "Withdraw 750 GBC"
   ├─ Frontend: Request withdrawal from backend
   ├─ Backend: Verify balance (750 ≥ 750) ✓
   ├─ Backend: Generate signature
   │           - Nonce: 1
   │           - Message: hash(0x4c95..., 750, 0, 1)
   │           - Signature: backend's signature
   └─ Return { signature, nonce } to frontend

3. Frontend calls withdraw contract
   ├─ MetaMask: withdraw(750, 0, 1, signature)
   ├─ Gas fee: ~$0.10
   └─ Sends prompt to player

4. On-chain verification
   ├─ Smart contract recovers signer from signature
   ├─ Verify: signer == backend address ✓
   ├─ Verify: nonce not used before ✓
   ├─ Verify: contract has 750 GBC ✓
   └─ All checks pass → Transfer tokens

5. Withdrawal completes
   ├─ Transfer: 750 GBC from contract → player wallet
   ├─ On-chain: ✓ Tokens in player wallet
   ├─ Event: WithdrawEvent emitted
   ├─ Backend: Deduct 750 from off-chain balance
   ├─ Backend: Record withdrawal in history
   └─ UI: "Withdrawn! Wallet balance: 750 GBC" ✓

6. Player can repeat
   ├─ Withdraw more
   ├─ Play more games
   └─ Deposit again

Phase 4: [FUTURE] Minting Rewards
════════════════════════════════════════════════════════════════════════

[Not yet implemented - for future consideration]

Option A: Mint on Withdrawal
  - When player withdraws, backend can call mintGameReward()
  - Bonus GBC reward for loyal players
  - Alternative: Mint small bonus on each win (via backend service)

Option B: Daily Rewards
  - Backend cron job: Daily batch minting
  - Distribute rewards to active players
  - Requires authorized backend wallet (addGameMinter)
```

---

## 4. System Architecture

### High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          METABLACKJACK SYSTEM                        │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐         ┌────────────────────────┐
│   FRONTEND (Browser)   │         │     BACKEND (Node.js)  │
├────────────────────────┤         ├────────────────────────┤
│ • ConnectWalletButton  │────────▶│ • Auth API             │
│ • GameTable            │◀────────│ • Game Logic           │
│ • BettingControls      │         │ • Balance Management   │
│ • useWeb3Auth          │         │ • Database (Prisma)    │
│ • useGameBet           │         │ • WebSocket events     │
│ • useGBCBalance        │         │ • Blockchain listener  │
│ • useGBCBurn           │         │ • Withdrawal signature │
└────────────────────────┘         └────────────────────────┘
         │                                     │
         │                    ┌────────────────┼────────────────┐
         │                    │                │                │
         │                    ▼                ▼                ▼
         │              ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │              │  Blockchain  │ │  Database    │ │  Redis       │
         │              │  (Polygon)   │ │  (PostgreSQL)│ │  (Sessions)  │
         │              └──────────────┘ └──────────────┘ └──────────────┘
         │                    │
         │                    │
         └────────────────────┼────────────────┐
                              │                │
                              ▼                ▼
                    ┌──────────────────┐ ┌──────────────────┐
                    │  Smart Contracts │ │  Event Listener  │
                    │                  │ │  (ethers.js)     │
                    ├──────────────────┤ ├──────────────────┤
                    │ • GBCToken       │ │ • Monitors logs  │
                    │ • Faucet         │ │ • Triggers sync  │
                    │ • Deposit        │ │ • DB updates     │
                    │ • Withdraw       │ └──────────────────┘
                    └──────────────────┘

FLOW SUMMARY
════════════════════════════════════════════════════════════════════════

ON-CHAIN (Blockchain)          OFF-CHAIN (Server)         CLIENT (Browser)
─────────────────              ──────────────             ────────────────

Faucet Contract
  |
  └─ Receives claim()          Backend tracks claimed     Frontend shows button
  └─ Emits event ────────────▶ Updates database
  └─ Transfers 100 GBC ──────▶ Records in logs

Deposit Contract
  |
  └─ Receives deposit()        Backend listens           Frontend: Enter amount
  └─ Emits DepositEvent ──────▶ Updates off-chain balance UI: Balance updates
  └─ Holds tokens in escrow    Stores in database

[GAMEPLAY - ALL OFF-CHAIN]
  ┌─ No blockchain ────────────▶ Bet, play, win/lose ────▶ Instant UI
  │                             All stored in database      No gas fees
  └─────────────────────────────────────────────────────────────────

Withdraw Contract
  |
  └─ Receives withdraw()       Backend creates signature Frontend: Request withdraw
     with signature            Verifies message hash      MetaMask: Confirm tx
  └─ ECDSA recovery           Deducts from balance       UI: Confirmed ✓
  └─ Transfers GBC ──────────▶ Records withdrawal
  └─ Emits WithdrawEvent
```

### Component Interactions

```typescript
// FRONTEND → BACKEND → BLOCKCHAIN

// 1. Authentication
Frontend.ConnectWallet()
  ↓
Frontend.useWeb3Auth().signIn()
  ↓
POST /api/auth/web3-login { signature, message }
  ↓
Backend.verifyMessage(message, signature)
  ↓
Backend.createSession(wallet)
  ↓
Frontend.localStorage['mb_web3_session']

// 2. Deposit
Frontend.useGameBet().placeBet(50)
  ↓
MetaMask.approve(DepositContract, 50)
  ↓
MetaMask.deposit(50)
  ↓
DepositContract.deposit(50)
  ↓
Blockchain: Transfer 50 GBC from wallet → contract
  ↓
DepositEvent emitted
  ↓
Backend.eventListener.onDepositEvent()
  ↓
Database: player.offChainBalance += 50
  ↓
Frontend: useGBCBalance() refreshes (hooks query player balance API)

// 3. Gameplay (All Off-Chain)
Frontend.GameTable.handlePlaceBet(50)
  ↓
POST /api/game/bet { amount: 50 }
  ↓
Backend.deductBalance(playerId, 50)
  ↓
Backend.startGame()
  ↓
Response: { gameId, playerCards, dealerCard }
  ↓
Frontend.updateGameState()
  ↓
Backend: No blockchain call
  ↓
[Repeat for each action: hit, stand, etc.]

// 4. Withdrawal
Frontend.RequestWithdraw(750)
  ↓
POST /api/withdrawal/initiate { amount: 750 }
  ↓
Backend.verifyBalance()
  ↓
Backend.generateSignature()
  ↓
Response: { signature, nonce, finalBalance }
  ↓
Frontend.WithdrawContract.withdraw(750, 0, nonce, signature)
  ↓
MetaMask: Confirm withdrawal tx (gas fee)
  ↓
WithdrawContract.withdraw()
  ↓
Blockchain: Verify signature (ECDSA)
  ↓
Transfer: 50 GBC to wallet
  ↓
WithdrawEvent emitted
  ↓
Backend.eventListener.onWithdrawEvent()
  ↓
Database: player.offChainBalance -= 750
  ↓
Frontend: Toast "Withdrawn!"
```

---

## 5. Security Model

### Attack Vectors & Mitigations

#### 5.1 Signature Verification (Withdraw)

**Risk:** Attacker submits fake withdrawal signature

**Mitigation:**
```solidity
// Contract-side verification
address signer = ecrecover(
    messageHash,
    signature.v,
    signature.r,
    signature.s
);

require(signer == backendSigner, "Invalid signature");
```

**Backend Signing:**
```typescript
import { ethers } from 'ethers'

function generateWithdrawalSignature(
  playerAddress: string,
  amount: number,
  finalBalance: number,
  nonce: number
) {
  // Create message hash (same as contract)
  const messageHash = ethers.solidityKeccak256(
    ['address', 'uint256', 'uint256', 'uint256'],
    [playerAddress, ethers.parseUnits(amount.toString(), 18), finalBalance, nonce]
  )
  
  // Sign with backend private key
  const signer = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY)
  const signature = signer.signMessageSync(messageHash)
  
  return { signature, messageHash }
}
```

---

#### 5.2 Nonce-Based Replay Attack Prevention

**Risk:** Attacker replays old withdrawal signature multiple times

**Mitigation:**
```solidity
// Track used nonces
mapping(uint256 => bool) public usedNonces;

function withdraw(
  uint256 amount,
  uint256 finalBalance,
  uint256 nonce,
  bytes memory signature
) external {
  require(!usedNonces[nonce], "Nonce already used");
  
  // ... signature verification ...
  
  usedNonces[nonce] = true;
  // ... transfer tokens ...
}
```

---

#### 5.3 Off-Chain Balance Tampering

**Risk:** Player modifies balance in database

**Mitigation:**
- Database access: Only via authenticated APIs
- Immutable logs: All transactions recorded in `transactions` table
- Audit trail: Every balance change logged with timestamp
- Verification: On withdrawal, contract re-verifies on-chain balance

```typescript
// Database schema with audit trail
interface Transaction {
  id: string
  playerId: string
  type: 'BET' | 'WIN' | 'LOSE' | 'DEPOSIT' | 'WITHDRAW'
  amount: number
  balanceBefore: number
  balanceAfter: number
  gameId?: string
  txHash?: string  // blockchain tx if deposit/withdraw
  timestamp: timestamp
  signature?: string  // verified at creation
}

// Every balance update is immutable
async function recordTransaction(tx: Transaction) {
  // Calculate balance
  const previous = await db.transactions
    .where({ playerId: tx.playerId })
    .orderBy('timestamp', 'desc')
    .first()
  
  // Validate balance change
  if (previous && previous.balanceAfter !== tx.balanceBefore) {
    throw new Error('Balance mismatch - possible tampering')
  }
  
  // Store immutable record
  await db.transactions.create(tx)
}
```

---

#### 5.4 Faucet Abuse Prevention

**Risk:** Single wallet claims faucet multiple times

**Mitigation:**
```solidity
mapping(address => bool) public hasClaimed;
mapping(address => uint256) public claimTime;

function claim() external {
  require(!hasClaimed[msg.sender], "Already claimed");
  require(block.timestamp >= claimTime[msg.sender] + 30 days, "Too soon");
  
  hasClaimed[msg.sender] = true;
  claimTime[msg.sender] = block.timestamp;
  
  token.transfer(msg.sender, CLAIM_AMOUNT);
  emit Claim(msg.sender, CLAIM_AMOUNT);
}
```

Frontend also checks:
```typescript
// Check if wallet already claimed
const response = await fetch('/api/faucet/status?wallet=' + address)
const { canClaim, lastClaim } = await response.json()

if (!canClaim) {
  showMessage(`Already claimed. Next claim: ${lastClaim}`)
}
```

---

#### 5.5 Front-Running Prevention

**Risk:** Attacker sees pending tx and submits higher gas to jump queue

**Mitigation:**
- Private mempool: Use private RPC endpoint (Flashbots Protect, Alchemy Private TX)
- Batching: Combine multiple user transactions
- Commitment scheme: Hash-based commits on lower-risk ops

For withdrawal:
```typescript
// Backend generates nonce that changes with each request
// Old signatures invalid
// Contract checks nonce hasn't been used
// Makes replay impossible
```

---

#### 5.6 Event Listener Reliability

**Risk:** Backend misses blockchain events, balances get out of sync

**Mitigation:**
```typescript
// Persistent event listener with checkpoint
class BlockchainListener {
  async startListening() {
    // Get last checkpoint from database
    let lastBlock = await db.checkpoints.get('deposit_events')
    
    // Listen from checkpoint onwards
    depositContract.on('DepositEvent', (event) => {
      this.handleDepositEvent(event)
    }, lastBlock)
  }
  
  async handleDepositEvent(event) {
    // Store event
    await db.blockchainEvents.create(event)
    
    // Update database
    await db.players.update(event.player, {
      offChainBalance: +event.amount
    })
    
    // Update checkpoint
    await db.checkpoints.set('deposit_events', event.blockNumber)
  }
  
  // Periodic reconciliation
  async reconcile() {
    // Check database balance vs. contract balance
    const dbTotal = await db.players.sum('offChainBalance')
    const contractBalance = await depositContract.totalBalance()
    
    if (dbTotal !== contractBalance) {
      // Alert and log discrepancy
      console.error('Balance mismatch detected!', {
        database: dbTotal,
        contract: contractBalance
      })
      
      // Trigger manual audit
      await alertAdmins()
    }
  }
}

// Run reconciliation hourly
setInterval(() => listener.reconcile(), 60 * 60 * 1000)
```

---

### Data Integrity

All critical data hashed and verified:

```typescript
// On every balance update
interface VerifiedTransaction {
  playerId: string
  balanceBefore: number
  balanceAfter: number
  operation: string
  hash: string  // SHA256 of above
  signature: string  // Signed by backend with private key
  timestamp: number
}

function createVerifiedTransaction(tx) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      playerId: tx.playerId,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      operation: tx.operation,
      timestamp: tx.timestamp
    }))
    .digest('hex')
  
  const signature = signWithBackendKey(hash)
  
  return { ...tx, hash, signature }
}
```

---

## 6. Smart Contract Design

### Contract Architecture

Three separate contracts for separation of concerns:

#### 6.1 Faucet Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GBCFaucet is Ownable, ReentrancyGuard {
    IERC20 public gbcToken;
    uint256 public constant CLAIM_AMOUNT = 100 * 10**18; // 100 GBC
    uint256 public constant CLAIM_COOLDOWN = 1 days;
    
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public lastClaimTime;
    
    event Claim(address indexed claimer, uint256 amount);
    
    constructor(address _gbcToken) {
        gbcToken = IERC20(_gbcToken);
    }
    
    function claim() external nonReentrant {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN,
            "Claim cooldown not met"
        );
        
        hasClaimed[msg.sender] = true;
        lastClaimTime[msg.sender] = block.timestamp;
        
        require(
            gbcToken.transfer(msg.sender, CLAIM_AMOUNT),
            "Transfer failed"
        );
        
        emit Claim(msg.sender, CLAIM_AMOUNT);
    }
    
    function canClaim(address user) external view returns (bool) {
        if (hasClaimed[user]) {
            return block.timestamp >= lastClaimTime[user] + CLAIM_COOLDOWN;
        }
        return true;
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = gbcToken.balanceOf(address(this));
        require(gbcToken.transfer(owner(), balance), "Transfer failed");
    }
}
```

**Key Features:**
- Simple, minimal gas
- No complex logic
- Reentrancy guard
- Cooldown period
- Owner can recover funds

---

#### 6.2 Deposit Contract (Escrow)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DepositEscrow is Ownable, ReentrancyGuard {
    IERC20 public gbcToken;
    
    mapping(address => uint256) public escrowBalance;
    
    event Deposit(address indexed player, uint256 amount, uint256 timestamp);
    
    constructor(address _gbcToken) {
        gbcToken = IERC20(_gbcToken);
    }
    
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer from player to contract
        require(
            gbcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        escrowBalance[msg.sender] += amount;
        
        emit Deposit(msg.sender, amount, block.timestamp);
    }
    
    function getBalance(address player) external view returns (uint256) {
        return escrowBalance[player];
    }
    
    function totalEscrow() external view returns (uint256) {
        return gbcToken.balanceOf(address(this));
    }
}
```

**Key Features:**
- Holds tokens during gameplay
- No withdrawal logic (separate contract)
- Emits deposit event for backend
- Simple and secure

---

#### 6.3 Withdraw Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GameWithdraw is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    IERC20 public gbcToken;
    address public backendSigner;
    
    mapping(uint256 => bool) public usedNonces;
    
    event Withdraw(address indexed player, uint256 amount, uint256 timestamp);
    
    constructor(address _gbcToken, address _backendSigner) {
        gbcToken = IERC20(_gbcToken);
        backendSigner = _backendSigner;
    }
    
    function withdraw(
        address payable player,
        uint256 amount,
        uint256 finalBalance,
        uint256 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(!usedNonces[nonce], "Nonce already used");
        
        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(player, amount, finalBalance, nonce)
        );
        
        bytes32 signedHash = messageHash.toEthSignedMessageHash();
        address signer = signedHash.recover(signature);
        
        require(signer == backendSigner, "Invalid signature");
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Transfer tokens
        require(
            gbcToken.transfer(player, amount),
            "Transfer failed"
        );
        
        emit Withdraw(player, amount, block.timestamp);
    }
    
    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = gbcToken.balanceOf(address(this));
        require(gbcToken.transfer(owner(), balance), "Transfer failed");
    }
}
```

**Key Features:**
- ECDSA signature verification
- Nonce replay prevention
- Backend-controlled withdrawals
- Emergency admin override
- Minimal logic (gas efficient)

---

### Gas Optimization

| Operation | Gas | Cost (Polygon) |
|-----------|-----|----------------|
| Faucet claim | 60,000 | ~$0.01 |
| Deposit | 80,000 | ~$0.02 |
| Withdraw | 100,000 | ~$0.05 |
| **Total onboarding** | ~240,000 | ~$0.08 |
| **Per gameplay** | **0** | **$0** |

---

## 7. Backend Integration

### API Endpoints

#### Authentication
```
POST /api/auth/web3-login
  Request: { address, signature, message, timestamp }
  Response: { session, authenticated, user }
  
GET /api/auth/web3-session
  Response: { authenticated, user, session }
```

#### Faucet
```
GET /api/faucet/status?wallet=0x...
  Response: { canClaim, lastClaim, claimAmount }
  
POST /api/faucet/claim
  Request: { walletAddress }
  Response: { txHash, status }
```

#### Deposit
```
GET /api/deposit/balance?wallet=0x...
  Response: { onChainBalance, offChainBalance }
  
POST /api/deposit/initiate
  Request: { amount }
  Response: { allowanceRequired, txId }
```

#### Gameplay
```
POST /api/game/bet
  Request: { betAmount, betType }
  Response: { gameId, playerCards, dealerCard }
  
POST /api/game/{gameId}/action
  Request: { action: 'hit' | 'stand' | 'double' }
  Response: { gameState, playerCards, dealerCards }
  
GET /api/game/{gameId}/result
  Response: { result, payout, newBalance }
```

#### Withdrawal
```
POST /api/withdrawal/initiate
  Request: { amount }
  Response: { signature, nonce, finalBalance }
  
POST /api/withdrawal/confirm
  Request: { txHash }
  Response: { status, newBalance }
  
GET /api/withdrawal/history
  Response: { withdrawals: [{ amount, date, status }] }
```

### Event Listener (Node.js)

```typescript
// src/lib/blockchain-listener.ts

import { ethers } from 'ethers'
import { PrismaClient } from '@prisma/client'

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const prisma = new PrismaClient()

const DEPOSIT_CONTRACT = process.env.DEPOSIT_CONTRACT_ADDRESS
const WITHDRAW_CONTRACT = process.env.WITHDRAW_CONTRACT_ADDRESS

const depositABI = [/* ... */]
const withdrawABI = [/* ... */]

const depositContract = new ethers.Contract(
  DEPOSIT_CONTRACT,
  depositABI,
  provider
)

const withdrawContract = new ethers.Contract(
  WITHDRAW_CONTRACT,
  withdrawABI,
  provider
)

// Listen to deposit events
depositContract.on('Deposit', async (player, amount, timestamp, event) => {
  console.log(`Deposit received: ${player} -> ${amount}`)
  
  try {
    const player_record = await prisma.player.findUnique({
      where: { walletAddress: player }
    })
    
    if (!player_record) {
      console.log(`Player not found: ${player}`)
      return
    }
    
    // Update off-chain balance
    await prisma.player.update({
      where: { id: player_record.id },
      data: {
        offChainBalance: {
          increment: BigInt(amount.toString())
        },
        onChainBalance: {
          increment: BigInt(amount.toString())
        }
      }
    })
    
    // Record transaction
    await prisma.transaction.create({
      data: {
        playerId: player_record.id,
        type: 'DEPOSIT',
        amount: BigInt(amount.toString()),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(timestamp * 1000)
      }
    })
    
    console.log(`Updated ${player_record.username} balance`)
  } catch (error) {
    console.error('Error processing deposit:', error)
  }
})

// Listen to withdraw events
withdrawContract.on('Withdraw', async (player, amount, timestamp, event) => {
  console.log(`Withdrawal confirmed: ${player} <- ${amount}`)
  
  try {
    const player_record = await prisma.player.findUnique({
      where: { walletAddress: player }
    })
    
    if (!player_record) {
      console.log(`Player not found: ${player}`)
      return
    }
    
    // Update off-chain balance
    await prisma.player.update({
      where: { id: player_record.id },
      data: {
        offChainBalance: {
          decrement: BigInt(amount.toString())
        },
        onChainBalance: {
          decrement: BigInt(amount.toString())
        }
      }
    })
    
    // Record transaction
    await prisma.transaction.create({
      data: {
        playerId: player_record.id,
        type: 'WITHDRAW',
        amount: BigInt(amount.toString()),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(timestamp * 1000)
      }
    })
    
    console.log(`Confirmed ${player_record.username} withdrawal`)
  } catch (error) {
    console.error('Error processing withdrawal:', error)
  }
})

console.log('Blockchain listener started')
```

---

## 8. Implementation Roadmap

### Phase 1: ✅ Game Integration (Current)
- [x] GBC token deployed
- [x] Web3Auth hook created
- [x] Connect Wallet button
- [x] useGameBet hook
- [x] GBC betting UI
- [x] Backend auth API
- [ ] Test on Polygon Amoy

**Target:** This week

---

### Phase 2: Smart Contracts Deployment
- [ ] Deploy Faucet contract
- [ ] Deploy Deposit contract
- [ ] Deploy Withdraw contract
- [ ] Verify contracts on Polygonscan
- [ ] Update frontend with contract addresses

**Estimated:** Next week

---

### Phase 3: Deposit/Withdraw Flow
- [ ] Create `/api/deposit/initiate` endpoint
- [ ] Create `/api/withdrawal/initiate` endpoint
- [ ] Implement signature generation in backend
- [ ] Test full deposit flow
- [ ] Test full withdrawal flow
- [ ] Add deposit/withdraw UI to frontend

**Estimated:** Week after next

---

### Phase 4: Blockchain Event Listener
- [ ] Set up event listener service
- [ ] Implement deposit event handler
- [ ] Implement withdrawal event handler
- [ ] Add database transaction logging
- [ ] Create reconciliation job
- [ ] Monitor for discrepancies

**Estimated:** Following week

---

### Phase 5: Backend Minting (Future)
- [ ] Register backend as game minter (addGameMinter)
- [ ] Create `/api/rewards/mint` endpoint
- [ ] Implement batch minting job
- [ ] Add reward history tracking
- [ ] Display earned rewards in UI

**Estimated:** Optional / Phase 2

---

### Phase 6: Testing & Audit
- [ ] Security audit (optional)
- [ ] Load testing
- [ ] User acceptance testing
- [ ] Mainnet preparation
- [ ] Launch checklist

**Estimated:** Before mainnet

---

## 📊 Database Schema

### Players Table
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  walletAddress VARCHAR(42) UNIQUE,  -- Ethereum address
  email VARCHAR(255),
  offChainBalance BIGINT DEFAULT 0,  -- In Wei (GBC)
  onChainBalance BIGINT DEFAULT 0,   -- In Wei (GBC)
  totalDeposited BIGINT DEFAULT 0,
  totalWithdrawn BIGINT DEFAULT 0,
  totalWonAsNative BIGINT DEFAULT 0,
  faucetClaimed BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  playerId UUID NOT NULL REFERENCES players(id),
  type ENUM('BET', 'WIN', 'LOSE', 'DEPOSIT', 'WITHDRAW'),
  amount BIGINT,
  balanceBefore BIGINT,
  balanceAfter BIGINT,
  gameId VARCHAR(255),
  txHash VARCHAR(255),  -- Blockchain tx hash
  blockNumber BIGINT,
  metadata JSONB,  -- Additional data
  createdAt TIMESTAMP DEFAULT NOW(),
  
  INDEX (playerId, createdAt),
  INDEX (type),
  UNIQUE (txHash)  -- Prevent duplicate events
);
```

### Withdrawals Table
```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY,
  playerId UUID NOT NULL REFERENCES players(id),
  amount BIGINT NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'FAILED'),
  nonce BIGINT,
  signature VARCHAR(255),
  txHash VARCHAR(255),
  requestedAt TIMESTAMP DEFAULT NOW(),
  confirmedAt TIMESTAMP,
  
  INDEX (playerId, status),
  UNIQUE (nonce)  -- Prevent nonce reuse
);
```

---

## 🔍 Monitoring & Alerts

```typescript
// Monitor for anomalies
async function monitorBalances() {
  setInterval(async () => {
    // Check for unauthorized balance changes
    const suspiciousTransactions = await prisma.transaction.findMany({
      where: {
        AND: [
          { type: 'WIN' },
          { amount: { gt: 100000 * 10**18 } }  // > 100,000 GBC in single bet
        ]
      },
      take: 10
    })
    
    if (suspiciousTransactions.length > 0) {
      await alertAdmins({
        subject: 'Suspicious transactions detected',
        transactions: suspiciousTransactions
      })
    }
    
    // Check balance reconciliation
    const dbTotal = await prisma.player.aggregate({
      _sum: { offChainBalance: true }
    })
    
    const contractTotal = await depositContract.totalEscrow()
    
    if (Math.abs(dbTotal._sum.offChainBalance - contractTotal) > 100 * 10**18) {
      await alertAdmins({
        subject: 'Balance mismatch detected',
        databaseTotal: dbTotal._sum.offChainBalance,
        contractTotal: contractTotal
      })
    }
  }, 60 * 60 * 1000)  // Every hour
}
```

---

## 🎯 Success Metrics

- ✅ **Zero exploits** during testing
- ✅ **<500ms** gameplay latency
- ✅ **<$0.10** total gas per new player (faucet + first deposit)
- ✅ **>99.9%** balance reconciliation accuracy
- ✅ **100%** signature verification success rate
- ✅ **Zero** replay attacks on withdrawal

---

## 📝 Summary

MetaBlackjack achieves a **hybrid on-chain/off-chain model**:

| Aspect | On-Chain | Off-Chain |
|--------|----------|-----------|
| **Deposit** | ✓ One-time | - |
| **Bet/Play** | - | ✓ Instant |
| **Win/Lose** | - | ✓ Recorded |
| **Withdraw** | ✓ One-time | - |
| **Balance** | On contract | In database |
| **Speed** | Slow (30s) | Fast (<1s) |
| **Cost** | $0.02-0.10 | Free |

This design balances:
- **Security:** Blockchain validates deposits/withdrawals
- **UX:** Gameplay is instant and gas-free
- **Scalability:** Off-chain can handle millions of plays
- **Cost:** Minimal gas for infrequent on-chain ops

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Status:** In Progress - Phase 1 (Game Integration) Active
