# 🚀 VERCEL DEPLOYMENT - FINAL QUICK GUIDE

## ✅ Status: Ready to Deploy!

Semua sudah siap. Tinggal 3 langkah untuk go live!

---

## 🎯 3 Langkah Deploy (10 menit total)

### **STEP 1: Setup Upstash Redis (3 menit)**

1. Buka: https://console.upstash.com
2. Klik "Create Database"
3. Set:
   - Name: `ippll-redis-prod`
   - Region: `ap-southeast-1` (Singapore)
4. **Copy Redis URL** (format: `redis://default:PASSWORD@HOST.upstash.io:6379`)

### **STEP 2: Deploy ke Vercel (5 menit)**

1. Buka: https://vercel.com/new
2. Login dengan GitHub
3. Select repo: `ippll`
4. Click "Import"
5. Configure:
   - Framework: **Next.js** (auto)
   - Build Command: `npm run build`
   - Environment: Paste ini:

```
DATABASE_URL=postgresql://postgres.cjsuqufeorypuvulowbh:ippl123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10

REDIS_URL=<paste dari Upstash>

NEXT_PUBLIC_APP_URL=https://xxx.vercel.app
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_NETWORK_NAME=Polygon Amoy Testnet
NEXT_PUBLIC_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
NEXT_PUBLIC_WS_URL=wss://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA

NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
NEXT_PUBLIC_FAUCET_ADDRESS=0x53Bc482ac565EbCE20d39EEd1214eB9bbe9bE06D
NEXT_PUBLIC_DEPOSIT_ADDRESS=0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22
NEXT_PUBLIC_WITHDRAW_ADDRESS=0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3

BACKEND_PRIVATE_KEY=260755060d306bcff4f7624783761c360a556fca94d5c86b1bb94d8260d618d4
BACKEND_SIGNER_PRIVATE_KEY=260755060d306bcff4f7624783761c360a556fca94d5c86b1bb94d8260d618d4
INTERNAL_API_KEY=ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615

POLYGONSCAN_API_KEY=5ZPUC94CZ2F7DYA8RTPHJ1QT41XF4KEFCH
```

6. Click **"Deploy"**
7. Wait 3-5 minutes...
8. Get your URL: `https://xxx.vercel.app` ✅

### **STEP 3: Update NEXT_PUBLIC_APP_URL (2 menit)**

1. Copy domain dari Vercel (e.g., `ippll-xi-pied.vercel.app`)
2. Go to Vercel Project Settings → Environment Variables
3. Find `NEXT_PUBLIC_APP_URL`
4. Change to: `https://ippll-xi-pied.vercel.app` (ganti dengan domain kamu)
5. Vercel auto-redeploy ✅

---

## ✨ DONE! 

Project live di: **`https://your-domain.vercel.app`** 🎉

---

## 🧪 Test Setelah Deploy

```bash
# Health check
curl https://your-domain.vercel.app/api/health

# Should return:
# {"status":"ok","database":"connected","redis":"connected"}
```

---

## 📋 Environment Variables Reference

**Database (Supabase):**
- Sudah setup sebelumnya, gunakan pooled URL

**Redis (Upstash):**
- Buat baru di step 1

**Blockchain (Alchemy):**
- RPC URL sudah ada, jangan diganti

**Contracts:**
- Address sudah di-deploy ke Polygon Amoy

**Private Keys:**
- Gunakan yang sudah ada atau generate baru untuk production

---

## ⚡ Quick Reference

| Item | Value |
|------|-------|
| Database | Supabase (pooled) |
| Cache | Upstash Redis |
| Hosting | Vercel |
| Network | Polygon Amoy Testnet (80002) |
| Build | `npm run build` |
| Start | Vercel serverless |

---

## 🎊 Share Your Game!

After deployment, share this link:
```
https://your-domain.vercel.app
```

Friends dapat:
- 🎮 Play blackjack game
- 💰 Deposit GBC tokens
- 🎲 Withdraw winnings
- 🔗 Connect Web3 wallet

---

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| Build failed | Check Vercel logs |
| Redis timeout | Verify REDIS_URL in env vars |
| Database error | Check DATABASE_URL pooling format |
| Wallet connection | Ensure Polygon Amoy selected |

---

**For detailed help:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Created:** December 22, 2025
**Status:** ✅ READY FOR PRODUCTION
