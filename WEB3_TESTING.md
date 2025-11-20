# Web3 Integration - Testing Guide

## ✅ What's Been Completed

### 1. Smart Contract Deployment
- ✅ GBC Token deployed to Polygon Amoy
- ✅ Contract Address: `0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a`
- ✅ Initial Supply: 10,000,000 GBC tokens
- ✅ View on Explorer: https://amoy.polygonscan.com/address/0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a

### 2. Frontend Integration
- ✅ Web3Provider configured with Wagmi + React Query
- ✅ WalletButton with MetaMask connection
- ✅ Polygon Amoy network auto-switch
- ✅ GBC balance display in wallet dropdown
- ✅ MATIC balance display

### 3. React Hooks Created
- ✅ `useGBCBalance` - Get token balance
- ✅ `useGBCTokenInfo` - Get token details
- ✅ `useGBCTransfer` - Transfer tokens
- ✅ `useGBCApprove` - Approve spending
- ✅ `useGBCBurn` - Burn tokens (for betting)

## 🧪 Testing Steps

### Step 1: Import GBC Token to MetaMask

1. Open MetaMask extension
2. Switch to **Polygon Amoy Testnet**
3. Click **"Import tokens"** at bottom
4. Enter token details:
   ```
   Token Address: 0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
   Symbol: GBC
   Decimals: 18
   ```
5. Click **"Add Custom Token"**
6. You should see **10,000,000 GBC** in your wallet! 🎉

### Step 2: Test Wallet Connection

1. Open app: http://localhost:3000
2. Look for **Wallet button** in navigation
3. Click **Connect Wallet**
4. MetaMask should prompt to:
   - Switch to Polygon Amoy (if not already)
   - Connect your account
5. After connecting, you should see:
   - ✅ Your wallet address (truncated)
   - ✅ "Polygon Amoy" network badge
   - ✅ MATIC balance
   - ✅ **GBC balance (10,000,000 GBC)** 🎯

### Step 3: Test Wallet Dropdown

Click the connected wallet button to open dropdown:

**Expected to see:**
- Address: `0x4c95...EE20`
- Network: Polygon Amoy badge (green)
- MATIC: `99.8934 MATIC`
- **GBC: `10,000,000 GBC`** (with coin icon 🪙)
- Disconnect button

### Step 4: Test Network Switch

1. In MetaMask, switch to different network (e.g., Ethereum Mainnet)
2. Wallet button should show **"Wrong Network"** badge (red)
3. Click wallet button
4. Should see warning: "Please switch to Polygon Amoy Testnet"
5. Click **"Switch to Polygon Amoy"** option
6. MetaMask should prompt to switch back

## 📝 Next Steps (Not Yet Implemented)

### Phase 1: Game Integration ⏳
- Create `useGameBet` hook to burn GBC on bet
- Update game UI to show GBC balance
- Add option to bet with GBC tokens
- Integrate burn function with game logic

### Phase 2: Backend Minting 🔜
- Create backend service with wallet
- Authorize backend as game minter
- Implement `mintGameReward` on player wins
- Add webhook for automatic token distribution

### Phase 3: Web3 Authentication 🔮
- Create `useWeb3Auth` hook
- Implement wallet signature authentication
- Link wallet address to user account
- Optional: Make wallet-only login (no email/password)

### Phase 4: Token Economy 💰
- Deposit GBC to game balance
- Withdraw game balance to wallet
- Display on-chain vs off-chain balance
- Transaction history UI

## 🎮 How to Test Each Hook

### Test `useGBCBalance`

```typescript
import { useGBCBalance } from '@/hooks/useGBCBalance';

function MyComponent() {
  const { address } = useAccount();
  const { formatted, balance, isLoading } = useGBCBalance(address);
  
  return (
    <div>
      {isLoading ? 'Loading...' : `Balance: ${formatted} GBC`}
    </div>
  );
}
```

### Test `useGBCTransfer`

```typescript
import { useGBCTransfer } from '@/hooks/useGBCTransfer';

function TransferButton() {
  const { transfer, isPending, isConfirmed } = useGBCTransfer();
  
  const handleTransfer = async () => {
    await transfer('0xRecipientAddress', '100'); // Transfer 100 GBC
  };
  
  return (
    <button onClick={handleTransfer} disabled={isPending}>
      {isPending ? 'Transferring...' : 
       isConfirmed ? 'Transfer Complete!' : 
       'Transfer 100 GBC'}
    </button>
  );
}
```

### Test `useGBCBurn`

```typescript
import { useGBCBurn } from '@/hooks/useGBCTransfer';

function BetButton() {
  const { burn, isPending, isConfirmed } = useGBCBurn();
  
  const placeBet = async () => {
    await burn('50'); // Burn 50 GBC for bet
  };
  
  return (
    <button onClick={placeBet} disabled={isPending}>
      {isPending ? 'Placing Bet...' : 'Bet 50 GBC'}
    </button>
  );
}
```

## 🔧 Troubleshooting

### Issue: GBC Balance Shows 0
**Solution:** 
1. Check you imported token to MetaMask
2. Verify contract address: `0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a`
3. Refresh page
4. Check wallet has 10M GBC on Polygonscan

### Issue: Can't Connect Wallet
**Solution:**
1. Make sure MetaMask is installed
2. Try refreshing page
3. Check MetaMask is unlocked
4. Try disconnecting in MetaMask settings first

### Issue: Wrong Network Error
**Solution:**
1. Click wallet button
2. Click "Switch to Polygon Amoy"
3. Approve in MetaMask
4. If fails, manually add network in MetaMask

### Issue: Transaction Fails
**Solution:**
1. Check you have enough MATIC for gas
2. Get more test MATIC: https://faucet.polygon.technology/
3. Try increasing gas limit
4. Check network is not congested

## 📊 Contract Functions Available

### Read Functions (No gas needed)
- `balanceOf(address)` - Get GBC balance
- `name()` - Get token name (GOBOG COIN)
- `symbol()` - Get token symbol (GBC)
- `decimals()` - Get decimals (18)
- `totalSupply()` - Get total supply

### Write Functions (Requires gas)
- `transfer(to, amount)` - Transfer tokens
- `approve(spender, amount)` - Approve spending
- `burnGameLoss(amount)` - Burn tokens (any user)
- `mintGameReward(to, amount)` - Mint rewards (only authorized)
- `addGameMinter(address)` - Add minter (only owner)

## 🎯 Success Criteria

✅ **Phase 1 Complete When:**
- [x] GBC Token deployed successfully
- [x] Contract verified on Polygonscan
- [x] Wallet connection working
- [x] GBC balance displays in UI
- [x] Network detection working
- [x] Hooks created and exported

⏳ **Phase 2 Complete When:**
- [ ] User can bet with GBC tokens
- [ ] Tokens burned on bet placement
- [ ] Backend mints rewards on win
- [ ] Transaction notifications in UI

🔮 **Phase 3 Complete When:**
- [ ] Web3 authentication working
- [ ] Users can login with wallet only
- [ ] Wallet linked to game account
- [ ] Session persists across refreshes

💰 **Phase 4 Complete When:**
- [ ] Deposit/withdraw system working
- [ ] On-chain and off-chain balance tracked
- [ ] Transaction history displayed
- [ ] Full token economy integrated

---

**Current Status:** ✅ Phase 1 Complete - Testing Ready!

**Next Action:** Test wallet connection and GBC balance display at http://localhost:3000
