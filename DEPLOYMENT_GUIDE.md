# 🚀 Panduan Deployment Lengkap

## 📋 Daftar Isi
1. [Persiapan Sebelum Deploy](#persiapan)
2. [Setup Vercel (Frontend + API)](#vercel)
3. [Setup Redis (Upstash)](#redis)
4. [Setup Railway (Optional - Background Workers)](#railway)
5. [Environment Variables](#environment)
6. [Testing & Verification](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Arsitektur Deployment

```
┌─────────────────────────────────────┐
│  VERCEL                             │
│  - Next.js Frontend                 │
│  - API Routes (/api/*)              │
│  - Serverless Functions             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SUPABASE (existing)                │
│  - PostgreSQL Database              │
│  - Pooled Connection (pgbouncer)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  UPSTASH REDIS                      │
│  - Cache Layer                      │
│  - Session Storage                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  RAILWAY (Optional)                 │
│  - Blockchain Event Listeners       │
│  - Background Workers               │
└─────────────────────────────────────┘
```

---

## 🔧 Persiapan Sebelum Deploy {#persiapan}

### 1. Cleanup Project

Jalankan script cleanup yang sudah dibuat:
```bash
# Windows
.\cleanup-unused-files.bat

# Linux/Mac
chmod +x cleanup-unused-files.sh
./cleanup-unused-files.sh
```

### 2. Backup Secrets

**PENTING:** Backup semua credentials sebelum deploy!

```bash
# Buat folder backup di luar repo
mkdir C:\backup-env
copy .env C:\backup-env\.env.backup
copy .env.local C:\backup-env\.env.local.backup
```

### 3. Pastikan .gitignore Sudah Benar

Cek file `.gitignore`:
```gitignore
# Environment
.env
.env.local
.env*.local

# Dependencies
node_modules/
blockchain/node_modules/

# Build
.next/
out/
dist/
build/

# Database
prisma/db/
*.db
*.db-journal

# Blockchain
blockchain/artifacts/
blockchain/cache/
blockchain/contracts/.deps/
blockchain/contracts/.states/
blockchain/contracts/.deploys/
blockchain/contracts/artifacts/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Archive
.archive/
```

### 4. Commit Changes

```bash
# Pastikan .env tidak ter-track
git rm --cached .env .env.local -f

# Add .gitignore
git add .gitignore

# Commit cleanup
git add .
git commit -m "chore: cleanup unused files and prepare for deployment"
git push origin main
```

---

## 🌐 Setup Vercel (Frontend + API) {#vercel}

### Step 1: Buat Account Vercel

1. Buka https://vercel.com
2. Sign up dengan GitHub account
3. Authorize Vercel untuk access GitHub repos

### Step 2: Import Project

1. Di Vercel Dashboard, klik **"Add New Project"**
2. Pilih repository `ippll`
3. Configure project:

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Step 3: Configure Environment Variables

Di Vercel Project Settings → Environment Variables, tambahkan:

#### **Production Environment:**

```env
# Database (Supabase - pooled connection)
DATABASE_URL=postgresql://postgres.cjsuqufeorypuvulowbh:ippl123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10

# Redis (akan diisi setelah setup Upstash)
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379

# Blockchain - Public Variables
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
NEXT_PUBLIC_FAUCET_ADDRESS=0x53Bc482ac565EbCE20d39EEd1214eB9bbe9bE06D
NEXT_PUBLIC_DEPOSIT_ADDRESS=0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22
NEXT_PUBLIC_WITHDRAW_ADDRESS=0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_NETWORK_NAME=Polygon Amoy Testnet
NEXT_PUBLIC_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
NEXT_PUBLIC_WS_URL=wss://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Private Keys (SENSITIVE - only for API routes)
BACKEND_PRIVATE_KEY=260755060d306bcff4f7624783761c360a556fca94d5c86b1bb94d8260d618d4
BACKEND_SIGNER_PRIVATE_KEY=260755060d306bcff4f7624783761c360a556fca94d5c86b1bb94d8260d618d4
INTERNAL_API_KEY=ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615

# RPC URLs
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA

# API Keys
POLYGONSCAN_API_KEY=5ZPUC94CZ2F7DYA8RTPHJ1QT41XF4KEFCH
```

**PENTING:** 
- Ganti `your-app.vercel.app` dengan domain Vercel yang sebenarnya setelah deploy
- Untuk production, rotate semua private keys dan API keys
- Jangan pernah share keys ini di public!

### Step 4: Deploy

1. Klik **"Deploy"**
2. Tunggu build process (3-5 menit)
3. Jika sukses, kamu akan dapat URL: `https://your-app.vercel.app`

### Step 5: Update NEXT_PUBLIC_APP_URL

Setelah mendapat domain Vercel:
1. Kembali ke Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` dengan domain sebenarnya
3. Redeploy (Vercel akan auto-redeploy)

---

## 🔴 Setup Redis (Upstash) {#redis}

### Step 1: Buat Account Upstash

1. Buka https://upstash.com
2. Sign up (free tier)
3. Verify email

### Step 2: Buat Redis Database

1. Di Dashboard, klik **"Create Database"**
2. Configure:
   ```
   Name: ippll-redis-production
   Type: Regional
   Region: ap-southeast-1 (Singapore) - dekat dengan Supabase
   TLS: Enabled
   Eviction: No eviction
   ```
3. Klik **"Create"**

### Step 3: Copy Redis URL

1. Di database detail, copy **REST URL** dan **Redis URL**
2. Format: `redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379`

### Step 4: Update Vercel Environment Variables

1. Kembali ke Vercel Project Settings → Environment Variables
2. Update atau tambahkan:
   ```env
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
   ```
3. Redeploy

### Step 5: Test Redis Connection

Setelah deploy, test dengan membuka:
```
https://your-app.vercel.app/api/health
```

Jika Redis configured, akan return status Redis connection.

---

## 🚂 Setup Railway (Optional - Background Workers) {#railway}

**Catatan:** Hanya jika kamu butuh background workers untuk blockchain event listeners.

### Step 1: Buat Account Railway

1. Buka https://railway.app
2. Sign up dengan GitHub
3. Verify email

### Step 2: Buat New Project

1. Di Dashboard, klik **"New Project"**
2. Pilih **"Deploy from GitHub repo"**
3. Pilih repository `ippll`

### Step 3: Configure Service

1. **Root Directory:** `./blockchain/listeners`
2. **Start Command:** `node index.js`
3. **Environment Variables:**

```env
# Database (Supabase - direct connection untuk workers)
DATABASE_URL=postgresql://postgres.cjsuqufeorypuvulowbh:ippl123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

# Redis (sama dengan Upstash)
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379

# Blockchain
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/A4JoZLknxxSS2yp27-PBA
NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a
NEXT_PUBLIC_FAUCET_ADDRESS=0x53Bc482ac565EbCE20d39EEd1214eB9bbe9bE06D
NEXT_PUBLIC_DEPOSIT_ADDRESS=0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22
NEXT_PUBLIC_WITHDRAW_ADDRESS=0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3

# Internal API
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
INTERNAL_API_KEY=ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615

# Private Keys
BACKEND_PRIVATE_KEY=260755060d306bcff4f7624783761c360a556fca94d5c86b1bb94d8260d618d4
```

### Step 4: Deploy

1. Klik **"Deploy"**
2. Check logs untuk memastikan listeners berjalan

---

## 🔐 Environment Variables Reference {#environment}

### Vercel (Frontend + API)

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | Supabase pooled connection | `postgresql://...6543/postgres?pgbouncer=true` | ✅ |
| `REDIS_URL` | Upstash Redis connection | `redis://default:...@...upstash.io:6379` | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your app URL | `https://your-app.vercel.app` | ✅ |
| `BACKEND_PRIVATE_KEY` | Wallet private key for signing | `0x...` | ✅ |
| `INTERNAL_API_KEY` | API authentication | Generate with `openssl rand -hex 32` | ✅ |
| `NEXT_PUBLIC_GBC_TOKEN_ADDRESS` | Smart contract address | `0xAb375...` | ✅ |
| `NEXT_PUBLIC_CHAIN_ID` | Polygon Amoy | `80002` | ✅ |
| `NEXT_PUBLIC_RPC_URL` | Alchemy RPC | `https://polygon-amoy.g.alchemy.com/v2/...` | ✅ |

### Railway (Background Workers)

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | Supabase direct connection | `postgresql://...5432/postgres` | ✅ |
| `REDIS_URL` | Same as Vercel | `redis://...` | ✅ |
| `POLYGON_AMOY_RPC_URL` | RPC for listeners | `https://polygon-amoy.g.alchemy.com/v2/...` | ✅ |
| `NEXT_PUBLIC_APP_URL` | Vercel app URL | `https://your-app.vercel.app` | ✅ |

---

## ✅ Testing & Verification {#testing}

### 1. Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-12-16T..."
}
```

### 2. Test Database Connection

```bash
curl https://your-app.vercel.app/api/user/wallet?address=0x1234...
```

Should return user data or create new user.

### 3. Test Redis Caching

1. Call same endpoint twice
2. Second call should be faster (cached)
3. Check Vercel logs untuk cache hits

### 4. Test Blockchain Integration

1. Connect wallet di frontend
2. Test deposit/withdraw
3. Check transaction on Polygonscan

### 5. Test Game Functionality

1. Buka `https://your-app.vercel.app`
2. Connect wallet (MetaMask)
3. Claim faucet (jika pertama kali)
4. Deposit GBC tokens
5. Play blackjack game
6. Withdraw tokens

---

## 🐛 Troubleshooting {#troubleshooting}

### Error: "Database connection failed"

**Solusi:**
1. Cek `DATABASE_URL` di Vercel environment variables
2. Pastikan format: `...6543/postgres?pgbouncer=true&connection_limit=1`
3. Test connection di Supabase dashboard
4. Redeploy Vercel

### Error: "Redis connection timeout"

**Solusi:**
1. Cek `REDIS_URL` format benar
2. Pastikan Upstash database status "Active"
3. Test dengan Redis CLI:
   ```bash
   redis-cli -u redis://default:PASSWORD@HOST.upstash.io:6379 ping
   ```
4. Check Upstash dashboard untuk rate limits

### Error: "Build failed on Vercel"

**Solusi:**
1. Check Vercel build logs
2. Common issues:
   - TypeScript errors → fix locally first
   - Missing dependencies → `npm install`
   - Prisma generate → add to build command: `npx prisma generate && next build`
3. Test build locally:
   ```bash
   npm run build
   ```

### Error: "Prisma Client not generated"

**Solusi:**
1. Tambahkan di `package.json`:
   ```json
   {
     "scripts": {
       "build": "npx prisma generate && next build",
       "postinstall": "prisma generate"
     }
   }
   ```
2. Commit & push
3. Redeploy

### Error: "API route 500 error"

**Solusi:**
1. Check Vercel Function Logs
2. Common issues:
   - Missing environment variables
   - Database connection pool exhausted
   - Redis timeout
3. Add error logging:
   ```typescript
   catch (error) {
     console.error('API Error:', error)
     logger.error('API Error', error)
   }
   ```

### Error: "Transaction failed on blockchain"

**Solusi:**
1. Check Alchemy RPC status
2. Verify contract addresses
3. Check wallet has enough MATIC for gas
4. Verify network (Amoy testnet = 80002)

### Performance Issues

**Solusi:**
1. Enable Redis caching untuk semua queries
2. Optimize Prisma queries (include only needed fields)
3. Use Vercel Edge Functions untuk static content
4. Enable Vercel Analytics untuk monitoring

---

## 📊 Post-Deployment Checklist

- [ ] Vercel deployed successfully
- [ ] All environment variables configured
- [ ] Redis connected (Upstash)
- [ ] Database connected (Supabase)
- [ ] Health check endpoint working
- [ ] Frontend loads correctly
- [ ] Wallet connection works
- [ ] Deposit/withdraw functions work
- [ ] Game functionality tested
- [ ] Blockchain listeners running (if Railway)
- [ ] Monitoring setup (Vercel Analytics)
- [ ] Error tracking enabled (Sentry optional)
- [ ] Domain configured (optional)
- [ ] SSL certificate active
- [ ] CORS configured correctly
- [ ] Rate limiting tested

---

## 🔒 Security Checklist

- [ ] All private keys only in environment variables
- [ ] `.env` files in `.gitignore`
- [ ] No secrets committed to Git
- [ ] INTERNAL_API_KEY used for sensitive endpoints
- [ ] CORS whitelist configured
- [ ] Rate limiting enabled
- [ ] Input validation on all API routes
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS prevention (React default)
- [ ] HTTPS only (Vercel default)

---

## 📈 Monitoring & Maintenance

### Vercel Dashboard

1. **Functions:** Monitor API route performance
2. **Analytics:** Track user behavior
3. **Logs:** Debug issues in real-time
4. **Deployments:** Rollback if needed

### Supabase Dashboard

1. **Database:** Monitor query performance
2. **API:** Check connection pool usage
3. **Storage:** Track database size

### Upstash Dashboard

1. **Commands:** Monitor Redis operations
2. **Memory:** Check cache usage
3. **Latency:** Track response times

### Optional: Setup Monitoring

**Sentry (Error Tracking):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Vercel Analytics:**
Already included, just enable in dashboard.

---

## 🚀 Continuous Deployment

Vercel automatically deploys on every push to `main` branch:

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

2. Vercel auto-deploys
3. Check deployment status in Vercel Dashboard
4. Preview deployments for branches

---

## 📝 Next Steps

1. **Custom Domain** (Optional):
   - Buy domain (Namecheap, GoDaddy, etc.)
   - Add to Vercel Project Settings → Domains
   - Configure DNS records

2. **Database Backups:**
   - Supabase auto-backup enabled
   - Setup scheduled exports (optional)

3. **Scale Planning:**
   - Monitor Vercel usage
   - Upgrade Supabase plan if needed
   - Consider CDN for static assets

4. **Production Optimization:**
   - Enable Vercel Image Optimization
   - Setup ISR (Incremental Static Regeneration)
   - Configure caching headers

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Upstash Docs:** https://docs.upstash.com/redis
- **Railway Docs:** https://docs.railway.app
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs

---

## ✨ Congratulations!

Project kamu sekarang sudah live dan dapat diakses publik! 🎉

**URL Production:** https://your-app.vercel.app

Share link ini dan ajak orang untuk bermain game blackjack kamu!
