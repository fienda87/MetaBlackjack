# 🧪 Panduan Testing Blockchain dengan Remix Ethereum

## 📝 Overview

Panduan ini akan memandu kamu untuk testing smart contract dan event listener menggunakan Remix Ethereum IDE. Lebih mudah dan cepat daripada setup local blockchain.

---

## 🎯 Yang Akan Kita Test

1. ✅ **Deposit** - User deposit GBC token ke game
2. ✅ **Withdrawal** - User withdraw GBC dari game  
3. ✅ **Faucet** - User claim 100 GBC free (signup bonus)
4. ✅ **Event Listener** - Server detect event dan update database
5. ✅ **API Processing** - Event diproses via internal API

---

## 📋 Fase 1: Persiapan (5 menit)

### 1.1 Start Server Lokal

Buka terminal dan jalankan:

```bash
npm run dev
```

Server harus jalan di `http://localhost:3000`

**Check logs harus muncul:**
```
✅ DepositListener started successfully
✅ WithdrawListener started successfully
✅ FaucetListener started successfully
```

Kalau ada error, paste error messagenya nanti kita fix.

### 1.2 Cek API Health

Buka browser atau gunakan curl:

```bash
# Test 3 API endpoints
curl http://localhost:3000/api/deposit/process
curl http://localhost:3000/api/withdrawal/process
curl http://localhost:3000/api/faucet/process
```

Semuanya harus return:
```json
{
  "service": "...",
  "status": "ready",
  "version": "1.0.0"
}
```

---

## 🦊 Fase 2: Setup MetaMask (3 menit)

### 2.1 Tambah Network Polygon Amoy

1. Buka MetaMask
2. Klik network dropdown (atas kiri)
3. Klik "Add Network" atau "Add Custom Network"
4. Isi data:

```
Network Name: Polygon Amoy Testnet
RPC URL: https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
Chain ID: 80002
Currency Symbol: MATIC
Block Explorer: https://amoy.polygonscan.com/
```

5. Save

### 2.2 Get Testnet MATIC

Kamu butuh MATIC untuk gas fee:

1. Copy wallet address kamu dari MetaMask
2. Buka: https://faucet.polygon.technology/
3. Pilih "Polygon Amoy"
4. Paste address kamu
5. Klik "Submit"
6. Tunggu 1-2 menit
7. Check balance di MetaMask harus ada ~0.5 MATIC

---

## 🎨 Fase 3: Setup Remix IDE (5 menit)

### 3.1 Buka Remix

https://remix.ethereum.org/

### 3.2 Import Contract Files

Di Remix, buat folder `contracts/` lalu copy 4 file ini:

**1. GBCToken.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GBCToken is ERC20, Ownable {
    constructor() ERC20("Game Balance Coin", "GBC") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

**2. DepositEscrow.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DepositEscrow {
    IERC20 public gbcToken;
    mapping(address => uint256) public balances;
    
    event Deposit(
        address indexed player,
        uint256 amount,
        uint256 timestamp,
        uint256 totalBalance
    );
    
    constructor(address _gbcToken) {
        gbcToken = IERC20(_gbcToken);
    }
    
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(
            gbcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        balances[msg.sender] += amount;
        
        emit Deposit(
            msg.sender,
            amount,
            block.timestamp,
            balances[msg.sender]
        );
    }
    
    function getBalance(address player) external view returns (uint256) {
        return balances[player];
    }
}
```

**3. GameWithdraw.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GameWithdraw {
    IERC20 public gbcToken;
    mapping(address => uint256) public nonces;
    
    event Withdraw(
        address indexed player,
        uint256 amount,
        uint256 finalBalance,
        uint256 nonce,
        uint256 timestamp
    );
    
    constructor(address _gbcToken) {
        gbcToken = IERC20(_gbcToken);
    }
    
    function withdraw(uint256 amount, uint256 finalBalance) external {
        require(amount > 0, "Amount must be > 0");
        require(
            gbcToken.balanceOf(address(this)) >= amount,
            "Insufficient contract balance"
        );
        
        uint256 currentNonce = nonces[msg.sender];
        nonces[msg.sender]++;
        
        require(
            gbcToken.transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit Withdraw(
            msg.sender,
            amount,
            finalBalance,
            currentNonce,
            block.timestamp
        );
    }
    
    // Owner dapat fund contract
    function fundContract(uint256 amount) external {
        require(
            gbcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }
}
```

**4. GBCFaucet.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GBCFaucet {
    IERC20 public gbcToken;
    uint256 public claimAmount = 100 * 10**18; // 100 GBC
    mapping(address => bool) public hasClaimed;
    
    event Claim(
        address indexed claimer,
        uint256 amount,
        uint256 timestamp
    );
    
    constructor(address _gbcToken) {
        gbcToken = IERC20(_gbcToken);
    }
    
    function claim() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(
            gbcToken.balanceOf(address(this)) >= claimAmount,
            "Faucet empty"
        );
        
        hasClaimed[msg.sender] = true;
        
        require(
            gbcToken.transfer(msg.sender, claimAmount),
            "Transfer failed"
        );
        
        emit Claim(msg.sender, claimAmount, block.timestamp);
    }
    
    // Owner dapat fund faucet
    function fundFaucet(uint256 amount) external {
        require(
            gbcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }
}
```

### 3.3 Compile Contracts

1. Pilih "Solidity Compiler" tab (icon S di sidebar)
2. Compiler version: pilih `0.8.20+commit.a1b79de6`
3. Klik "Compile GBCToken.sol"
4. Klik "Compile DepositEscrow.sol"
5. Klik "Compile GameWithdraw.sol"
6. Klik "Compile GBCFaucet.sol"

Semua harus sukses tanpa error.

---

## 🚀 Fase 4: Deploy Contracts (10 menit)

### 4.1 Connect MetaMask ke Remix

1. Pilih "Deploy & Run Transactions" tab (icon dengan plug)
2. Environment: pilih "Injected Provider - MetaMask"
3. MetaMask popup akan muncul, klik "Connect"
4. Pastikan network di MetaMask adalah "Polygon Amoy Testnet"
5. Address yang muncul adalah wallet address kamu

### 4.2 Deploy GBCToken (Contract #1)

1. Contract dropdown: pilih "GBCToken"
2. Klik button "Deploy" (orange)
3. MetaMask popup: confirm transaction
4. Tunggu ~5 detik
5. Di "Deployed Contracts" akan muncul GBCToken dengan address
6. **COPY ADDRESS INI** → simpan sebagai `GBC_TOKEN_ADDRESS`

**Contoh:** `0x1234567890123456789012345678901234567890`

### 4.3 Deploy DepositEscrow (Contract #2)

1. Contract dropdown: pilih "DepositEscrow"
2. Di input field sebelah Deploy button, paste `GBC_TOKEN_ADDRESS` dari step 4.2
3. Klik "Deploy"
4. Confirm di MetaMask
5. Tunggu confirm
6. **COPY ADDRESS INI** → simpan sebagai `DEPOSIT_ADDRESS`

### 4.4 Deploy GameWithdraw (Contract #3)

1. Contract dropdown: pilih "GameWithdraw"
2. Paste `GBC_TOKEN_ADDRESS` di input field
3. Deploy → Confirm → Tunggu
4. **COPY ADDRESS INI** → simpan sebagai `WITHDRAW_ADDRESS`

### 4.5 Deploy GBCFaucet (Contract #4)

1. Contract dropdown: pilih "GBCFaucet"
2. Paste `GBC_TOKEN_ADDRESS` di input field
3. Deploy → Confirm → Tunggu
4. **COPY ADDRESS INI** → simpan sebagai `FAUCET_ADDRESS`

---

## ⚙️ Fase 5: Update Config (2 menit)

### 5.1 Update .env File

Buka file `.env` di project kamu, update dengan address yang baru:

```env
# Update dengan address dari Remix
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0x... # dari step 4.2
NEXT_PUBLIC_DEPOSIT_ADDRESS=0x...  # dari step 4.3
NEXT_PUBLIC_WITHDRAW_ADDRESS=0x... # dari step 4.4
NEXT_PUBLIC_FAUCET_ADDRESS=0x...   # dari step 4.5
```

### 5.2 Update blockchain/listeners/config.ts

Atau lebih mudah, restart server aja. Server akan baca dari .env otomatis.

```bash
# Stop server (Ctrl+C di terminal)
# Start lagi
npm run dev
```

---

## 💰 Fase 6: Fund Contracts (5 menit)

Contracts perlu GBC token untuk bisa digunakan.

### 6.1 Approve GBC untuk Faucet

Di Remix, expand "GBCToken" contract:

1. Cari function `approve`
2. Input:
   - `spender`: paste `FAUCET_ADDRESS`
   - `amount`: ``10000000000000000000000`` (10,000 GBC dalam wei)
3. Klik "transact"
4. Confirm di MetaMask
5. Tunggu confirm

### 6.2 Fund Faucet

Expand "GBCFaucet" contract:

1. Cari function `fundFaucet`
2. Input:
   - `amount`: `10000000000000000000000` (10,000 GBC)
3. Transact → Confirm → Tunggu

### 6.3 Approve GBC untuk GameWithdraw

Di GBCToken contract:

1. Function `approve`
2. Input:
   - `spender`: paste `WITHDRAW_ADDRESS`
   - `amount`: `10000000000000000000000`
3. Transact → Confirm → Tunggu

### 6.4 Fund GameWithdraw

Di GameWithdraw contract:

1. Function `fundContract`
2. Input:
   - `amount`: `10000000000000000000000`
3. Transact → Confirm → Tunggu

---

## 🧪 Fase 7: Testing! (Main Part)

Sekarang kita test 3 scenario:

### Test 1: Faucet Claim (Paling Mudah)

**Goal:** User claim 100 GBC free

1. **Di Remix, expand GBCFaucet contract**
2. Klik function `claim` (orange button)
3. Confirm transaction di MetaMask
4. Tunggu ~5-10 detik

**Check Server Logs (terminal):**
```
🎁 Faucet Claim Event Detected!
├─ Claimer: 0x...
├─ Amount: 100.00 GBC
└─ Block: ...

⏳ Waiting for confirmations: 0/3
⏳ Waiting for confirmations: 1/3
⏳ Waiting for confirmations: 2/3
✓ 3 confirmations received

📡 Calling API (attempt 1/3): http://localhost:3000/api/faucet/process
✅ API call successful
🎉 Balance updated via API: 0.00 → 100.00 GBC
📡 Socket.IO event emitted to user: ...
✅ Faucet claim processed successfully
```

**Check Database:**
```bash
# Buka database tool atau jalankan:
npx prisma studio
```

Cari di table `User`:
- `walletAddress`: harus ada wallet address kamu (lowercase)
- `balance`: harus `100`

Cari di table `Transaction`:
- `type`: `SIGNUP_BONUS`
- `amount`: `100`
- `status`: `COMPLETED`
- `referenceId`: tx hash dari MetaMask

**✅ Test 1 PASSED jika:**
- Server log muncul event faucet
- API call successful
- Balance 0 → 100
- Database updated

---

### Test 2: Deposit GBC ke Game

**Goal:** User deposit 50 GBC ke game

**Step 1: Approve DepositEscrow untuk spend GBC kamu**

Di Remix, expand GBCToken:
1. Function `approve`
2. Input:
   - `spender`: paste `DEPOSIT_ADDRESS`
   - `amount`: `100000000000000000000` (100 GBC untuk testing)
3. Transact → Confirm

**Step 2: Deposit**

Di Remix, expand DepositEscrow:
1. Function `deposit`
2. Input:
   - `amount`: `50000000000000000000` (50 GBC)
3. Transact → Confirm

**Check Server Logs:**
```
🟢 Deposit Event Detected!
├─ Player: 0x...
├─ Amount: 50.00 GBC
├─ Tx Hash: 0x...
└─ Block: ...

✓ 3 confirmations received
📡 Calling API (attempt 1/3): http://localhost:3000/api/deposit/process
✅ API call successful
💰 Balance updated via API: 100.00 → 150.00 GBC
✅ Deposit processed successfully
```

**Check Database:**
- User balance: `150` (100 dari faucet + 50 deposit)
- Transaction baru:
  - type: `DEPOSIT`
  - amount: `50`
  - balanceBefore: `100`
  - balanceAfter: `150`

**✅ Test 2 PASSED jika:**
- Deposit event detected
- Balance 100 → 150
- Transaction record created

---

### Test 3: Withdraw GBC dari Game

**Goal:** User withdraw 30 GBC

Di Remix, expand GameWithdraw:
1. Function `withdraw`
2. Input:
   - `amount`: `30000000000000000000` (30 GBC)
   - `finalBalance`: `120000000000000000000` (120 GBC - balance after withdraw)
3. Transact → Confirm

**Check Server Logs:**
```
🔴 Withdraw Event Detected!
├─ Player: 0x...
├─ Amount: 30.00 GBC
├─ Nonce: 0
└─ Block: ...

✓ 3 confirmations received
📡 Calling API (attempt 1/3): http://localhost:3000/api/withdrawal/process
✅ API call successful
💸 Balance updated via API: 150.00 → 120.00 GBC
✅ Withdrawal processed successfully
```

**Check Database:**
- User balance: `120` (150 - 30)
- Transaction baru:
  - type: `WITHDRAWAL`
  - amount: `30`
  - balanceBefore: `150`
  - balanceAfter: `120`

**Check MetaMask:**
- GBC balance kamu harus naik 30 GBC

**✅ Test 3 PASSED jika:**
- Withdrawal event detected
- Balance 150 → 120
- GBC masuk ke wallet
- Transaction recorded

---

## 📊 Fase 8: Verification (5 menit)

### 8.1 Check Event Listener Status

Buka browser: `http://localhost:3000/api/metrics/blockchain` (kalau ada)

Atau check di terminal server logs, harus ada:
```
✅ DepositListener: 1 events processed
✅ WithdrawListener: 1 events processed
✅ FaucetListener: 1 events processed
```

### 8.2 Check Database Consistency

Jalankan query ini di Prisma Studio atau database tool:

```sql
-- Lihat semua transactions
SELECT * FROM "Transaction" 
WHERE "referenceId" IS NOT NULL 
ORDER BY "createdAt" DESC;

-- Check balance consistency
SELECT 
  u."walletAddress",
  u."balance",
  u."totalDeposited",
  u."totalWithdrawn",
  COUNT(t.id) as transaction_count
FROM "User" u
LEFT JOIN "Transaction" t ON t."userId" = u.id
GROUP BY u.id;
```

Expected result:
- 3 transactions (SIGNUP_BONUS, DEPOSIT, WITHDRAWAL)
- Balance: 120 GBC
- totalDeposited: 50
- totalWithdrawn: 30

---

## 🐛 Troubleshooting

### Problem 1: Server tidak detect event

**Symptom:** Transaksi sukses di MetaMask tapi server log tidak muncul event

**Solutions:**
1. Check `.env` sudah ada `INTERNAL_API_KEY`
2. Check RPC URL benar: `POLYGON_AMOY_RPC_URL`
3. Restart server: `npm run dev`
4. Check server logs ada:
   ```
   ✅ DepositListener started successfully
   ```
5. Check RPC tidak rate limited (coba ganti RPC)

### Problem 2: API call failed

**Symptom:** Server log: `❌ API call failed`

**Solutions:**
1. Check server jalan di port 3000: `http://localhost:3000`
2. Test API manual:
   ```bash
   curl http://localhost:3000/api/deposit/process
   ```
3. Check `INTERNAL_API_KEY` match di `.env`
4. Lihat error detail di server logs

### Problem 3: Transaction failed di MetaMask

**Symptom:** MetaMask error: "Insufficient allowance" atau "Transfer failed"

**Solutions:**
1. **Deposit:** Pastikan sudah `approve` DepositEscrow dulu
2. **Withdraw:** Pastikan GameWithdraw contract punya GBC (step 6.3-6.4)
3. **Faucet:** Pastikan Faucet punya GBC (step 6.1-6.2)
4. Check gas fee cukup (harus ada MATIC)

### Problem 4: Duplicate transaction

**Symptom:** Server log: `⏭️ Skipping duplicate tx`

**Expected behavior!** Ini berarti duplicate prevention bekerja. Tidak ada masalah.

### Problem 5: Balance tidak update di database

**Check:**
1. Lihat server logs ada `✅ API call successful`?
2. Buka Prisma Studio, refresh table User
3. Check `Transaction` table ada record baru?
4. Kalau tidak ada, check server logs ada error?

---

## 📝 Checklist Testing

Print checklist ini dan centang setiap step:

### Setup
- [ ] Server running `npm run dev`
- [ ] API health check passed (3 endpoints)
- [ ] MetaMask connected ke Polygon Amoy
- [ ] Punya testnet MATIC untuk gas

### Deploy
- [ ] GBCToken deployed
- [ ] DepositEscrow deployed
- [ ] GameWithdraw deployed
- [ ] GBCFaucet deployed
- [ ] Semua address disimpan

### Config
- [ ] `.env` updated dengan 4 contract addresses
- [ ] Server restarted setelah update .env
- [ ] Listeners started successfully (check logs)

### Fund Contracts
- [ ] Faucet approved dan funded (10,000 GBC)
- [ ] GameWithdraw approved dan funded (10,000 GBC)
- [ ] Check balance contracts di Remix

### Testing
- [ ] **Test 1:** Faucet claim → +100 GBC ✅
- [ ] Server detected event
- [ ] API called successfully
- [ ] Database updated
- [ ] **Test 2:** Deposit → +50 GBC ✅
- [ ] Server detected event
- [ ] Balance 100→150
- [ ] Transaction created
- [ ] **Test 3:** Withdraw → -30 GBC ✅
- [ ] Server detected event
- [ ] Balance 150→120
- [ ] GBC masuk wallet

### Verification
- [ ] Total 3 transactions di database
- [ ] Final balance: 120 GBC
- [ ] All transaction status: COMPLETED
- [ ] Server logs clean (no errors)

---

## 🎯 Summary Testing Flow

```
1. Faucet Claim
   └─> Blockchain emit event
       └─> Listener detect (wait 3 blocks)
           └─> Call API /api/faucet/process
               └─> API update DB (User + Transaction)
                   └─> Socket.IO emit event
                       └─> ✅ Balance: 0 → 100

2. Deposit 50 GBC
   └─> User approve + deposit
       └─> Blockchain emit Deposit event
           └─> Listener detect
               └─> Call API /api/deposit/process
                   └─> DB update
                       └─> ✅ Balance: 100 → 150

3. Withdraw 30 GBC
   └─> User withdraw
       └─> Blockchain emit Withdraw event
           └─> Listener detect
               └─> Call API /api/withdrawal/process
                   └─> DB update
                       └─> ✅ Balance: 150 → 120
                           └─> GBC ke wallet
```

---

## 💡 Tips Testing

1. **Testing Berurutan:** Lakukan Test 1 → 2 → 3 sesuai urutan
2. **Tunggu 3 Block Confirmations:** Jangan panic kalau database belum update instant, tunggu ~15-30 detik
3. **Check Logs Selalu:** Terminal server logs adalah sumber truth
4. **Gunakan Prisma Studio:** Lebih mudah lihat database real-time
5. **Save Contract Addresses:** Biar tidak deploy ulang
6. **MetaMask Activity:** Check tab Activity untuk lihat all transactions

---

## 🚨 Important Notes

1. **Gas Fee:** Setiap transaction butuh ~0.001-0.01 MATIC
2. **Block Time:** Polygon Amoy ~2-5 seconds per block
3. **Confirmations:** System tunggu 3 blocks = ~15 seconds
4. **Testnet Only:** Jangan pakai private key mainnet!
5. **RPC Limits:** Free RPC ada rate limit, kalau kena tunggu 1 menit

---

## 📚 Reference

**Contract Addresses (Update setelah deploy):**
- GBC Token: `0x...`
- Deposit Escrow: `0x...`
- Game Withdraw: `0x...`
- GBC Faucet: `0x...`

**API Endpoints:**
- Health: `GET http://localhost:3000/api/{deposit|withdrawal|faucet}/process`
- Process: `POST http://localhost:3000/api/{deposit|withdrawal|faucet}/process`

**Tools:**
- Remix: https://remix.ethereum.org/
- Polygon Amoy Explorer: https://amoy.polygonscan.com/
- Prisma Studio: `npx prisma studio`
- Faucet: https://faucet.polygon.technology/

---

## ✅ Success Criteria

Testing dianggap **BERHASIL** jika:

1. ✅ 3 transactions sukses (Faucet, Deposit, Withdraw)
2. ✅ Semua events detected oleh server
3. ✅ Semua API calls successful (no fallback ke DB)
4. ✅ Database consistent:
   - Final balance: 120 GBC
   - 3 transaction records
   - All status: COMPLETED
5. ✅ No errors di server logs
6. ✅ GBC balance di MetaMask sesuai

---

**Siap testing?** Mulai dari Fase 1! 🚀

Kalau ada error atau stuck di step mana pun, screenshot error message dan tanya langsung. Good luck! 💪

---

import { ethers } from 'ethers';
import { useCallback, useState } from 'react';

export function useDeposit() {
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  const deposit = useCallback(async (amount: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Contract instances
    const gbcToken = new ethers.Contract(
      process.env.NEXT_PUBLIC_GBC_TOKEN_ADDRESS!,
      GBC_ABI,
      signer
    );

    const depositEscrow = new ethers.Contract(
      process.env.NEXT_PUBLIC_DEPOSIT_ADDRESS!,
      DEPOSIT_ABI,
      signer
    );

    const amountWei = ethers.parseEther(amount.toString());

    try {
      // STEP 1: Check allowance
      const currentAllowance = await gbcToken.allowance(
        userAddress,
        process.env.NEXT_PUBLIC_DEPOSIT_ADDRESS!
      );

      // STEP 2: Approve unlimited if needed (ONE-TIME ONLY)
      if (currentAllowance < amountWei) {
        console.log('🔓 Requesting unlimited approval...');
        setIsApproving(true);

        const approveTx = await gbcToken.approve(
          process.env.NEXT_PUBLIC_DEPOSIT_ADDRESS!,
          ethers.MaxUint256 // UNLIMITED!
        );

        console.log('⏳ Waiting for approval confirmation...');
        await approveTx.wait();
        console.log('✅ Unlimited approval granted');

        setIsApproving(false);
      } else {
        console.log('✅ Already approved (unlimited), skip approval');
      }

      // STEP 3: Deposit
      console.log('💰 Depositing', amount, 'GBC...');
      setIsDepositing(true);

      const depositTx = await depositEscrow.deposit(amountWei);
      console.log('⏳ Waiting for deposit confirmation...');
      
      const receipt = await depositTx.wait();
      console.log('✅ Deposit successful:', receipt.hash);

      setIsDepositing(false);

      return {
        success: true,
        txHash: receipt.hash,
        amount,
      };

    } catch (error: any) {
      setIsApproving(false);
      setIsDepositing(false);

      console.error('❌ Deposit failed:', error);
      
      // Parse error message
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction rejected by user');
      } else if (error.message.includes('insufficient')) {
        throw new Error('Insufficient GBC balance');
      } else {
        throw new Error('Deposit failed. Please try again.');
      }
    }
  }, []);

  return {
    deposit,
    isApproving, // Show "Approving..." UI
    isDepositing, // Show "Depositing..." UI
  };
}
