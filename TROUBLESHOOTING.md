# MetaBlackjack Troubleshooting Guide

## Common Issues and Solutions

### Table of Contents
1. [Docker & Container Issues](#docker-container-issues)
2. [Database Issues](#database-issues)
3. [Redis/Cache Issues](#redis-cache-issues)
4. [Blockchain/RPC Issues](#blockchain-rpc-issues)
5. [Environment Setup Issues](#environment-setup-issues)
6. [Performance Issues](#performance-issues)
7. [Deployment Issues](#deployment-issues)
8. [Testing & Debugging](#testing-debugging)
9. [Known Issues](#known-issues)

## Docker & Container Issues

### "Cannot connect to Docker daemon"
**Error:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
Is the Docker daemon running?
```

**Solutions:**
```bash
# Linux: Start Docker service
sudo systemctl start docker

# macOS: Start Docker Desktop from Applications
# Open Docker Desktop app

# Windows: Start Docker Desktop from Start Menu
# Ensure Docker Desktop is running
```

**Verification:**
```bash
docker version
docker info
```

---

### "Port already in use"
**Error:**
```
Error starting userland proxy: listen tcp 0.0.0.0:3000: bind: address already in use
```

**Solutions:**
```bash
# Find what's using port 3000
# Linux/Mac:
lsof -i :3000
# Windows:
netstat -ano | findstr :3000

# Kill the process
# Linux/Mac:
kill -9 <PID>
# Windows:
taskkill /PID <PID> /F

# Or use different ports
docker-compose up -d -p 3001:3000
```

**Prevention:**
- Check for other Next.js apps
- Close development servers
- Free up required ports

---

### "No space left on device"
**Error:**
```
ERROR: failed to register layer: no space left on device
```

**Solutions:**
```bash
# Clean Docker resources
docker system prune -a --volumes

# Clean specific images
docker rmi $(docker images -q) -f

# Check disk space
df -h
# macOS: Increase Docker Desktop disk size
# Settings > Resources > Disk Image Size
```

**Monitoring:**
```bash
# Docker disk usage
docker system df

# Set up cleanup cron
0 2 * * * docker system prune -f
```

---

### "Permission denied" (Linux)
**Error:**
```
Error response from daemon: OCI runtime create failed: ... permission denied
```

**Solutions:**
```bash
# Add user to Docker group
sudo usermod -aG docker $USER

# Apply changes
newgrp docker

# Or use sudo (not recommended)
sudo docker-compose up -d

# Fix permissions on Docker socket
sudo chown $USER:docker /var/run/docker.sock
```

---

## Database Issues

### "Database connection refused"
**Solution:**
```bash
# Check if PostgreSQL container is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Verify database URL in .env.local
# Should match docker-compose.yml
DATABASE_URL="postgresql://metablackjack:${POSTGRES_PASSWORD}@postgres:5432/metablackjack?schema=public"

# Wait for PostgreSQL to be ready before app starts
# Docker Compose handles this with depends_on and healthcheck
sleep 30

# Test connection manually
docker-compose exec postgres pg_isready -U metablackjack
```

**Network debugging:**
```bash
# Check if containers can communicate
docker network ls
docker network inspect metablackjack-network
```

---

### "Migration failed: relation does not exist"
**Error:**
```
Error: P1001: Can't reach database server at `postgres`:`5432`
```

**Solution:**
```bash
# Run migrations with retry
./scripts/migrate.sh migrate

# Reset database and re-run (development only)
./scripts/migrate.sh reset

# Check migration status
docker-compose exec app npx prisma migrate status

# Re-run failed migration
# Edit migration file if needed
$. prisma/migrations/...
```

---

### "Cannot find database schema"
**Error:**
```
Schema provider not found:postgresql
```

**Solution:**
```bash
# Re-generate Prisma client
docker-compose exec app npx prisma generate

# Clear Prisma cache
rm -rf node_modules/.prisma
docker-compose exec app npx prisma generate

# Verify schema file
ls -la prisma/schema.prisma
```

---

### "Pool connection timeout"
**Solution:**
```bash
# Increase pool size in .env.local
POOL_SIZE=25
POOL_TIMEOUT=60

# Check active connections
docker-compose exec postgres psql -U metablackjack metabblackjack -c "SELECT count(*) FROM pg_stat_activity;"

# Optimize connection pooling
# Use PgBouncer in production
```

---

## Redis/Cache Issues

### "Redis connection timeout"
**Error:**
```
Error: connect ETIMEDOUT 127.0.0.1:6379
```

**Solutions:**
```bash
# Check Redis container
docker-compose ps redis

# Verify Redis URL in .env.local
REDIS_URL="redis://redis:6379"

# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis

# Clear Redis cache (if corrupted)
docker-compose exec redis redis-cli FLUSHALL
```

---

### "Cache not working"
**Symptoms:** 
- Slow API responses
- High database load
- Cache hit rate 0%

**Solution:**
```bash
# Check Redis metrics
docker-compose exec redis redis-cli INFO memory
docker-compose exec redis redis-cli INFO stats

# Verify cache is enabled
# Check .env.local: CACHE_ENABLED=true

# Check Prisma cache
docker-compose exec app npx prisma studio
# View Queries: Look for cache queries

# Increase Redis memory limit
# Edit redis.conf: maxmemory 512mb

# Restart to apply
docker-compose restart redis
```

**Debugging cache:**
```bash
# Enable cache debugging
# In .env.local: LOG_LEVEL=debug

# Check cache hit rate output
# Look in logs: Cache: Hit rate 85% (target: >80%)
```

---

## Blockchain/RPC Issues

### "RPC endpoint not accessible"
**Error:**
```
Error: Failed to fetch contract data from RPC
```

**Solutions:**
```bash
# Test RPC endpoint
curl -X POST https://rpc-amoy.polygon.technology \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Alternative RPC endpoints:
# - https://rpc-amoy.polygon.technology (official)
# - https://polygon-amoy-bor-rpc.publicnode.com (public)
# - https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY (alchemy)

# Check .env.local RPC URL
POLYGON_AMOY_RPC_URL="https://rpc-amoy.polygon.technology"

# Test in application
docker-compose exec app node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
provider.getBlockNumber().then(console.log).catch(console.error);
"
```

---

### "Contract not deployed at address"
**Error:**
```
Error: call revert exception: contract call run out of gas
```

**Solution:**
```bash
# Verify contract deployment
# Check contract addresses in .env.local match deployed contracts

# Get contract info
docker-compose exec app node scripts/get-contract-info.js

# Verify on PolygonScan
# https://amoy.polygonscan.com/address/0x...

# Redeploy contracts if needed
# cd blockchain && npm run deploy
```

---

### "Invalid private key format"
**Error:**
```
Error: invalid private key length
```

**Solution:**
```bash
# Generate valid private key
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local
BACKEND_PRIVATE_KEY="0x123456789abcdef..."

# Must be 64 hex chars + 0x prefix

# Test key validity
node -e "
const { ethers } = require('ethers');
const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY);
console.log('Address:', wallet.address);
"
```

---

## Environment Setup Issues

### "Cannot find module 'xxx'"
**Error:**
```
Error: Cannot find module 'prisma' or its dependencies
```

**Solution:**
```bash
# Reinstall dependencies
docker-compose exec app rm -rf node_modules# Rebuild image with no cache
docker-compose build --no-cache

# Or delete and recreate
docker-compose down
docker system prune -fdocker-compose up -d --build
```

---

### "env: node: No such file or directory"
**Solution:**
```bash
# Install Node.js in container if missing
# Add to Dockerfile:
RUN apk add --no-cache nodejs npm

# Rebuild
docker-compose up -d --build
```

---

### "Permission denied on scripts"
**Solution:**
```bash
# Make scripts executable (Linux/macOS)
chmod +x scripts/*.sh

# Run scripts with bash explicitly
bash scripts/deploy.sh

# Fix permissions in Docker
docker-compose exec app chmod +x /app/scripts/*.sh
```

---

### "Invalid contract address format"
**Solution:**
```bash
# Contract addresses must be:
# - 42 characters total
# - Start with 0x
# - 40 hex characters after 0x
# - Checksum format: ethers.utils.getAddress(address)

# Example:
# WRONG: 0xAbC123... (too short)
# RIGHT: 0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a

# Validate all addresses
for addr in ${CONTRACT_ADDRESSES[@]}; do
  if [[ ! "$addr" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo "Invalid: $addr"
  fi
done
```

---

## Performance Issues

### "Application is slow"
**Diagnosis:**
```bash
# Check API response time
time curl -s http://localhost:3000/api/health

# Check database query time
docker-compose exec postgres psql -U metablackjack metabblackjack -c "
EXPLAIN ANALYZE SELECT * FROM games ORDER BY createdAt DESC LIMIT 100;
"

# Check Redis performance
docker-compose exec redis redis-cli --latency

# Check container resources
docker stats metablackjack-app
```

**Solutions:**
```bash
# Enable caching if disabled
# In .env.local: CACHE_ENABLED=true

# Increase cache TTL
CACHE_TTL_USER=600

# Add database indexes
# See performance optimization guide

# Increase resources
# Edit docker-compose.yml
# mem_limit: 2048M
# cpus: 1.5
```

---

### "High memory usage"
**Diagnosis:**
```bash
# Memory profiling
docker stats --no-stream

# Check Node.js memory
docker-compose exec app node -e "
const v8 = require('v8');
const memUsage = process.memoryUsage();
console.log(memUsage);
"

# Check for memory leaks
# Look for increasing memory in logs
```

**Solutions:**
```bash
# Limit Node.js memory
NODE_OPTIONS="--max-old-space-size=2048"

# Increase container memory limits
# docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 2G

# Clear cache periodically
docker-compose exec redis redis-cli FLUSHALL

# Restart containers
docker-compose restart app
```

---

### "Database is slow"
**Diagnosis:**
```bash
# Check active connections
docker-compose exec postgres psql -U metablackjack metabblackjack -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
"

# Check long running queries
docker-compose exec postgres psql -U metablackjack metabblackjack -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 seconds';
"

# Check table sizes
docker-compose exec postgres psql -U metablackjack metabblackjack -c "
SELECT schemaname, tablename, 
pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Solutions:**
```bash
# Increase connection pool
# .env.local: POOL_SIZE=25

# Add indexes
# See database optimization guide

# Archive old data
# Create partitions for large tables

# Upgrade PostgreSQL version
# Use PostgreSQL 15+ for better performance
```

---

## Deployment Issues

### "Railway deployment failed"
**Error:**
```
Deployment failed to provision
```

**Solutions:**
```bash
# Check deployment logs
railway logs --deployment

# Verify environment variables
railway variables list

# Clear cache and retry
railway cache clear
railway up

# Check project status
railway status

# Update Railway CLI
npm update -g @railway/cli

# Check Railway status page
# https://status.railway.app
```

---

### "Health check failed after deployment"
**Solution:**
```bash
# Check if app is starting
railway logs --follow

# Increase startup time
# .env.local:
HEALTHCHECK_TIMEOUT=60

# Check application logs
# Look for errors in startup

# Test manually
curl https://your-project.railway.app/health

# Check if services ready
sleep 30 && curl https://your-project.railway.app/ready
```

---

### "Build fails in production but not locally"
**Solution:**
```bash
# Test build locally in production mode
NODE_ENV=production npm run build

# Check for missing dependencies
# Look at bundled dependencies

# Verify all env vars in production
railway variables get

# Check for case-sensitive imports
# Linux is case-sensitive, macOS isn't

# Clear cache and rebuild
rm -rf node_modules
rm -rf .next
npm ci
npm run build
```

---

## Testing & Debugging

### "Tests are failing"
**Solution:**
```bash
# Run tests with proper environment
DATABASE_URL="postgresql://test:test@localhost:5433/test" npm test

# Check test database is running
docker-compose -f docker-compose.test.yml up -d

# Verify test environment
cp .env.test .env.local

# Clear test cache
rm -rf coverage/
npm test -- --clearCache

# Run specific test
npm test -- --testNamePattern="health"
```

---

### "Cannot debug in Docker"
**Solution:**
```bash
# Use attach to container
docker attach metabblackjack-app

# Use docker exec for interactive debugging
docker-compose exec app sh

# Enable debug logs
# .env.local: LOG_LEVEL=debug

# Use Node.js inspector
docker-compose exec app node --inspect-brk=0.0.0.0:9229 server.js

# Connect from Chrome DevTools
# chrome://inspect
```

---

### "Healthcheck script failing"
**Solution:**
```bash
# Test individual components
docker-compose exec app curl http://localhost:3000/health
docker-compose exec app curl http://localhost:3000/ready

# Check with verbose mode
./scripts/healthcheck.sh -v

# Check specific service
./scripts/healthcheck.sh --url http://localhost:3000

# Review all services
docker-compose ps
```

---

## Known Issues

### PostgreSQL Version Conflicts
**Issue**: Using PostgreSQL 14+ with Prisma
**Solution**: Ensure schema mentions correct version or use latest Prisma

### Redis Persistence
**Issue**: Redis data not persisting between restarts
**Solution**: Verify volume mount in docker-compose.yml
```yaml
volumes:
  - redis_data:/data
```

### Next.js Build Issues
**Issue**: Standalone build doesn't include some files
**Solution**: Ensure copying in Dockerfile:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
```

### Socket.IO CORS
**Issue**: CORS errors with Socket.IO in Docker
**Solution**: Ensure correct CORS configuration in server.ts
```typescript
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [...],
  credentials: true
}
```

### Environment Variable Loading
**Issue**: Variables not loading in Docker
**Solution**: Verify .dockerignore doesn't exclude .env files

### Private Key Security
**Issue**: Metamask rejects private key imports
**Solution**: Ensure key is 64 hex chars + 0x prefix, checksum format

### Prisma Migrations in Production
**Issue**: Migration fails on Railway
**Solution**: Use migr Parsed and properly JavaScript/Node.js date function call:
`require('...').getDate()` noting possible context adjustment for better correctness.