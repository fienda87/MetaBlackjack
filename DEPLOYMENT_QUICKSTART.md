# 🎯 Quick Start - Deployment Summary

## 📁 File Panduan yang Tersedia

1. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Panduan lengkap deployment step-by-step
2. **[PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)** - Checklist sebelum deploy
3. **[.env.production.example](.env.production.example)** - Template environment variables untuk production

## 🚀 Cara Deploy (Singkat)

### Opsi 1: Otomatis (Recommended)

**Windows:**
```cmd
prepare-deploy.bat
```

**Linux/Mac:**
```bash
chmod +x prepare-deploy.sh
./prepare-deploy.sh
```

Script ini akan otomatis:
- ✅ Pull latest changes
- ✅ Install dependencies
- ✅ Generate Prisma client
- ✅ Test build
- ✅ Run linter
- ✅ Check uncommitted changes

### Opsi 2: Manual

```bash
# 1. Install & test
npm install
npx prisma generate
npm run build

# 2. Commit & push
git add .
git commit -m "chore: prepare for deployment"
git push origin main

# 3. Follow DEPLOYMENT_GUIDE.md
```

## 📋 Deployment Steps Overview

### 1️⃣ Cleanup Project (5 menit)
```bash
.\cleanup-unused-files.bat  # Windows
./cleanup-unused-files.sh   # Linux/Mac
```

### 2️⃣ Setup Vercel (10 menit)
1. Buka https://vercel.com
2. Import GitHub repo `ippll`
3. Add environment variables dari [.env.production.example](.env.production.example)
4. Deploy!

### 3️⃣ Setup Upstash Redis (5 menit)
1. Buka https://upstash.com
2. Create database (region: Singapore)
3. Copy REDIS_URL
4. Update di Vercel environment variables

### 4️⃣ Test Deployment (5 menit)
```bash
# Health check
curl https://your-app.vercel.app/api/health

# Test game
# Buka https://your-app.vercel.app di browser
```

**Total waktu: ~25 menit**

## 🔐 Environment Variables yang Dibutuhkan

### Must Have (Wajib):
```env
DATABASE_URL               # Supabase pooled
REDIS_URL                  # Upstash
NEXT_PUBLIC_APP_URL        # Vercel domain
BACKEND_PRIVATE_KEY        # Wallet key
INTERNAL_API_KEY           # API auth
NEXT_PUBLIC_RPC_URL        # Alchemy
```

### Contract Addresses:
```env
NEXT_PUBLIC_GBC_TOKEN_ADDRESS
NEXT_PUBLIC_FAUCET_ADDRESS
NEXT_PUBLIC_DEPOSIT_ADDRESS
NEXT_PUBLIC_WITHDRAW_ADDRESS
NEXT_PUBLIC_CHAIN_ID
```

**📄 Full list:** [.env.production.example](.env.production.example)

## ⚡ Quick Links

| Service | URL | Purpose |
|---------|-----|---------|
| **Vercel** | https://vercel.com/new | Deploy frontend + API |
| **Upstash** | https://console.upstash.com/ | Redis database |
| **Supabase** | https://app.supabase.com/ | PostgreSQL (already setup) |
| **Alchemy** | https://dashboard.alchemy.com/ | Blockchain RPC |

## 🎯 Deployment Checklist (Quick)

**Pre-Deployment:**
- [ ] Run `prepare-deploy.bat/sh`
- [ ] Build succeeds locally
- [ ] No secrets in Git

**Vercel:**
- [ ] Import repo
- [ ] Add environment variables
- [ ] Deploy successful

**Post-Deployment:**
- [ ] Health check OK: `/api/health`
- [ ] Frontend loads
- [ ] Wallet connects
- [ ] Game works

## 📞 Need Help?

1. Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) untuk detail lengkap
2. Check [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) untuk troubleshooting
3. Lihat Vercel logs untuk debug

## 🎉 After Deployment

Project kamu akan live di:
```
https://your-app-name.vercel.app
```

Share link ini ke teman-teman untuk main game blackjack kamu!

---

**Next:** Buka [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) untuk panduan lengkap
