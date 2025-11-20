# Phase 2: Smart Contract Deployment Guide

**Status:** Ready to Deploy  
**Chain:** Polygon Amoy Testnet (Chain ID: 80002)  
**GBC Token:** `0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a`

---

## 📋 Contracts to Deploy

### 1. **GBCFaucet** (`GBCFaucet.sol`)
- One-time 100 GBC airdrop for new players
- 30-day cooldown between claims
- Reentrancy guard
- Owner can withdraw unclaimed funds

**Key Functions:**
- `claim()` - Claim 100 GBC tokens
- `canClaim(address)` - Check if user can claim
- `getNextClaimTime(address)` - Time until next claim

---

### 2. **DepositEscrow** (`DepositEscrow.sol`)
- Holds GBC tokens while players play blackjack
- Emits `DepositEvent` for backend to listen
- Supports multiple deposits per player
- No withdrawal logic (backend-controlled)

**Key Functions:**
- `deposit(uint256 amount)` - Deposit GBC to escrow
- `getBalance(address)` - Get player's escrow balance
- `getTotalEscrow()` - Get total escrow amount
- `isSolvent()` - Verify contract has sufficient tokens

---

### 3. **GameWithdraw** (`GameWithdraw.sol`)
- Backend-signed withdrawals (ECDSA verification)
- Nonce tracking to prevent replay attacks
- Emits `WithdrawEvent` for backend to listen
- Owner can update backend signer address

**Key Functions:**
- `withdraw(player, amount, finalBalance, nonce, signature)` - Withdraw with verification
- `verifySignature()` - Verify a signature (for frontend validation)
- `isNonceUsed(nonce)` - Check if nonce already used
- `setBackendSigner()` - Update backend signer (admin)

---

## 🚀 Deployment Steps

### Step 1: Setup Environment

1. Navigate to blockchain directory:
```bash
cd blockchain
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your values:
```env
PRIVATE_KEY=your_deployer_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

**⚠️ IMPORTANT:** 
- Get MATIC testnet tokens from: https://faucet.polygon.technology/
- Never commit `.env` file!

---

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

This will:
- Check Solidity syntax
- Compile to bytecode
- Generate ABIs

---

### Step 3: Deploy to Polygon Amoy

**Option A: Using bash script (Linux/Mac)**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Option B: Using batch script (Windows)**
```cmd
deploy.bat
```

**Option C: Manual deployment**
```bash
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

---

### Step 4: Verify Contracts on Polygonscan

After deployment, verify contracts for transparency:

```bash
npx hardhat run scripts/verify.ts --network polygonAmoy
```

Or manually:
```bash
npx hardhat verify --network polygonAmoy \
  <FAUCET_ADDRESS> \
  "0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a"
```

---

## 📝 Deployment Output

After successful deployment, you'll get:

```
========================================
✅ DEPLOYMENT SUCCESSFUL!
========================================

📋 Contract Addresses:
  GBCFaucet:     0x...
  DepositEscrow: 0x...
  GameWithdraw:  0x...

🔗 Polygon Amoy Explorer:
  Faucet:  https://amoy.polygonscan.com/address/0x...
  Deposit: https://amoy.polygonscan.com/address/0x...
  Withdraw: https://amoy.polygonscan.com/address/0x...
```

These addresses are saved in: `deployments/polygon-amoy.json`

---

## 💰 Post-Deployment Setup

### 1. Fund Faucet Contract

The faucet needs GBC tokens to distribute. Transfer from your wallet:

```bash
# Using ethers.js or any wallet UI
# Send GBC to faucet contract (at least 10,000 GBC for ~100 claims)
```

### 2. Update Frontend

Copy contract addresses to frontend `.env`:

```env
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
NEXT_PUBLIC_FAUCET_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_DEPOSIT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WITHDRAW_CONTRACT_ADDRESS=0x...
```

### 3. Update Backend

Update backend environment:

```env
GBC_TOKEN_ADDRESS=0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
FAUCET_CONTRACT_ADDRESS=0x...
DEPOSIT_CONTRACT_ADDRESS=0x...
WITHDRAW_CONTRACT_ADDRESS=0x...
BACKEND_SIGNER_PRIVATE_KEY=your_backend_private_key
```

---

## 🔍 Verify Deployment

Check contracts are deployed and functional:

### Check Faucet
```bash
npx hardhat run -c polygon-amoy << 'EOF'
const faucet = await ethers.getContractAt("GBCFaucet", "0x...");
const canClaim = await faucet.canClaim("0x...");
console.log("Can claim:", canClaim);
EOF
```

### Check Deposit Escrow
```bash
npx hardhat run -c polygon-amoy << 'EOF'
const deposit = await ethers.getContractAt("DepositEscrow", "0x...");
const total = await deposit.getTotalEscrow();
console.log("Total escrow:", total.toString());
EOF
```

### Check Withdraw
```bash
npx hardhat run -c polygon-amoy << 'EOF'
const withdraw = await ethers.getContractAt("GameWithdraw", "0x...");
const signer = await withdraw.backendSigner();
console.log("Backend signer:", signer);
EOF
```

---

## 🐛 Troubleshooting

### Error: "Insufficient balance"
- You need MATIC on Polygon Amoy testnet
- Get from: https://faucet.polygon.technology/

### Error: "Invalid Signer"
- Check PRIVATE_KEY is correct in `.env`
- Ensure it's without '0x' prefix

### Error: "Contract already deployed"
- Update contract slightly and redeploy
- Or use different deployer address

### Verification fails
- Check POLYGONSCAN_API_KEY is correct
- Wait a few blocks for contract to be indexed
- Try manually on Polygonscan UI

---

## 📊 Contract Sizes

Optimized gas usage:

| Contract | Size | Functions |
|----------|------|-----------|
| GBCFaucet | ~3.5 KB | 4 main |
| DepositEscrow | ~3.2 KB | 4 main |
| GameWithdraw | ~5.8 KB | 5 main |
| **Total** | **~12.5 KB** | **13** |

---

## 🔐 Security Notes

1. **Private Keys:** Never commit `.env` file
2. **Backend Signer:** Keep backend private key secure
3. **Multisig:** Consider using multisig for important functions
4. **Upgrade:** Consider proxy contracts for future upgrades
5. **Audit:** Consider professional security audit before mainnet

---

## ✅ Deployment Checklist

- [ ] Installed dependencies (`npm install`)
- [ ] Copied `.env.example` to `.env`
- [ ] Added PRIVATE_KEY and API keys to `.env`
- [ ] Compiled contracts (`npx hardhat compile`)
- [ ] Deployed to Polygon Amoy (`npm run deploy`)
- [ ] Got deployment addresses
- [ ] Funded faucet with GBC tokens
- [ ] Verified contracts on Polygonscan
- [ ] Updated frontend `.env` with addresses
- [ ] Updated backend `.env` with addresses
- [ ] Tested deposit/withdraw flow

---

## 📞 Support

If deployment fails:

1. Check error message carefully
2. Verify all environment variables
3. Ensure sufficient MATIC balance
4. Check Polygonscan for existing contracts
5. Review contract code for issues

---

**Deployment Date:** November 19, 2025  
**Chain:** Polygon Amoy (80002)  
**Status:** Ready for deployment
