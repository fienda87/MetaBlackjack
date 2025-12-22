# 🔧 Troubleshooting Common Deployment Issues

## 🚨 Error: "Prisma Client could not be located"

**Penyebab:** Prisma Client tidak ter-generate saat build di Vercel.

**Solusi:**

1. Update `package.json`:
```json
{
  "scripts": {
    "build": "npx prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

2. Commit & push:
```bash
git add package.json
git commit -m "fix: add prisma generate to build"
git push origin main
```

3. Redeploy di Vercel (auto-trigger)

---

## 🚨 Error: "Database connection failed"

**Penyebab:** Connection pooling issue atau DATABASE_URL salah.

**Solusi:**

1. **Cek DATABASE_URL format:**
```env
# BENAR (dengan pgbouncer):
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1"

# SALAH (tanpa pooling):
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

2. **Test connection:**
```bash
# Locally
npx prisma db pull

# Atau buka Supabase SQL Editor dan run:
SELECT 1;
```

3. **Update di Vercel:**
- Settings → Environment Variables
- Edit DATABASE_URL
- Redeploy

---

## 🚨 Error: "Redis connection timeout"

**Penyebab:** REDIS_URL salah atau Upstash down.

**Solusi:**

1. **Cek REDIS_URL format:**
```env
# BENAR:
REDIS_URL="redis://default:password@host.upstash.io:6379"

# SALAH:
REDIS_URL="redis://host.upstash.io:6379"  # Missing auth
```

2. **Test connection:**
```bash
redis-cli -u "redis://default:PASSWORD@HOST.upstash.io:6379" ping
```

Should return: `PONG`

3. **Check Upstash Dashboard:**
- Status harus "Active"
- Copy fresh REDIS_URL
- Update di Vercel

---

## 🚨 Error: "Build failed: TypeScript errors"

**Penyebab:** Type errors yang tidak terdeteksi locally.

**Solusi:**

1. **Run TypeScript check:**
```bash
npx tsc --noEmit
```

2. **Fix errors:**
```typescript
// Common fixes:
- Add type annotations
- Fix import paths
- Add null checks
```

3. **Test build locally:**
```bash
npm run build
```

4. **Commit & push setelah fix**

---

## 🚨 Error: "Module not found"

**Penyebab:** Dependency tidak terinstall atau import path salah.

**Solusi:**

1. **Check package.json:**
```bash
npm install
npm run build
```

2. **Fix import paths:**
```typescript
// BENAR:
import { db } from '@/lib/db'

// SALAH:
import { db } from '../../lib/db'
```

3. **Check tsconfig.json paths:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🚨 Error: "API route returns 500"

**Penyebab:** Runtime error di API endpoint.

**Solusi:**

1. **Check Vercel Function Logs:**
- Vercel Dashboard → Project → Functions
- Click pada error function
- Lihat detailed logs

2. **Common issues:**

**Missing env vars:**
```typescript
// Add validation
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}
```

**Unhandled promises:**
```typescript
// BENAR:
try {
  const result = await db.query()
  return NextResponse.json(result)
} catch (error) {
  console.error('API Error:', error)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

3. **Test locally dengan production env:**
```bash
# Copy .env.production
cp .env.production.example .env.local
# Add real values
npm run build
npm start
```

---

## 🚨 Error: "Wallet connection failed"

**Penyebab:** Wrong network atau RPC issue.

**Solusi:**

1. **Check environment variables:**
```env
NEXT_PUBLIC_CHAIN_ID="80002"  # Polygon Amoy
NEXT_PUBLIC_RPC_URL="https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY"
```

2. **Test RPC endpoint:**
```bash
curl -X POST https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Should return: `{"jsonrpc":"2.0","id":1,"result":"0x13882"}`

3. **Check MetaMask network:**
- Network Name: Polygon Amoy Testnet
- RPC URL: https://rpc-amoy.polygon.technology
- Chain ID: 80002
- Currency: MATIC

---

## 🚨 Error: "Transaction failed"

**Penyebab:** Insufficient gas, wrong contract address, atau network issue.

**Solusi:**

1. **Check contract addresses:**
```env
NEXT_PUBLIC_GBC_TOKEN_ADDRESS="0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a"
NEXT_PUBLIC_FAUCET_ADDRESS="0x53Bc482ac565EbCE20d39EEd1214eB9bbe9bE06D"
```

2. **Verify on Polygonscan:**
- Buka https://amoy.polygonscan.com/
- Search contract address
- Check if verified

3. **Check wallet:**
- Ensure connected to Amoy testnet
- Have MATIC for gas (get from faucet)
- Token balance sufficient

4. **Check transaction on explorer:**
- Copy transaction hash
- Search di Polygonscan
- Check error message

---

## 🚨 Error: "CORS blocked"

**Penyebab:** Frontend domain tidak di-whitelist.

**Solusi:**

1. **Update vercel.json:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-app.vercel.app"
        }
      ]
    }
  ]
}
```

2. **Or update Next.js config:**
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ]
  },
}
```

---

## 🚨 Error: "Rate limit exceeded"

**Penyebab:** Alchemy RPC rate limit atau Redis rate limit.

**Solusi:**

1. **Check Alchemy dashboard:**
- https://dashboard.alchemy.com/
- Check request usage
- Upgrade plan if needed

2. **Implement caching:**
```typescript
// Cache blockchain calls
const cachedBalance = await getCached(
  `balance:${address}`,
  () => contract.balanceOf(address),
  300 // 5 minutes
)
```

3. **Use Upstash rate limiting:**
```typescript
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})
```

---

## 🚨 Performance Issues

**Penyebab:** Database queries lambat atau cache tidak optimal.

**Solusi:**

1. **Add database indexes:**
```sql
-- Run di Supabase SQL Editor
CREATE INDEX idx_user_wallet ON "User"("walletAddress");
CREATE INDEX idx_game_user ON "Game"("userId");
CREATE INDEX idx_transaction_user ON "Transaction"("userId");
```

2. **Optimize Prisma queries:**
```typescript
// LAMBAT:
const user = await db.user.findUnique({
  where: { id: userId },
  include: { games: true, transactions: true }
})

// CEPAT:
const user = await db.user.findUnique({
  where: { id: userId },
  select: { id: true, username: true, balance: true }
})
```

3. **Enable Redis caching:**
```typescript
// Cache frequent queries
const stats = await getCached(
  'game:stats',
  () => db.game.aggregate(...),
  600 // 10 minutes
)
```

---

## 🔍 Debugging Tools

### 1. Vercel Logs
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs
```

### 2. Check Environment Variables
```bash
vercel env ls
vercel env pull .env.vercel
```

### 3. Local Testing with Production Env
```bash
# Copy production env
vercel env pull .env.local

# Run locally
npm run dev
```

### 4. Prisma Studio (Database GUI)
```bash
npx prisma studio
```

### 5. Redis CLI (Upstash)
```bash
redis-cli -u "redis://default:PASSWORD@HOST.upstash.io:6379"
> KEYS *
> GET key_name
```

---

## 📞 Still Having Issues?

1. **Check Vercel Status:** https://www.vercel-status.com/
2. **Check Supabase Status:** https://status.supabase.com/
3. **Check Upstash Status:** https://status.upstash.com/
4. **Vercel Support:** https://vercel.com/support
5. **Review logs carefully** - error messages biasanya jelas

---

## ✅ Prevention Tips

1. **Always test locally first:**
```bash
npm run build
npm start
```

2. **Use environment variable validation:**
```typescript
const requiredEnvs = [
  'DATABASE_URL',
  'REDIS_URL',
  'NEXT_PUBLIC_APP_URL'
]

requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    throw new Error(`${env} is required`)
  }
})
```

3. **Enable error tracking (Sentry):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

4. **Monitor regularly:**
- Set up Vercel Analytics
- Check logs daily
- Monitor database size
- Track Redis usage

5. **Keep dependencies updated:**
```bash
npm outdated
npm update
```

---

**Need more help?** Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) untuk detail lengkap.
