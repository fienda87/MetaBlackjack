# 🚀 **Deployment Guide Aplikasi NFT**

## 📋 **Overview**
Guide lengkap untuk deploy aplikasi NFT Staking Game dari development hingga production.

---

## 🏗️ **Deployment Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (Next.js)     │    │   (Next.js)     │    │   (Polygon)     │
│   Port: 3000    │    │   Port: 3000    │    │   Amoy Testnet  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (Optional)    │
                    │   SQLite/Postgres│
                    └─────────────────┘
```

---

## 🛠️ **Preparation**

### **1. System Requirements**

#### **Minimum Requirements**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows 10+

#### **Recommended Requirements**
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 100Mbps+

### **2. Software Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt install nginx

# Install Git
sudo apt install git
```

### **3. Domain & SSL**

#### **Domain Setup**
```bash
# Point domain to server IP
# Example: yourdomain.com -> 123.456.789.0

# Test DNS resolution
nslookup yourdomain.com
```

#### **SSL Certificate**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 📦 **Build & Deploy Process**

### **1. Code Preparation**

#### **Clone Repository**
```bash
# Clone your repository
git clone https://github.com/yourusername/nft-staking-game.git
cd nft-staking-game

# Install dependencies
npm ci --production
```

#### **Environment Setup**
```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

#### **Environment Variables**
```env
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=80001
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_WS_URL=wss://rpc-amoy.polygon.technology

# Smart Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# Application
NODE_ENV=production
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=https://yourdomain.com

# Image Hosting (Optional)
NEXT_PUBLIC_PINATA_API_KEY=your-pinata-api-key
NEXT_PUBLIC_PINATA_SECRET=your-pinata-secret

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
```

### **2. Build Application**

#### **Production Build**
```bash
# Build application
npm run build

# Test build locally
npm start

# Stop local test
Ctrl+C
```

#### **Build Verification**
```bash
# Check build output
ls -la .next/

# Test build
npm run start:prod

# Check application health
curl http://localhost:3000/api/health
```

---

## 🚀 **Deployment Options**

### **Option 1: PM2 Deployment (Recommended)**

#### **PM2 Configuration**
```javascript
// ecosystem.config.js
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
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

#### **Deploy with PM2**
```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Monitor application
pm2 monit
```

#### **PM2 Commands**
```bash
# Start application
pm2 start nft-staking-game

# Stop application
pm2 stop nft-staking-game

# Restart application
pm2 restart nft-staking-game

# View logs
pm2 logs nft-staking-game

# Monitor
pm2 monit

# List all processes
pm2 list
```

### **Option 2: Docker Deployment**

#### **Dockerfile**
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_CHAIN_ID=80001
      - NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
      - NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    networks:
      - nft-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - nft-network

networks:
  nft-network:
    driver: bridge
```

#### **Deploy with Docker**
```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Update application
git pull
docker-compose build
docker-compose up -d
```

### **Option 3: Systemd Service**

#### **Service File**
```ini
# /etc/systemd/system/nft-staking-game.service
[Unit]
Description=NFT Staking Game
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/nft-staking-game
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nft-staking-game
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

#### **Deploy with Systemd**
```bash
# Enable and start service
sudo systemctl enable nft-staking-game
sudo systemctl start nft-staking-game

# Check status
sudo systemctl status nft-staking-game

# View logs
sudo journalctl -u nft-staking-game -f
```

---

## 🌐 **Nginx Configuration**

### **Nginx Config**
```nginx
# /etc/nginx/sites-available/nft-staking-game
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /images/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

#### **Enable Nginx Config**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nft-staking-game /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔧 **Database Setup (Optional)**

### **SQLite Setup**
```bash
# Install SQLite
sudo apt install sqlite3

# Create database
sqlite3 nft-staking.db

# Create tables
sqlite3 nft-staking.db < schema.sql
```

### **PostgreSQL Setup**
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb nft_staking

# Create user
sudo -u postgres createuser --interactive

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nft_staking TO your_user;"
```

---

## 🔍 **Testing & Verification**

### **1. Health Check**
```bash
# Test API health
curl https://yourdomain.com/api/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### **2. SSL Verification**
```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL rating
curl -sS https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com&hideResults=on
```

### **3. Performance Test**
```bash
# Load test with Apache Bench
ab -n 100 -c 10 https://yourdomain.com/

# Lighthouse test
npx lighthouse https://yourdomain.com --output html --output-path ./lighthouse-report.html
```

### **4. Web3 Connection Test**
```bash
# Test blockchain connection
curl -X POST https://rpc-amoy.polygon.technology \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## 📊 **Monitoring Setup**

### **1. PM2 Monitoring**
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# Monitor dashboard
pm2 web
```

### **2. Log Monitoring**
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/nft-staking-game
```

```
/home/ubuntu/nft-staking-game/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload nft-staking-game
    endscript
}
```

### **3. Uptime Monitoring**
```bash
# Create uptime script
cat > uptime-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/api/health)
if [ $response != "200" ]; then
    echo "Application is down! HTTP status: $response" | mail -s "NFT App Alert" your-email@example.com
fi
EOF

# Make executable
chmod +x uptime-check.sh

# Add to crontab
crontab -e
```

```
# Check every 5 minutes
*/5 * * * * /home/ubuntu/nft-staking-game/uptime-check.sh
```

---

## 🔄 **CI/CD Pipeline**

### **GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
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
      
      - name: Run linting
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/ubuntu/nft-staking-game
            git pull origin main
            npm ci --production
            npm run build
            pm2 restart nft-staking-game
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Application Won't Start**
```bash
# Check logs
pm2 logs nft-staking-game

# Check port usage
sudo netstat -tlnp | grep :3000

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:3000)
```

#### **2. Memory Issues**
```bash
# Check memory usage
free -h

# Check process memory
ps aux --sort=-%mem | head

# Restart with more memory
pm2 delete nft-staking-game
pm2 start ecosystem.config.js --max-memory-restart 2G
```

#### **3. SSL Issues**
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
sudo nginx -t
```

#### **4. Database Connection Issues**
```bash
# Check database status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U your_user -d nft_staking
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Environment variables configured
- [ ] Domain pointed to server
- [ ] SSL certificate obtained
- [ ] Backup plan ready

### **Deployment**
- [ ] Code pulled to server
- [ ] Dependencies installed
- [ ] Application built
- [ ] Service started
- [ ] Health check passing
- [ ] Monitoring configured

### **Post-Deployment**
- [ ] Application tested
- [ ] Performance verified
- [ ] Logs monitored
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified

---

## 📞 **Support**

### **Emergency Contacts**
- **DevOps Team**: [Email/Phone]
- **Hosting Provider**: [Support Contact]
- **Domain Registrar**: [Support Contact]

### **Useful Commands**
```bash
# Quick restart
pm2 restart nft-staking-game

# Quick status check
pm2 status

# Quick log view
pm2 logs --lines 50

# Quick health check
curl https://yourdomain.com/api/health
```

---

*Deployment guide ini akan terus diupdate sesuai dengan kebutuhan dan perkembangan teknologi.*