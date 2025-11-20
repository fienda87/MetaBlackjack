# 🚀 **Deployment Guide - Vercel**

## 📋 **Overview**
Panduan lengkap untuk deploy aplikasi NFT Staking Game ke Vercel platform.

---

## 🌟 **Kenapa Vercel?**

### ✅ **Keuntungan Vercel**
- **Zero Configuration** - Auto-detect Next.js project
- **Global CDN** - Distribusi worldwide
- **Automatic HTTPS** - SSL certificate gratis
- **Custom Domains** - Mudah setup custom domain
- **Serverless Functions** - Auto-scaling API routes
- **Preview Deployments** - Test sebelum production
- **Analytics** - Performance monitoring gratis
- **Free Tier** - Cukup untuk project personal

### ⚠️ **Limitations**
- **Build Time**: 10 menit (hobby), 45 menit (pro)
- **Bandwidth**: 100GB/month (hobby)
- **Function Execution**: 10s (hobby), 60s (pro)
- **No WebSocket** di free tier (perlu workarounds)

---

## 🛠️ **Preparation**

### **1. Project Optimization untuk Vercel**

#### **Update package.json**
```json
{
  "name": "nft-staking-game",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "vercel-build": "next build"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### **Optimize next.config.js untuk Vercel**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports untuk better performance
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: [
      'z-cdn-media.chatglm.cn',
      'your-domain.com',
      'ipfs.io'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers untuk security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
}

module.exports = nextConfig
```

### **2. Environment Variables Setup**

#### **Buat .env.local untuk development**
```env
# Development
NEXT_PUBLIC_CHAIN_ID=80001
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_WS_URL=wss://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXTAUTH_SECRET=your-development-secret
NEXTAUTH_URL=http://localhost:3000
```

#### **Environment Variables untuk Vercel**
```env
# Production (Vercel)
NEXT_PUBLIC_CHAIN_ID=80001
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_WS_URL=wss://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXTAUTH_SECRET=your-super-secure-production-secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

---

## 🚀 **Deployment Methods**

### **Method 1: GitHub Integration (Recommended)**

#### **Step 1: Push ke GitHub**
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: NFT Staking Game"

# Add remote
git remote add origin https://github.com/yourusername/nft-staking-game.git
git branch -M main
git push -u origin main
```

#### **Step 2: Connect ke Vercel**
1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import dari GitHub
4. Pilih repository `nft-staking-game`
5. Vercel akan auto-detect Next.js

#### **Step 3: Configure Project**
```bash
# Build Settings
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm ci
```

#### **Step 4: Add Environment Variables**
```bash
# Di Vercel Dashboard → Project → Settings → Environment Variables
NEXT_PUBLIC_CHAIN_ID=80001
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXTAUTH_SECRET=your-super-secure-secret
```

#### **Step 5: Deploy**
- Click **"Deploy"**
- Tunggu build process (2-5 menit)
- Aplikasi akan live di `https://your-project-name.vercel.app`

### **Method 2: Vercel CLI**

#### **Install Vercel CLI**
```bash
# Install globally
npm i -g vercel

# Login
vercel login
```

#### **Deploy dari Local**
```bash
# Di project directory
vercel

# Follow prompts
? Set up and deploy "~/nft-staking-game"? [Y/n] y
? Which scope do you want to deploy to? Your Name
? Link to existing project? [y/N] n
? What's your project's name? nft-staking-game
? In which directory is your code located? ./
? Want to override the settings? [y/N] n

# Deploy ke production
vercel --prod
```

### **Method 3: Manual Upload**

```bash
# Build project
npm run build

# Upload ke Vercel
vercel --prod
```

---

## 🔧 **Vercel Configuration**

### **vercel.json Configuration**
```json
{
  "version": 2,
  "name": "nft-staking-game",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_CHAIN_ID": "80001",
    "NEXT_PUBLIC_RPC_URL": "https://rpc-amoy.polygon.technology"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 🌐 **Custom Domain Setup**

### **Method 1: Vercel Subdomain**
```bash
# Otomatis dibuat saat deploy
https://your-project-name.vercel.app
```

### **Method 2: Custom Domain**

#### **Step 1: Add Domain di Vercel**
1. Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `yourdomain.com`
3. Vercel akan memberikan DNS records

#### **Step 2: Configure DNS**
```bash
# Type: A Record
Name: @
Value: 76.76.19.19

# Type: CNAME Record  
Name: www
Value: cname.vercel-dns.com
```

#### **Step 3: Verify Domain**
- Tunggu DNS propagation (5-30 menit)
- Vercel akan otomatis issue SSL certificate
- Test domain di browser

---

## ⚡ **Performance Optimization**

### **1. Image Optimization**
```typescript
// next.config.js
images: {
  domains: ['z-cdn-media.chatglm.cn'],
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 60,
}
```

### **2. Static Generation**
```typescript
// Generate static pages untuk better performance
export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    // ... static params
  ]
}
```

### **3. Caching Strategy**
```typescript
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { 
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    }
  )
}
```

---

## 🔍 **Monitoring & Analytics**

### **Vercel Analytics**
```typescript
// next.config.js
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

// lib/analytics.ts
export { Analytics } from '@vercel/analytics/react'
```

### **Speed Insights**
```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

---

## 🚨 **Troubleshooting Vercel**

### **Common Issues & Solutions**

#### **1. Build Timeout**
```bash
# Problem: Build > 10 menit
# Solution: Optimize build process

# next.config.js
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@wagmi/core']
  }
}
```

#### **2. Function Timeout**
```bash
# Problem: API function timeout
# Solution: Optimize API routes

# vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### **3. Environment Variables Not Working**
```bash
# Problem: Env vars tidak terbaca
# Solution: Restart deployment

vercel --prod
```

#### **4. CORS Issues**
```bash
# Problem: CORS error dengan blockchain RPC
# Solution: Configure CORS headers

// next.config.js
async headers() {
  return [
    {
      source: '/api/(.*)',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: '*'
        }
      ]
    }
  ]
}
```

#### **5. WebSocket Connection Issues**
```bash
# Problem: WebSocket tidak bekerja di Vercel
# Solution: Gunakan polling fallback

// src/lib/web3.ts
const config = createConfig({
  transports: ['polling', 'websocket']
})
```

---

## 📊 **Vercel vs Alternatives**

| Feature | Vercel | Netlify | Railway | DigitalOcean |
|---------|--------|---------|---------|--------------|
| **Price** | Free tier $20/mo | Free tier $19/mo | $5/mo | $4/mo |
| **Next.js** | ✅ Native | ✅ Good | ✅ Manual | ❌ Manual |
| **Build Time** | 10-45 min | 15-60 min | Unlimited | Unlimited |
| **Functions** | 10-60s | 10s | 15m | Unlimited |
| **Custom Domain** | ✅ Free | ✅ Free | ✅ Paid | ✅ Paid |
| **Analytics** | ✅ Built-in | ❌ Limited | ❌ No | ❌ No |
| **Preview Deploy** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |

---

## 🔄 **CI/CD dengan Vercel**

### **GitHub Actions Integration**
```yaml
# .github/workflows/vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build project
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Code tested locally
- [ ] Environment variables configured
- [ ] next.config.js optimized
- [ ] Images optimized
- [ ] Build successful locally
- [ ] Linting passed
- [ ] Types checked

### **Deployment**
- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Configure project settings
- [ ] Add environment variables
- [ ] Deploy to production
- [ ] Test deployment

### **Post-Deployment**
- [ ] Test all functionality
- [ ] Check Web3 connection
- [ ] Verify NFT loading
- [ ] Test staking feature
- [ ] Check mobile responsiveness
- [ ] Monitor performance
- [ ] Setup analytics

---

## 🎯 **Best Practices untuk Vercel**

### **1. Performance**
- Gunakan Image Optimization
- Implement static generation
- Optimize bundle size
- Gunakan caching strategies

### **2. Security**
- Environment variables untuk secrets
- Security headers
- Rate limiting
- Input validation

### **3. Monitoring**
- Vercel Analytics
- Speed Insights
- Error tracking
- Performance monitoring

### **4. Scalability**
- Serverless functions
- Edge caching
- CDN distribution
- Load balancing

---

## 🆘 **Get Help**

### **Resources**
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Community](https://vercel.com/community)
- [Status Page](https://www.vercel-status.com/)

### **Support**
- **Vercel Support**: support@vercel.com
- **Discord**: [Vercel Discord](https://vercel.com/discord)
- **Twitter**: [@vercel](https://twitter.com/vercel)

---

## 🎉 **Conclusion**

Vercel adalah pilihan **excellent** untuk aplikasi NFT Anda karena:

✅ **Zero configuration** untuk Next.js  
✅ **Global CDN** untuk fast loading  
✅ **Automatic HTTPS** dan security  
✅ **Preview deployments** untuk testing  
✅ **Analytics** built-in  
✅ **Free tier** yang generous  

Dengan mengikuti guide ini, aplikasi NFT Staking Game Anda akan berjalan optimal di Vercel dengan performance terbaik dan user experience yang smooth.

---

*Happy deploying! 🚀*