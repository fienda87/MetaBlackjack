# Railway Deployment Fix - Summary

## Problem
The application failed to deploy on Railway with the error:
```
Invalid value undefined for datasource "db" provided to PrismaClient constructor
```

This occurred because:
1. Railway deployment didn't have PostgreSQL database configured
2. DATABASE_URL environment variable was not set/undefined
3. Build succeeded (TypeScript compilation) but failed during runtime when accessing the database

## Root Cause
This was an **infrastructure/configuration issue**, not a code issue:
- Railway requires PostgreSQL to be added as a separate service
- DATABASE_URL is auto-generated when PostgreSQL is added
- Without PostgreSQL, Prisma Client can't initialize with undefined datasource

## Changes Made

### 1. Enhanced Error Handling in `src/lib/db.ts`
**Before:**
```typescript
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL  // Could be undefined!
      }
    },
    // ...
  })
```

**After:**
```typescript
// Validate DATABASE_URL before initializing PrismaClient
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set.\n\n' +
    'To fix this issue:\n' +
    '1. If deploying to Railway: Add PostgreSQL plugin to your Railway project\n' +
    '   - Go to Railway dashboard → Click "Create" or "Add Service"\n' +
    '   - Select "PostgreSQL" and deploy\n' +
    '   - DATABASE_URL will be auto-generated and available\n\n' +
    '2. For local development: Create a .env file with DATABASE_URL\n' +
    '   Example: DATABASE_URL="postgresql://user:password@localhost:5432/blackjack"\n\n' +
    '3. For manual Railway setup: Add DATABASE_URL in Variables tab\n' +
    '   Format: postgresql://user:password@host:port/database\n\n' +
    'See .env.example for all required environment variables.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // ... (datasources removed - using Prisma schema default)
  })
```

**Benefits:**
- Clear, actionable error message when DATABASE_URL is missing
- Provides specific steps to fix the issue
- Prevents cryptic Prisma errors
- Guides users to add PostgreSQL to Railway

### 2. Enhanced Error Handling in `src/lib/production-db.ts`
Same validation added as above for the production database wrapper.

### 3. Updated Build Scripts in `package.json`
**Added Railway-specific build script:**
```json
"build:railway": "npx prisma migrate deploy && npx prisma generate && next build"
```

**Updated default build script:**
```json
"build": "npx prisma generate && next build"
```

**Benefits:**
- Ensures Prisma client is always generated before build
- Railway-specific script includes automatic migrations
- Prevents build failures due to missing Prisma client

### 4. Created Comprehensive Railway Deployment Guide (`RAILWAY.md`)
New documentation covering:
- Quick start guide for Railway deployment
- Step-by-step PostgreSQL setup (the critical missing piece)
- Redis setup for caching
- Environment variable configuration
- Build and deployment settings
- Troubleshooting common Railway issues
- Database migrations
- Custom domain setup
- Security best practices
- Cost optimization tips
- Pre-deployment checklist

### 5. Updated Troubleshooting Guide (`TROUBLESHOOTING.md`)
Added new section: "Railway Deployment Issues" with:
- "Invalid value undefined for datasource 'db'" (most common error)
- "Build succeeds but page data collection fails"
- "PrismaClientInitializationError: Invalid connection string"
- "Cannot connect to database: Connection refused"

Each issue includes:
- Error message
- Symptoms
- Root cause
- Step-by-step solution

## How to Deploy to Railway (Fixed)

### Step 1: Add PostgreSQL to Railway
1. Go to Railway project dashboard
2. Click "New Service" or "Add Service"
3. Select "PostgreSQL"
4. Click "Add PostgreSQL" or "Deploy"
5. Railway automatically:
   - Provisions PostgreSQL database
   - Generates DATABASE_URL environment variable
   - Connects it to your app

### Step 2: Configure Build Settings
In Railway app service → Settings → Build & Deploy:
- **Build Command**: `npm run build:railway` (or `npm run build`)
- **Start Command**: `npm run start`
- **Root Directory**: `/`

### Step 3: Add Environment Variables
In Railway app service → Variables tab:

Required:
```bash
DATABASE_URL=postgresql://postgres:password@host.railway.app:5432/railway
REDIS_URL=redis://host:port
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BACKEND_PRIVATE_KEY=0x... (generate unique key)
INTERNAL_API_KEY=... (generate unique key)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### Step 4: Deploy
1. Commit and push changes to GitHub
2. Railway auto-deploys
3. Monitor logs in Railway dashboard

## Verification

### Check DATABASE_URL is Set
In Railway app service → Variables tab, you should see:
```
DATABASE_URL=postgresql://postgres:xxx@xxx.railway.app:5432/railway
```

### Health Check
After deployment, visit:
```
https://your-app.railway.app/api/health
```
Should return: `{"status":"ok"}`

### Database Connection
The app should now:
- Build successfully without errors
- Start without "Invalid value undefined" errors
- Collect page data successfully
- Connect to database at runtime

## Acceptance Criteria Met

✅ DATABASE_URL environment variable validation added with clear error messages
✅ Error handling in both `db.ts` and `production-db.ts`
✅ Railway deployment guide created (`RAILWAY.md`)
✅ Troubleshooting guide updated with Railway-specific issues
✅ Build scripts updated for Railway compatibility
✅ Clear instructions for adding PostgreSQL to Railway
✅ Step-by-step deployment process documented
✅ Prisma client generation included in build process
✅ Automatic database migrations configured for Railway

## Files Modified

1. `src/lib/db.ts` - Added DATABASE_URL validation
2. `src/lib/production-db.ts` - Added DATABASE_URL validation
3. `package.json` - Updated build scripts for Railway
4. `TROUBLESHOOTING.md` - Added Railway deployment issues section

## Files Created

1. `RAILWAY.md` - Complete Railway deployment guide
2. `RAILWAY_FIX_SUMMARY.md` - This summary file

## Important Notes

1. **This is primarily an infrastructure fix**: The actual solution is adding PostgreSQL to Railway, not code changes
2. **Code changes improve error handling**: The validation makes the error message clear and actionable
3. **Documentation is key**: Railway deployment guide provides comprehensive setup instructions
4. **Build script improvements**: Ensures Prisma client is always generated, preventing other build failures

## Related Documentation

- [RAILWAY.md](./RAILWAY.md) - Complete Railway deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Troubleshooting common issues
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Production deployment checklist
- [.env.example](./.env.example) - Environment variable examples
