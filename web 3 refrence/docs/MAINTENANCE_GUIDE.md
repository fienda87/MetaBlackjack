# 🛠️ **Maintenance Guide Aplikasi NFT**

## 📋 **Overview**
Guide lengkap untuk maintenance aplikasi NFT Staking Game agar selalu berjalan optimal dan aman.

---

## 📅 **Maintenance Schedule**

### **🌅 Daily Checks (5 menit)**

#### **1. Health Check**
```bash
# Check API health
curl http://localhost:3000/api/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### **2. Quick Log Check**
```bash
# Check recent errors
tail -n 50 dev.log | grep -i error

# Check recent warnings
tail -n 50 dev.log | grep -i warning
```

#### **3. Memory & Performance**
```bash
# Check memory usage
ps aux | grep node

# Check disk space
df -h

# Check port availability
netstat -tlnp | grep :3000
```

### **📊 Weekly Maintenance (30 menit)**

#### **1. Dependency Updates**
```bash
# Check outdated packages
npm outdated

# Update minor versions
npm update

# Security audit
npm audit
npm audit fix
```

#### **2. Code Quality**
```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Check bundle size
npm run build -- --analyze
```

#### **3. Performance Monitoring**
```bash
# Check build performance
time npm run build

# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

#### **4. Backup & Cleanup**
```bash
# Clean node modules (if needed)
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
```

### **🗓️ Monthly Maintenance (2 jam)**

#### **1. Security Updates**
```bash
# Full security audit
npm audit --audit-level moderate

# Update major versions (carefully!)
npm install package@latest

# Test thoroughly after updates
npm run test
npm run build
npm run dev
```

#### **2. Database Maintenance**
```bash
# If using database
npm run db:backup
npm run db:migrate
npm run db:optimize
```

#### **3. Smart Contract Check**
```bash
# Verify contract addresses
echo "Contract Address: $NEXT_PUBLIC_CONTRACT_ADDRESS"

# Check contract interaction
npm run test:contract
```

#### **4. Performance Optimization**
```bash
# Analyze bundle
npm run build -- --analyze

# Check image optimization
npx next-optimized-images

# Lighthouse audit
npx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

---

## 🚨 **Emergency Procedures**

### **🔥 Production Down**

#### **Step 1: Diagnose**
```bash
# Check service status
systemctl status your-app-name

# Check logs
journalctl -u your-app-name -f

# Check port
netstat -tlnp | grep :3000
```

#### **Step 2: Quick Fix**
```bash
# Restart service
systemctl restart your-app-name

# Clear cache
rm -rf .next
npm run build
npm start
```

#### **Step 3: Fallback**
```bash
# Switch to backup
git checkout main-backup
npm install
npm run build
npm start
```

### **💸 Smart Contract Issues**

#### **Step 1: Verify Connection**
```bash
# Check network
curl -X POST https://rpc-amoy.polygon.technology \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### **Step 2: Check Contract**
```bash
# Verify contract address
npx hardhat verify --network amoy CONTRACT_ADDRESS

# Check contract ABI
node -e "console.log(require('./src/lib/contracts.ts').ABI)"
```

#### **Step 3: Update Configuration**
```bash
# Update environment variables
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=NEW_ADDRESS" >> .env.local

# Restart application
npm run dev
```

### **🖼️ Image Loading Issues**

#### **Step 1: Check URLs**
```bash
# Test image URLs
curl -I https://your-image-url.com/image.jpg

# Check local images
ls -la public/images/nfts/
```

#### **Step 2: Fix Image Issues**
```bash
# Optimize images
npx sharp input.jpg --output optimized.jpg --resize 512 512 --quality 80

# Update image URLs in nft-artwork.ts
```

---

## 🔍 **Monitoring Setup**

### **1. Application Monitoring**

#### **Install Monitoring Tools**
```bash
# Install PM2 for production
npm install -g pm2

# Create PM2 config
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nft-staking-game',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF
```

#### **Start with PM2**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **2. Log Monitoring**

#### **Setup Log Rotation**
```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate config
sudo cat > /etc/logrotate.d/nft-app << EOF
/home/user/nft-app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 user user
    postrotate
        pm2 reload nft-staking-game
    endscript
}
EOF
```

### **3. Health Check Endpoint**

#### **Enhanced Health Check**
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check database connection
    const dbStatus = await checkDatabase()
    
    // Check Web3 connection
    const web3Status = await checkWeb3Connection()
    
    // Check memory usage
    const memUsage = process.memoryUsage()
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version,
      checks: {
        database: dbStatus,
        web3: web3Status,
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
```

---

## 📊 **Performance Optimization**

### **1. Frontend Optimization**

#### **Image Optimization**
```bash
# Optimize all images
npx sharp public/images/nfts/*.jpg --output public/images/nfts/optimized/ --resize 512 512 --quality 80

# Update NFT artwork to use optimized images
```

#### **Bundle Optimization**
```bash
# Analyze bundle
npm run build -- --analyze

# Optimize imports
# Remove unused dependencies
npm uninstall unused-package
```

#### **Caching Strategy**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}
```

### **2. Backend Optimization**

#### **Database Optimization**
```sql
-- Add indexes
CREATE INDEX idx_nfts_owner ON nfts(owner);
CREATE INDEX idx_staking_token_id ON staking(token_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM nfts WHERE owner = '0x...';
```

#### **API Optimization**
```typescript
// Add caching
import { cache } from 'react'

export const getNFTs = cache(async (address: string) => {
  // Cached NFT fetching
})
```

---

## 🔐 **Security Maintenance**

### **1. Regular Security Tasks**

#### **Weekly Security Scan**
```bash
# Security audit
npm audit --audit-level moderate

# Check for vulnerabilities
npm ls --depth=0

# Update dependencies
npm update
```

#### **Monthly Security Review**
```bash
# Full security audit
npm audit --audit-level low

# Check environment variables
env | grep -E "(SECRET|KEY|TOKEN|PASSWORD)"

# Review file permissions
ls -la .env*
```

### **2. Security Best Practices**

#### **Environment Variables**
```bash
# Secure .env file
chmod 600 .env.local

# Check for exposed secrets
grep -r "password\|secret\|key" --include="*.ts" --include="*.js" src/
```

#### **Smart Contract Security**
```bash
# Verify contract
npx hardhat verify --network amoy CONTRACT_ADDRESS

# Check contract source
npx hardhat run scripts/verify-contract.js
```

---

## 📝 **Maintenance Checklist**

### **Daily Checklist**
- [ ] API health check
- [ ] Error log review
- [ ] Memory usage check
- [ ] Disk space check

### **Weekly Checklist**
- [ ] Dependency updates
- [ ] Code quality check
- [ ] Performance monitoring
- [ ] Security audit
- [ ] Backup verification

### **Monthly Checklist**
- [ ] Major dependency updates
- [ ] Security review
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Smart contract verification

### **Quarterly Checklist**
- [ ] Full security audit
- [ ] Architecture review
- [ ] Capacity planning
- [ ] Disaster recovery test
- [ ] User feedback review

---

## 🚀 **Deployment Maintenance**

### **1. CI/CD Pipeline**

#### **GitHub Actions Example**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        run: |
          # Deploy script here
          echo "Deploying to production..."
```

### **2. Rollback Procedures**

#### **Quick Rollback**
```bash
# Rollback to previous version
git checkout HEAD~1
npm install
npm run build
npm start
```

#### **Database Rollback**
```bash
# Rollback database
npm run db:rollback -- --version=previous_version
```

---

## 📞 **Emergency Contacts**

### **Team Contacts**
- **Tech Lead**: [Email/Phone]
- **DevOps**: [Email/Phone]
- **Security**: [Email/Phone]
- **Community Manager**: [Email/Phone]

### **External Services**
- **Hosting Provider**: [Support Contact]
- **Blockchain Explorer**: [Contact Info]
- **Security Auditor**: [Contact Info]

---

## 📚 **Resources**

### **Documentation**
- [Next.js Production Guide](https://nextjs.org/docs/going-to-production)
- [Wagmi Best Practices](https://wagmi.sh/react/guides)
- [Security Guidelines](https://owasp.org/)

### **Tools**
- [PM2 Monitoring](https://pm2.keymetrics.io/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

*Update terakhir: Januari 2024*