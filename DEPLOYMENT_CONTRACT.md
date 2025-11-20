# Smart Contract Deployment Guide

## 🎯 Overview

This guide covers deploying the GBC Token (GOBOG COIN) smart contract to Polygon Amoy testnet for MetaBlackjack game integration.

## 📋 Prerequisites

### 1. MetaMask Wallet Setup
- Install MetaMask browser extension
- Create/import a wallet
- **Export private key** (Settings → Security & Privacy → Show Private Key)
- ⚠️ **NEVER share your private key!**

### 2. Get Test MATIC
- Visit: https://faucet.polygon.technology/
- Connect your wallet
- Select "Polygon Amoy" network
- Request test MATIC (needed for gas fees)
- Wait 1-2 minutes for tokens to arrive

### 3. Polygonscan API Key (Optional, for verification)
- Visit: https://polygonscan.com/myapikey
- Sign up/login
- Create new API key
- Copy the key for later use

## 🔧 Installation

### Step 1: Install Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
```

This installs:
- **hardhat**: Ethereum development environment
- **@nomicfoundation/hardhat-toolbox**: All-in-one toolbox (ethers, waffle, etc.)
- **dotenv**: Environment variable management

### Step 2: Setup Environment Variables

1. Copy the example file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and fill in:
```env
# Your MetaMask private key (WITHOUT 0x prefix)
PRIVATE_KEY=abc123def456... 

# Optional: For contract verification on Polygonscan
POLYGONSCAN_API_KEY=YOUR_API_KEY

# Optional: Game server wallet to authorize as minter
GAME_SERVER_ADDRESS=0x...

# Will be filled after deployment
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=
```

**Security Notes:**
- ✅ `.env.local` is already in `.gitignore`
- ❌ NEVER commit `.env.local` to git
- ❌ NEVER share your private key
- ✅ Use a separate wallet for development/testing

## 🚀 Deployment Process

### Step 1: Compile Contract

```bash
npm run contract:compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

This generates:
- `/artifacts` - Compiled contract bytecode
- `/cache` - Build cache (both in gitignore)

### Step 2: Deploy to Polygon Amoy

```bash
npm run contract:deploy
```

Expected output:
```
🚀 Starting GBC Token deployment to Polygon Amoy...
📝 Deploying with account: 0x1234...5678
💰 Account balance: 0.5 MATIC

📦 Deploying GBCToken contract...
✅ GBCToken deployed to: 0xABCD...EFGH
💎 Initial supply: 10000000.0 GBC
📋 Token: GOBOG COIN (GBC), Decimals: 18

🎮 Adding game server as authorized minter...
✅ Game server added: 0x...

🔍 Waiting for block confirmations before verification...
📝 Verifying contract on Polygonscan...
✅ Contract verified successfully!

=============================================================
🎉 DEPLOYMENT COMPLETE!
=============================================================

📋 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract Address:     0xABCD...EFGH
Network:              Polygon Amoy (Chain ID: 80002)
Explorer:             https://amoy.polygonscan.com/address/0xABCD...EFGH
Deployer:             0x1234...5678
Initial Supply:       10000000.0 GBC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Update Environment

Add the deployed contract address to `.env.local`:
```env
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0xABCD...EFGH
```

Restart your development server:
```bash
npm run dev
```

## 🦊 MetaMask Configuration

### Add Polygon Amoy Network

If not already added, MetaMask will prompt you automatically when connecting. Or manually:

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Enter details:
   - **Network Name:** Polygon Amoy Testnet
   - **RPC URL:** https://rpc-amoy.polygon.technology
   - **Chain ID:** 80002
   - **Currency Symbol:** MATIC
   - **Block Explorer:** https://amoy.polygonscan.com

### Import GBC Token

1. Switch to Polygon Amoy network
2. Click "Import tokens" at bottom
3. Enter:
   - **Token Address:** `0xABCD...EFGH` (your deployed address)
   - **Symbol:** GBC
   - **Decimals:** 18 (auto-fills)
4. Click "Add Custom Token"

You should see **10,000,000 GBC** in your wallet! 🎉

## 📝 Contract Details

### GBCToken Contract

**File:** `contracts/GBCToken.sol`

**Key Features:**
- **Token Name:** GOBOG COIN
- **Symbol:** GBC
- **Decimals:** 18
- **Initial Supply:** 10,000,000 GBC (minted to deployer)
- **Standard:** ERC20 (OpenZeppelin)

### Game-Specific Functions

#### For Game Server (Authorized Minters)

```solidity
// Mint rewards to winning players
function mintGameReward(address to, uint256 amount) external onlyGameMinter
```

Example: Player wins 100 GBC blackjack hand
```javascript
await gbcToken.mintGameReward(playerAddress, ethers.parseEther("100"));
```

#### For Players

```solidity
// Burn tokens when placing bets
function burnGameLoss(uint256 amount) external
```

Example: Player bets 50 GBC
```javascript
await gbcToken.burnGameLoss(ethers.parseEther("50"));
```

#### For Owner (Admin)

```solidity
// Authorize game servers to mint rewards
function addGameMinter(address minter) external onlyOwner

// Remove authorization
function removeGameMinter(address minter) external onlyOwner

// Emergency pause minting
function setMintingEnabled(bool enabled) external onlyOwner

// Emergency mint (bypasses minter authorization)
function emergencyMint(address to, uint256 amount) external onlyOwner
```

## 🔍 Contract Verification

### Manual Verification (if auto-verify fails)

```bash
npx hardhat verify --network polygonAmoy 0xYourContractAddress
```

### View on Polygonscan

Visit: `https://amoy.polygonscan.com/address/0xYourContractAddress`

You'll see:
- ✅ Contract code verified
- All transactions
- Token holders
- Read/Write contract functions

## 🧪 Testing Deployment

### Test 1: Check Balance

```javascript
import { useBalance } from 'wagmi';

const { data: balance } = useBalance({
  address: '0xYourAddress',
  token: '0xYourGBCTokenAddress',
});

console.log(balance?.formatted); // "10000000.0"
```

### Test 2: Transfer Tokens

In MetaMask:
1. Go to GBC token
2. Click "Send"
3. Enter recipient address
4. Enter amount (e.g., 1000 GBC)
5. Confirm transaction

### Test 3: Check on Polygonscan

Visit your address on Polygonscan to see:
- GBC token balance
- Transfer history
- All transactions

## 🎮 Game Integration

### Phase 1: Display Balance (Next Step)

Create `src/hooks/useGBCBalance.ts`:
```typescript
import { useReadContract } from 'wagmi';
import { CONTRACTS, GBC_TOKEN_ABI } from '@/lib/web3-config';

export function useGBCBalance(address?: string) {
  return useReadContract({
    address: CONTRACTS.GBC_TOKEN,
    abi: GBC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
}
```

### Phase 2: Bet Deduction

When player places bet:
```typescript
import { useWriteContract } from 'wagmi';

const { writeContract } = useWriteContract();

// Player bets 100 GBC
await writeContract({
  address: CONTRACTS.GBC_TOKEN,
  abi: GBC_TOKEN_ABI,
  functionName: 'burnGameLoss',
  args: [parseEther('100')],
});
```

### Phase 3: Reward Minting (Server-Side)

Backend service mints rewards:
```typescript
// server/lib/web3-rewards.ts
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC);
const signer = new ethers.Wallet(process.env.GAME_SERVER_PRIVATE_KEY, provider);
const gbcToken = new ethers.Contract(contractAddress, GBC_TOKEN_ABI, signer);

// Player wins 200 GBC
await gbcToken.mintGameReward(playerAddress, ethers.parseEther('200'));
```

## 🚨 Troubleshooting

### Issue: "Insufficient funds for gas"
**Solution:** Get more test MATIC from faucet

### Issue: "Invalid private key"
**Solution:** Remove `0x` prefix from private key in .env.local

### Issue: "Nonce too high"
**Solution:** Reset MetaMask account:
1. Settings → Advanced → Clear activity tab data

### Issue: "Contract verification failed"
**Solution:** Wait a few minutes and try manual verification:
```bash
npx hardhat verify --network polygonAmoy 0xYourAddress
```

### Issue: "Network connection failed"
**Solution:** Check RPC URL in hardhat.config.js, try alternative:
```
https://polygon-amoy.g.alchemy.com/v2/demo
```

## 📚 Resources

### Documentation
- [Hardhat Docs](https://hardhat.org/docs)
- [Wagmi Docs](https://wagmi.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Polygon Docs](https://docs.polygon.technology/)

### Tools
- [Polygon Amoy Faucet](https://faucet.polygon.technology/)
- [Polygonscan Amoy](https://amoy.polygonscan.com)
- [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers)
- [Remix IDE](https://remix.ethereum.org/) - Alternative contract development

### Support
- [Hardhat Discord](https://discord.gg/hardhat)
- [Polygon Discord](https://discord.gg/polygon)
- [Stack Exchange](https://ethereum.stackexchange.com/)

## 🎉 Next Steps

After successful deployment:

1. ✅ **Update WalletButton** - Display GBC balance
2. ✅ **Create useGBCBalance hook** - Fetch token balance
3. ✅ **Create useGBCTransfer hook** - Send tokens
4. ✅ **Backend integration** - Authorize game server as minter
5. ✅ **Game mechanics** - Burn on bet, mint on win
6. ✅ **Web3 Authentication** - Login with wallet signature
7. ✅ **Testing** - Full integration testing

---

**Created:** 2024
**Network:** Polygon Amoy Testnet (Chain ID: 80002)
**Token:** GBC (GOBOG COIN)
**Game:** MetaBlackjack
