# 🧪 Testing Withdrawal in Remix IDE - Step by Step

## 📋 **Prerequisites**

Before starting, collect these values from your failed transaction:

```javascript
// Failed Transaction Parameters
player:        0xF8C01AC04e636725b136e3bC104561AFDFE6768e
amount:        1000000000000000000  // 1 GBC
finalBalance:  117000000000000000000 // 117 GBC
nonce:         1764222215
signature:     0xbc20a62b6c35d42289b5ea841d781c2b98a37c5dcc0a1f208a949cfe1d5fbf4b2b65153ee48cde18cc54dfd218cd39e9c6bf3b01dc52de032c1f742ed0d801be1b

// Contract Addresses (Polygon Amoy)
GameWithdraw:  0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3
GBC Token:     0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
Backend Signer: 0x4c950023B40131944c7F0D116e86D046A7e7EE20
```

---

## 🚀 **Step 1: Open Remix IDE**

1. Go to https://remix.ethereum.org
2. Wait for Remix to load completely
3. You'll see the default workspace

---

## 📂 **Step 2: Create Contract File**

1. **In File Explorer (left sidebar):**
   - Click on `contracts` folder
   - Click the "New File" icon (📄+)
   - Name it: `GameWithdraw.sol`

2. **Copy the contract code:**
   - Open `blockchain/contracts/GameWithdraw.sol` from your project
   - Copy ALL content (including imports)
   - Paste into Remix's `GameWithdraw.sol`

3. **Save the file:**
   - Press `Ctrl+S` or click "Save" icon

---

## 🔨 **Step 3: Compile the Contract**

1. **Open Solidity Compiler tab:**
   - Click the "Solidity Compiler" icon (📜) in left sidebar
   - Or press `Ctrl+Shift+S`

2. **Configure compiler:**
   - Compiler version: Select `0.8.20` or higher (match your contract)
   - Auto compile: ✅ Enable (recommended)
   - Enable optimization: ✅ Enable (optional, 200 runs)

3. **Compile:**
   - Click blue "Compile GameWithdraw.sol" button
   - Wait for compilation...
   - ✅ You should see green checkmark: "Compilation successful"

4. **If compilation fails:**
   - Check error messages
   - Ensure OpenZeppelin imports are correct
   - Remix auto-downloads OpenZeppelin contracts

---

## 🌐 **Step 4: Connect to Polygon Amoy Testnet**

1. **Open Deploy & Run Transactions tab:**
   - Click "Deploy & Run Transactions" icon (🚀) in left sidebar
   - Or press `Ctrl+Shift+D`

2. **Configure environment:**
   - Environment: Select **"Injected Provider - MetaMask"**
   - ⚠️ MetaMask popup will appear

3. **Connect MetaMask:**
   - Click "Next" → "Connect"
   - Ensure you're on **Polygon Amoy Testnet** (Chain ID 80002)
   - If not on Amoy:
     - Click network dropdown in MetaMask
     - Select "Polygon Amoy" (or add it via Chainlist.org)

4. **Verify connection:**
   - In Remix, check "Environment" shows: `Injected Provider - MetaMask`
   - "Account" dropdown shows your wallet address
   - "Balance" shows your MATIC balance on Amoy

---

## 🔗 **Step 5: Load Deployed Contract**

1. **In "Deploy & Run Transactions" tab:**
   - CONTRACT dropdown: Select `GameWithdraw`
   - You'll see constructor parameters (DON'T deploy new contract)

2. **Use "At Address" feature:**
   - Below the orange "Deploy" button
   - Find light blue "At Address" button
   - Input field above it: Enter contract address
     ```
     0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3
     ```
   - Click **"At Address"** button

3. **Verify loaded:**
   - Under "Deployed Contracts" section
   - You'll see: `GAMEWITHDRAW AT 0x84EB...6CC3`
   - Click dropdown arrow (▼) to expand

4. **View contract functions:**
   - Orange buttons: State-changing functions (require gas)
   - Blue buttons: View functions (free, read-only)

---

## 🧪 **Step 6: Test with Exact Failed Parameters**

### **6.1: Check Nonce Status First**

1. **Expand deployed contract**
2. **Find `isNonceUsed` function (blue button)**
3. **Input:**
   ```
   nonce: 1764222215
   ```
4. **Click "isNonceUsed" button**
5. **Result:**
   - `bool: false` = Nonce NOT used ✅ (good, can proceed)
   - `bool: true` = Nonce ALREADY used ❌ (need fresh signature)

---

### **6.2: Check Contract Balance**

1. **Find `getContractBalance` function (blue button)**
2. **Click it (no input needed)**
3. **Result:**
   ```
   uint256: 10000000000000000000000
   ```
   - This is 10,000 GBC (18 decimals)
   - Should be > 1 GBC (amount to withdraw)

---

### **6.3: Verify Signature (Optional but Recommended)**

1. **Find `verifySignature` function (blue button)**
2. **Input parameters:**
   ```
   player:        0xF8C01AC04e636725b136e3bC104561AFDFE6768e
   amount:        1000000000000000000
   finalBalance:  117000000000000000000
   nonce:         1764222215
   signature:     0xbc20a62b6c35d42289b5ea841d781c2b98a37c5dcc0a1f208a949cfe1d5fbf4b2b65153ee48cde18cc54dfd218cd39e9c6bf3b01dc52de032c1f742ed0d801be1b
   ```
3. **Click "verifySignature" button**
4. **Expected result:**
   - `bool: true` = Signature VALID ✅
   - `bool: false` = Signature INVALID ❌

⚠️ **IMPORTANT: Address Case Sensitivity Test**

If signature shows invalid, test with lowercase address:
```
player: 0xf8c01ac04e636725b136e3bc104561afdfe6768e (all lowercase)
```

---

### **6.4: Execute Withdraw Function**

⚠️ **This will send a real transaction!**

1. **Find `withdraw` function (orange button)**

2. **Expand the function input fields**

3. **Input parameters EXACTLY:**
   ```
   player:        0xF8C01AC04e636725b136e3bC104561AFDFE6768e
   amount:        1000000000000000000
   finalBalance:  117000000000000000000
   nonce:         1764222215
   signature:     0xbc20a62b6c35d42289b5ea841d781c2b98a37c5dcc0a1f208a949cfe1d5fbf4b2b65153ee48cde18cc54dfd218cd39e9c6bf3b01dc52de032c1f742ed0d801be1b
   ```

4. **Set Gas Limit (optional):**
   - Click "Advanced" near orange "transact" button
   - Gas limit: `300000`

5. **Click orange "transact" button**

6. **MetaMask popup will appear:**
   - Review transaction details
   - Check gas fee is acceptable
   - Click **"Confirm"**

---

## 📊 **Step 7: Analyze Results**

### **If Transaction Succeeds ✅**

1. **Remix console shows:**
   ```
   [vm] from: 0xF8C...768e
   to: GameWithdraw.withdraw(address,uint256,uint256,uint256,bytes)
   value: 0 wei
   data: 0x...
   logs: [...]
   status: true  ✅
   ```

2. **Check your wallet:**
   - Add GBC token to MetaMask if not visible
   - Token contract: `0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a`
   - Balance should increase by 1 GBC

3. **View on Polygonscan:**
   - Click transaction hash in Remix console
   - Opens Amoy Polygonscan
   - Status: "Success" ✅
   - View logs for `Withdraw` event

---

### **If Transaction Fails ❌**

1. **Remix console shows error:**
   ```
   [vm] error: revert ...
   status: false  ❌
   ```

2. **Common revert reasons:**

   **a) "Nonce already used"**
   ```
   Fix: Get fresh signature from backend with new nonce
   ```

   **b) "Invalid signature"**
   ```
   Fix: Check address case sensitivity
   - Backend might sign with: 0xf8c... (lowercase)
   - Frontend might send: 0xF8C... (mixed case)
   - Try again with lowercase address
   ```

   **c) "Insufficient contract balance"**
   ```
   Fix: Contract needs more GBC tokens
   Current: Check getContractBalance()
   Need: At least 1 GBC (1000000000000000000)
   ```

   **d) "Invalid player address"**
   ```
   Fix: Ensure player address is not 0x0000...
   ```

   **e) "Amount must be > 0"**
   ```
   Fix: Amount must be positive value
   ```

3. **Copy error message:**
   - Right-click Remix console
   - "Copy" full error text
   - Share for debugging

---

## 🔍 **Step 8: Debug Specific Issues**

### **Issue A: Address Case Sensitivity**

**Test lowercase address:**

1. Use `verifySignature` with lowercase:
   ```
   player: 0xf8c01ac04e636725b136e3bc104561afdfe6768e
   ```
   - If returns `true`: Backend signed with lowercase
   - Frontend must send lowercase to contract

2. Try `withdraw` with lowercase:
   ```
   player: 0xf8c01ac04e636725b136e3bc104561afdfe6768e
   ```
   - If succeeds: Confirms case sensitivity issue

**Fix in code:**
- Backend: `playerAddress = playerAddress.toLowerCase()`
- Frontend: `const normalizedAddress = address.toLowerCase()`

---

### **Issue B: Signature Mismatch**

**Possible causes:**

1. **Wrong signing order:**
   - Backend signs: `(player, amount, finalBalance, nonce)`
   - Contract expects: `keccak256(abi.encodePacked(player, amount, finalBalance, nonce))`
   - Order MUST match exactly

2. **Wrong hashing method:**
   - ✅ Correct: `ethers.solidityPackedKeccak256(...)`
   - ❌ Wrong: `ethers.keccak256(ethers.AbiCoder.encode(...))`

3. **Missing EthSignedMessageHash:**
   - Backend must use: `signMessage(ethers.getBytes(messageHash))`
   - Contract uses: `messageHash.toEthSignedMessageHash()`
   - Both add `"\x19Ethereum Signed Message:\n32"` prefix

---

### **Issue C: Get Fresh Signature**

If nonce is used or signature expired:

1. **In your application:**
   - Click "Withdraw" button again
   - Backend generates new signature with fresh nonce

2. **Check backend logs:**
   ```
   🔐 Withdrawal Signature Generated: {
     playerAddress: "0xf8c...",
     amount: "1",
     finalBalance: "117",
     nonce: 1764222XXX,  // New nonce
     signature: "0x...",  // New signature
   }
   ```

3. **Copy new signature and nonce**

4. **Try withdraw in Remix with new values**

---

## 📝 **Step 9: Document Findings**

### **Create test report:**

```markdown
## Remix Withdrawal Test Report

**Date:** 2025-11-27
**Tester:** [Your name]
**Network:** Polygon Amoy (Chain ID 80002)

### Test Parameters
- Player: 0xF8C01AC04e636725b136e3bC104561AFDFE6768e
- Amount: 1 GBC
- Nonce: 1764222215
- Signature: 0xbc20...1be1b

### Pre-checks
- [ ] Nonce not used: ✅/❌
- [ ] Contract balance sufficient: ✅/❌ (10,000 GBC)
- [ ] Signature valid (mixed case): ✅/❌
- [ ] Signature valid (lowercase): ✅/❌

### Withdrawal Execution
- [ ] Transaction submitted: ✅/❌
- [ ] Transaction confirmed: ✅/❌
- [ ] Tokens received: ✅/❌

### Results
**Status:** Success ✅ / Failed ❌

**Error message (if failed):**
```
[Paste error here]
```

**Root cause:**
[Describe what you found]

**Solution:**
[Describe fix needed]
```

---

## 🎯 **Quick Troubleshooting Checklist**

```
✅ Remix connected to Polygon Amoy?
✅ Contract loaded at correct address (0x84eb...6cc3)?
✅ Using correct wallet address in MetaMask?
✅ Wallet has MATIC for gas fees?
✅ Nonce is fresh (not already used)?
✅ Contract has sufficient GBC balance?
✅ Signature format correct (0x + 130 hex chars)?
✅ All parameters match exactly (no extra spaces)?
✅ Address case matches signature (try lowercase)?
```

---

## 🆘 **If Still Failing**

### **Advanced Debugging:**

1. **Call contract read functions:**
   ```
   backendSigner()      → Should return: 0x4c950023B40131944c7F0D116e86D046A7e7EE20
   getPlayerNonce(addr) → Last nonce used by player
   usedNonces(nonce)    → Check if nonce already used
   ```

2. **Test with fresh signature:**
   - Generate signature in backend
   - Use immediately in Remix
   - Eliminates signature expiry issues

3. **Test signature generation manually:**
   - Run `scripts/test-signature.js`
   - Compare with Remix `verifySignature` result
   - Should match exactly

4. **Check transaction on Polygonscan:**
   - Go to https://amoy.polygonscan.com
   - Search your wallet address
   - Find failed transaction
   - Click "Click to see More"
   - View "Input Data" decoded
   - Check "State" tab for revert reason

---

## 📚 **Additional Resources**

- **Remix Documentation:** https://remix-ide.readthedocs.io
- **OpenZeppelin Forum:** https://forum.openzeppelin.com
- **Polygon Amoy Explorer:** https://amoy.polygonscan.com
- **ECDSA Signature Guide:** https://docs.ethers.org/v6/api/crypto/#Signature

---

## ✅ **Expected Successful Output**

When everything works correctly, you'll see:

```javascript
// Remix Console
✅ status: true
📊 transaction hash: 0x...
⛽ gas used: ~150,000
📋 logs: [
  {
    event: "Withdraw",
    args: {
      player: "0xF8C01AC04e636725b136e3bC104561AFDFE6768e",
      amount: "1000000000000000000",
      finalBalance: "117000000000000000000",
      nonce: "1764222215",
      timestamp: "1732..."
    }
  }
]
```

**Your wallet:**
- GBC balance: +1 GBC ✅
- Transaction appears in history ✅

**Backend (should process):**
- Detects withdrawal event ✅
- Updates database balance ✅
- Marks nonce as used ✅

---

## 🎓 **Learning Points**

After completing this test, you'll understand:

1. ✅ How to connect Remix to live networks
2. ✅ How to interact with deployed contracts
3. ✅ How ECDSA signature verification works
4. ✅ Why address case sensitivity matters
5. ✅ How to debug contract reverts systematically
6. ✅ The importance of nonce tracking
7. ✅ Gas estimation and transaction flow

---

**Good luck with your testing! 🚀**

If you discover the exact revert reason, update your backend code accordingly and test again in your application.
