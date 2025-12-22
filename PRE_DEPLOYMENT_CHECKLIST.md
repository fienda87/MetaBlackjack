# ✅ Pre-Deployment Checklist

Checklist ini harus diselesaikan SEBELUM deploy ke production.

## 🔐 Security

- [ ] `.env` dan `.env.local` ada di `.gitignore`
- [ ] No secrets committed to Git history
  ```bash
  git log --all --full-history --oneline -- .env
  ```
- [ ] Generate new production keys:
  ```bash
  # Generate new INTERNAL_API_KEY
  openssl rand -hex 32
  
  # Generate new wallet (gunakan wallet baru untuk production)
  ```
- [ ] Backup semua credentials:
  ```bash
  mkdir C:\backup-production
  copy .env C:\backup-production\.env.backup
  ```

## 🧹 Code Cleanup

- [ ] Remove unused files:
  ```bash
  .\cleanup-unused-files.bat
  ```
- [ ] Remove console.logs di production code
- [ ] Remove commented code
- [ ] Update README.md dengan production info

## 🗄️ Database

- [ ] Prisma schema up to date
- [ ] All migrations applied:
  ```bash
  npx prisma migrate status
  ```
- [ ] Database backup created (Supabase auto-backup enabled)
- [ ] Indexes optimized untuk production queries
- [ ] Connection pooling configured (pgbouncer)

## 🏗️ Build & Test

- [ ] Build succeeds locally:
  ```bash
  npm run build
  ```
- [ ] All tests pass:
  ```bash
  npm test
  ```
- [ ] TypeScript no errors:
  ```bash
  npx tsc --noEmit
  ```
- [ ] ESLint no critical errors:
  ```bash
  npm run lint
  ```

## 📦 Dependencies

- [ ] All dependencies installed:
  ```bash
  npm install
  ```
- [ ] No security vulnerabilities:
  ```bash
  npm audit
  ```
- [ ] Package.json scripts configured:
  ```json
  {
    "scripts": {
      "build": "npx prisma generate && next build",
      "postinstall": "prisma generate"
    }
  }
  ```

## 🌐 Configuration Files

- [ ] `.gitignore` updated and correct
- [ ] `next.config.ts` production ready
- [ ] `tsconfig.json` configured correctly
- [ ] `prisma/schema.prisma` correct provider
- [ ] `vercel.json` configured (if needed)

## 🔌 Third-Party Services

- [ ] Alchemy RPC URL valid dan tidak rate limited
- [ ] Supabase database accessible
- [ ] Polygonscan API key valid
- [ ] Upstash Redis account created (akan dibuat saat deploy)

## 📝 Documentation

- [ ] README.md updated dengan:
  - Live URL
  - Features
  - Tech stack
  - Setup instructions
- [ ] API documentation updated
- [ ] Deployment guide reviewed ([DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))

## 🚀 Git Repository

- [ ] All changes committed:
  ```bash
  git status
  ```
- [ ] No sensitive data in commits:
  ```bash
  git log --all --full-history -- .env .env.local
  ```
- [ ] Pushed to main branch:
  ```bash
  git push origin main
  ```
- [ ] Repository public/private as intended

## 📊 Monitoring Setup (Optional tapi recommended)

- [ ] Vercel Analytics enabled
- [ ] Sentry error tracking setup (optional)
- [ ] Log aggregation configured
- [ ] Uptime monitoring (optional)

## 🎯 Environment Variables Prepared

- [ ] List semua environment variables yang dibutuhkan
- [ ] Copy dari [.env.production.example](.env.production.example)
- [ ] Values ready untuk paste ke Vercel
- [ ] Production keys generated (beda dari development)

## 🧪 Final Tests

- [ ] Frontend loads correctly
- [ ] API routes respond
- [ ] Database queries work
- [ ] Wallet connection works
- [ ] Game logic functions
- [ ] Blockchain integration works

---

## ✨ Ready to Deploy!

Jika semua checklist di atas sudah ✅, kamu siap deploy!

Lanjut ke: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 🐛 Common Issues

### Build Error: "Cannot find module"
```bash
npm install
npm run build
```

### Prisma Error: "Client not generated"
```bash
npx prisma generate
npm run build
```

### TypeScript Error
```bash
npx tsc --noEmit
# Fix errors shown
```

### Git tracking .env
```bash
git rm --cached .env .env.local
git commit -m "Remove env files from tracking"
```
