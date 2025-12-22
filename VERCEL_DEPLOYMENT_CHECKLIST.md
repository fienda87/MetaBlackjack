# ✅ VERCEL DEPLOYMENT - FINAL CHECKLIST

## 🎯 Pre-Deployment (Local)

- [x] Dependencies installed: `npm install --legacy-peer-deps`
- [x] Build successful: `npm run build`
- [x] Prisma client generated: `npx prisma generate`
- [x] No uncommitted changes: `git status`
- [x] All changes pushed to main: `git push origin main`
- [x] `.env` files in `.gitignore`: `cat .gitignore | grep .env`
- [x] No secrets committed: `git log --all --full-history -- .env`

---

## 🌐 Vercel Setup (5 Steps)

### **Step 1: Create Vercel Account**
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Authorize Vercel to access repos

### **Step 2: Import GitHub Repository**
- [ ] Click "Add New Project"
- [ ] Select `ippll` repository
- [ ] Click "Import"

### **Step 3: Configure Project Settings**
- [ ] Framework: **Next.js** (auto-detected)
- [ ] Root Directory: `./`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install --legacy-peer-deps`

### **Step 4: Add Environment Variables**

Copy these from [.env.production.example](.env.production.example) and paste to Vercel:

**Database & Cache:**
```
DATABASE_URL = postgresql://postgres.cjsuqufeorypuvulowbh:ippl123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10

REDIS_URL = redis://default:PASSWORD@HOST.upstash.io:6379
(Generate from Upstash - see Step 5 below)
```

**App URLs:**
```
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
(Update after getting Vercel domain)

NEXT_PUBLIC_CHAIN_ID = 80002
NEXT_PUBLIC_NETWORK_NAME = Polygon Amoy Testnet
NEXT_PUBLIC_RPC_URL = https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
NEXT_PUBLIC_WS_URL = wss://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
```

**Contract Addresses:**
```
NEXT_PUBLIC_GBC_TOKEN_ADDRESS = 0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
NEXT_PUBLIC_FAUCET_ADDRESS = 0x53Bc482ac565EbCE20d39EEd1214eB9bbe9bE06D
NEXT_PUBLIC_DEPOSIT_ADDRESS = 0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22
NEXT_PUBLIC_WITHDRAW_ADDRESS = 0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3
```

**Private Keys (SENSITIVE):**
```
BACKEND_PRIVATE_KEY = your_production_private_key
BACKEND_SIGNER_PRIVATE_KEY = your_production_private_key
INTERNAL_API_KEY = ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615
```

**APIs:**
```
POLYGONSCAN_API_KEY = 5ZPUC94CZ2F7DYA8RTPHJ1QT41XF4KEFCH
```

### **Step 5: Setup Upstash Redis (5 minutes)**

1. Go to https://console.upstash.com
2. Click "Create Database"
3. Configure:
   - Name: `ippll-redis-production`
   - Region: `ap-southeast-1` (Singapore)
   - TLS: Enabled
4. Copy Redis URL: `redis://default:PASSWORD@HOST.upstash.io:6379`
5. Add to Vercel env vars as `REDIS_URL`

### **Step 6: Deploy!**
- [ ] Click "Deploy"
- [ ] Wait 3-5 minutes for build & deployment
- [ ] Get your Vercel domain: `https://xxx.vercel.app`

### **Step 7: Update NEXT_PUBLIC_APP_URL**
- [ ] Copy your Vercel domain
- [ ] Go to Project Settings → Environment Variables
- [ ] Update `NEXT_PUBLIC_APP_URL` dengan domain sebenarnya
- [ ] Redeploy (Vercel auto-redeploy)

---

## 🧪 Post-Deployment Testing

### **1. Health Check**
```bash
curl https://your-app.vercel.app/api/health
```
Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "..."
}
```

### **2. Frontend Check**
- [ ] Open https://your-app.vercel.app in browser
- [ ] Page loads without errors
- [ ] Console has no critical errors

### **3. Wallet Connection**
- [ ] Click "Connect Wallet"
- [ ] MetaMask opens
- [ ] Select Polygon Amoy Testnet
- [ ] Connect successful

### **4. Game Functionality**
- [ ] Able to play game
- [ ] Deposit tokens works
- [ ] Withdraw tokens works
- [ ] Game balance updates

### **5. Blockchain Integration**
- [ ] Check transaction on Polygonscan
- [ ] Verify gas fees reasonable
- [ ] Token balance updates correct

---

## 📊 Deployment Checklist Summary

| Item | Status |
|------|--------|
| Build test passed | ✅ |
| Dependencies fixed | ✅ |
| Code pushed to main | ✅ |
| Vercel project created | ⏳ |
| Environment variables added | ⏳ |
| Upstash Redis setup | ⏳ |
| Deployment successful | ⏳ |
| Health check OK | ⏳ |
| Wallet connection works | ⏳ |
| Game playable | ⏳ |

---

## 🔐 Important Reminders

⚠️ **SECURITY:**
- Never commit `.env` files
- Rotate keys for production
- Use strong INTERNAL_API_KEY
- Enable CORS carefully
- Monitor Vercel logs for errors

⚠️ **PERFORMANCE:**
- Database connection limit set to 1 (for serverless)
- Redis caching enabled
- Prisma client generated
- Images optimized

⚠️ **MONITORING:**
- Enable Vercel Analytics
- Check logs regularly
- Setup uptime monitoring (optional)
- Monitor costs

---

## 🎯 Quick Start Links

| Step | Link |
|------|------|
| **1. Vercel** | https://vercel.com/new |
| **2. GitHub** | https://github.com/login |
| **3. Supabase** | https://app.supabase.com |
| **4. Upstash** | https://console.upstash.com |
| **5. Alchemy** | https://dashboard.alchemy.com |

---

## 📞 Need Help?

1. **Vercel Docs:** https://vercel.com/docs
2. **Next.js Docs:** https://nextjs.org/docs
3. **Prisma Docs:** https://www.prisma.io/docs
4. **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🎉 Success Message

After deployment:

```
Your app is now LIVE! 🚀

URL: https://your-app.vercel.app

Share this link with friends to play your game!
```

---

**Created:** December 22, 2025
**Project:** ippll (Blackjack Game)
**Status:** Ready for Vercel Deployment ✅
