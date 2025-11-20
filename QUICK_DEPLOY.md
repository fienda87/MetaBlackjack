# Quick Deployment Guide

## ✅ Setup Complete!

Smart contract compilation sudah berhasil! GBC Token (GOBOG COIN) siap untuk di-deploy.

## 📝 Prerequisites

1. **MetaMask Wallet**
   - Export private key (Settings → Security & Privacy → Show Private Key)
   - ⚠️ NEVER share your private key!

2. **Test MATIC**
   - Visit: https://faucet.polygon.technology/
   - Connect wallet dan request test MATIC
   - Tunggu 1-2 menit untuk tokens masuk

3. **Polygonscan API Key** (Optional untuk verification)
   - Visit: https://polygonscan.com/myapikey
   - Create API key

## 🚀 Deployment Steps

### Step 1: Setup Environment

```bash
# Copy environment file
cp .env.local blockchain/.env

# Or create new file: blockchain/.env
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_api_key_optional
```

### Step 2: Compile Contract (Already Done!)

```bash
# Option 1: NPM script
npm run contract:compile

# Option 2: Batch file
./hardhat-compile.bat

# Option 3: Direct
cd blockchain && npx hardhat compile
```

### Step 3: Deploy to Polygon Amoy

```bash
# Option 1: NPM script  
npm run contract:deploy

# Option 2: Batch file (Recommended for Windows)
./hardhat-deploy.bat

# Option 3: Direct
cd blockchain && npx hardhat run scripts/deploy-gbc.js --network polygonAmoy
```

Expected output:
```
🚀 Starting GBC Token deployment to Polygon Amoy...
📝 Deploying with account: 0x1234...5678
💰 Account balance: 0.5 MATIC
📦 Deploying GBCToken contract...
✅ GBCToken deployed to: 0xABCD...EFGH
💎 Initial supply: 10000000.0 GBC
```

### Step 4: Update Environment

Copy contract address dan add ke `.env.local`:
```env
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0xABCD...EFGH
```

Restart dev server:
```bash
npm run dev
```

### Step 5: Import to MetaMask

1. Open MetaMask
2. Switch to Polygon Amoy network
3. Click "Import tokens"
4. Enter:
   - Token Address: `0xABCD...EFGH` (your deployed address)
   - Symbol: GBC
   - Decimals: 18

You'll see **10,000,000 GBC** in your wallet! 🎉

## 📂 Project Structure

```
ippll/
├── blockchain/              # Isolated Hardhat workspace
│   ├── contracts/          # Smart contracts
│   │   └── GBCToken.sol   # ERC20 token contract
│   ├── scripts/            # Deployment scripts
│   │   └── deploy-gbc.js  # GBC deployment script
│   ├── hardhat.config.js  # Hardhat 3.x configuration
│   ├── .env               # Private keys (NEVER commit!)
│   └── package.json       # Blockchain dependencies
│
├── hardhat-compile.bat    # Windows compile shortcut
├── hardhat-deploy.bat     # Windows deploy shortcut
├── .env.local            # Frontend environment
└── package.json          # Main app with contract scripts
```

## 🎮 Contract Features

### GBCToken Contract

- **Token Name:** GOBOG COIN
- **Symbol:** GBC
- **Decimals:** 18
- **Initial Supply:** 10,000,000 GBC

### Game Functions

```solidity
// Mint rewards to winners (only authorized minters)
function mintGameReward(address to, uint256 amount) external onlyGameMinter

// Burn tokens when placing bets
function burnGameLoss(uint256 amount) external

// Admin: Authorize game server
function addGameMinter(address minter) external onlyOwner
```

## 🔧 Troubleshooting

### Issue: "Insufficient funds for gas"
**Solution:** Get more test MATIC from https://faucet.polygon.technology/

### Issue: "Invalid private key"
**Solution:** Remove `0x` prefix from PRIVATE_KEY in blockchain/.env

### Issue: "Network connection failed"
**Solution:** Check your internet connection, try alternative RPC:
```
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/demo
```

### Issue: "Contract verification failed"
**Solution:** Wait a few minutes, then run:
```bash
cd blockchain
npx hardhat verify --network polygonAmoy 0xYourContractAddress
```

## 📚 Useful Commands

```bash
# Compile contract
npm run contract:compile

# Deploy to Polygon Amoy
npm run contract:deploy

# Verify on Polygonscan
npm run contract:verify

# Check Hardhat version
cd blockchain && npx hardhat --version

# Clean build artifacts
cd blockchain && rm -rf cache artifacts
```

## 🌐 Useful Links

- **Polygon Amoy Explorer:** https://amoy.polygonscan.com
- **Faucet:** https://faucet.polygon.technology/
- **Hardhat Docs:** https://hardhat.org/docs
- **OpenZeppelin:** https://docs.openzeppelin.com/contracts/

## ✨ Next Steps

After successful deployment:

1. ✅ **Display GBC Balance** - Create `useGBCBalance` hook
2. ✅ **Token Transfer** - Create `useGBCTransfer` hook
3. ✅ **Game Integration** - Burn on bet, mint on win
4. ✅ **Web3 Auth** - Login with wallet signature
5. ✅ **Testing** - Full integration testing

---

**Ready to Deploy?** Run `./hardhat-deploy.bat` 🚀
