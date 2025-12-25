# DATABASE_URL Configuration Guide

Based on your request, here is the complete configuration for `DATABASE_URL=postgresql://postgres:NTYXLYcPAgRGgvhiwNDWtdMJSNkrevJt@postgres-jp9y.railway.internal:5432/railway`

## 🔧 Where to Configure

### 1. Railway Console (Production) ⭐ RECOMMENDED

**This is where your DATABASE_URL actually needs to be configured**

1. Go to Railway project dashboard
2. Select your app service (not PostgreSQL service)
3. Click on "Variables" tab
4. Click "New Variable"
5. Set:
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:NTYXLYcPAgRGgvhiwNDWtdMJSNkrevJt@postgres-jp9y.railway.internal:5432/railway`

Railway will automatically inject this at runtime and override the build-time fallback.

### 2. Local Development

**File**: `.env` (NOT committed to git)
```env
DATABASE_URL="postgresql://postgres:NTYXLYcPAgRGgvhiwNDWtdMJSNkrevJt@postgres-jp9y.railway.internal:5432/railway"
DIRECT_URL="postgresql://postgres:NTYXLYcPAgRGgvhiwNDWtdMJSNkrevJt@postgres-jp9y.railway.internal:5432/railway"
```

**⚠️ Security Warning**: `.env` is already in `.gitignore` (line 34: `.env*`), so this file will NOT be committed. Perfect for sensitive credentials!

### 3. Docker Build Fallback (Already Fixed)

**File**: `Dockerfile`
```dockerfile
# In builder stage (line 60)
ENV DATABASE_URL='postgresql://build:build@localhost/build'
```

**Purpose**: Only needed during Docker build to prevent errors. Never used at runtime.

## 📂 Current File Status

- ✅ `.env.example` - Template for reference (safe to commit)
- ✅ `.env` - Created with your DATABASE_URL (safe, ignored by git)
- ✅ `.gitignore` - Correctly ignores `.env*` files
- ✅ `Dockerfile` - Build-time fallback already added

## ⚠️ DO NOT Configure Here

❌ **package.json**: Don't hardcode sensitive URLs
❌ **Source code**: Never commit database credentials
❌ **Dockerfile**: Don't put real credentials (use build-time fallback only)

## 🚀 Deployment Steps

1. **Add to Railway Variables** (do this first!)
   ```bash
   DATABASE_URL=postgresql://postgres:NTYXLYcPAgRGgvhiwNDWtdMJSNkrevJt@postgres-jp9y.railway.internal:5432/railway
   ```

2. **Verify**: After deployment, check Railway logs to confirm real DATABASE_URL is being used

3. **Local Testing**: Use `.env` file for development

## 🔐 Security Notes

- Database credentials should never be committed to git
- Railway encrypts environment variables at rest
- Connection is secure (Railway uses internal networking)
- Password is protected within Railway's infrastructure

## ✅ Expected Behavior

| Stage | DATABASE_URL Used | Source |
|-------|-------------------|--------|
| Docker Build | `postgresql://build:build@localhost/build` | Dockerfile ENV |
| Railway Runtime | Your real URL | Railway Variables |
| Local Dev | Your real URL | `.env` file |
| Fallback | `postgresql://fallback...` | `src/lib/db.ts` |

## 🆘 Troubleshooting

If Railway shows database connection errors:
1. ✅ Verify DATABASE_URL in Railway Variables tab
2. ✅ Ensure PostgreSQL service is "green" (running)
3. ✅ Restart the app service to refresh environment
4. ✅ Check logs for connection attempts

## 📚 References

- **Railway**: See `RAILWAY.md` line 29 for DATABASE_URL configuration
- **Database**: See `.env.example` line 4-5 for URL format
- **Docker**: See `Dockerfile` line 60 for build-time fallback
- **Git Ignore**: See `.gitignore` line 34-35 for security
