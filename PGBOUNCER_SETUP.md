# PgBouncer Setup Guide - Phase 1 DB Tuning

## 📖 Overview

PgBouncer is a lightweight connection pooler for PostgreSQL that sits between your application and database. It significantly improves performance by:

- **Reducing connection overhead** - Reuses database connections
- **Preventing connection exhaustion** - Limits max connections to database
- **Improving query throughput** - Efficiently manages connection lifecycle
- **Better resource utilization** - Lower memory footprint per connection

## 🚀 Quick Start with Docker

### 1. Create Environment Variables

Create a `.env.pgbouncer` file:

```bash
# Database connection
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password

# PgBouncer settings (optional, defaults in docker-compose)
PGBOUNCER_POOL_MODE=transaction
PGBOUNCER_MAX_CLIENT_CONN=100
PGBOUNCER_DEFAULT_POOL_SIZE=20
```

### 2. Start PgBouncer

```bash
# Start PgBouncer container
docker-compose -f docker-compose.pgbouncer.yml up -d

# Check logs
docker logs blackjack-pgbouncer

# Check status
docker ps | grep pgbouncer
```

### 3. Update Application Configuration

Update your `.env` file:

```bash
# Use PgBouncer pooled connection (port 6543)
DATABASE_POOL_URL="postgresql://user:password@localhost:6543/database?pgbouncer=true&connection_limit=20&pool_timeout=10"

# Keep direct connection for migrations (port 5432)
DIRECT_URL="postgresql://user:password@localhost:5432/database"
```

### 4. Verify Connection

```bash
# Connect to PgBouncer admin console
psql -h localhost -p 6543 -U pgbouncer pgbouncer

# Show pool stats
SHOW POOLS;
SHOW STATS;
SHOW DATABASES;
SHOW CLIENTS;
SHOW SERVERS;
```

## 📊 Monitoring & Stats

### PgBouncer Admin Console

```sql
-- Pool statistics
SHOW POOLS;

-- Client/server statistics
SHOW STATS;

-- Active clients
SHOW CLIENTS;

-- Server connections
SHOW SERVERS;

-- Configuration
SHOW CONFIG;

-- Pause all activity
PAUSE;

-- Resume activity
RESUME;

-- Reload config
RELOAD;
```

### Key Metrics to Monitor

1. **cl_active** - Active client connections
2. **sv_active** - Active server connections
3. **cl_waiting** - Clients waiting for connection
4. **sv_idle** - Idle server connections
5. **maxwait** - Max wait time for connection (should be low)

### Health Check

```bash
# Check PgBouncer health
docker exec blackjack-pgbouncer pg_isready -h localhost -p 5432

# Check pool utilization
echo "SHOW POOLS;" | psql -h localhost -p 6543 -U pgbouncer pgbouncer
```

## ⚙️ Configuration Options

### Pool Modes

1. **transaction** (recommended for APIs)
   - Connection returned after transaction completes
   - Best for stateless applications
   - Highest efficiency

2. **session** (default)
   - Connection returned when client disconnects
   - Better for stateful applications
   - Uses more connections

3. **statement** (rarely used)
   - Connection returned after each statement
   - Most aggressive pooling
   - May break transactions

### Connection Limits

```ini
# Maximum client connections
max_client_conn = 100

# Pool size per user/database
default_pool_size = 20

# Reserve pool for emergencies
reserve_pool_size = 5

# Maximum connections to actual database
max_db_connections = 50

# Maximum per user
max_user_connections = 50
```

### Timeouts

```ini
# Server idle timeout (10 minutes)
server_idle_timeout = 600

# Server lifetime (1 hour)
server_lifetime = 3600

# Server connect timeout (15 seconds)
server_connect_timeout = 15

# Client idle timeout (disabled)
client_idle_timeout = 0

# Query wait timeout (2 minutes)
query_wait_timeout = 120
```

## 🔧 Troubleshooting

### Connection Issues

```bash
# Check PgBouncer logs
docker logs blackjack-pgbouncer --tail 100

# Verify database connectivity
docker exec blackjack-pgbouncer ping -c 3 your-postgres-host

# Test direct connection
psql -h localhost -p 5432 -U your_user -d your_database
```

### Pool Exhaustion

If clients are waiting too long:

1. Increase `default_pool_size`
2. Optimize slow queries
3. Use `transaction` mode instead of `session`
4. Check for connection leaks in application

### Performance Issues

```sql
-- Check for slow queries
SHOW STATS;

-- Look for high maxwait values
SHOW POOLS;

-- Identify waiting clients
SHOW CLIENTS;
```

## 🎯 Best Practices

### 1. Connection String Format

```bash
# ✅ Good - Explicit pgbouncer parameter
postgresql://user:password@host:6543/db?pgbouncer=true

# ✅ Good - With connection limits
postgresql://user:password@host:6543/db?pgbouncer=true&connection_limit=20

# ❌ Bad - Using direct port for app (use PgBouncer)
postgresql://user:password@host:5432/db
```

### 2. Application Code

```typescript
// ✅ Good - Use pooled connection for queries
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_POOL_URL // Points to PgBouncer
    }
  }
})

// ✅ Good - Use direct connection for migrations
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // PgBouncer
  directUrl = env("DIRECT_URL")        // Direct DB
}
```

### 3. Transaction Mode Compatibility

When using `transaction` mode, avoid:

- Session-level features (temp tables, advisory locks)
- `SET` commands that persist across transactions
- Prepared statements (disable in connection string)

```bash
# If you need prepared statements, use session mode
PGBOUNCER_POOL_MODE=session
```

### 4. Monitoring Setup

```bash
# Add to cron for daily stats collection
0 0 * * * echo "SHOW STATS;" | psql -h localhost -p 6543 -U pgbouncer pgbouncer >> /var/log/pgbouncer-stats.log
```

## 📈 Performance Gains

### Expected Improvements

| Metric | Without PgBouncer | With PgBouncer | Improvement |
|--------|-------------------|----------------|-------------|
| Connection time | 50-100ms | 1-5ms | **90% faster** |
| Max connections | 100-200 | 1000+ | **5-10x more** |
| Memory per conn | ~10MB | ~2MB | **80% less** |
| Database load | High | Low | **50-70% less** |

### Real-World Results

- **API response time**: 30-40% faster
- **Concurrent users**: 5-10x more
- **Database CPU**: 40-60% reduction
- **Connection errors**: Near zero

## 🔐 Security

### 1. Use SSL/TLS

```bash
# Enable SSL for database connection
DB_SSLMODE=require
DB_SSLROOTCERT=/path/to/ca-cert.pem
```

### 2. Restrict Admin Access

```ini
# Only allow admin from localhost
admin_users = pgbouncer
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
```

### 3. Network Isolation

```yaml
# Use Docker networks
networks:
  blackjack-network:
    driver: bridge
    internal: true  # No external access
```

## 📚 Additional Resources

- [PgBouncer Official Docs](https://www.pgbouncer.org/usage.html)
- [Prisma with PgBouncer](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)

## ✅ Verification Checklist

- [ ] PgBouncer container running
- [ ] Application connects via port 6543
- [ ] Migrations use direct connection (port 5432)
- [ ] `SHOW POOLS;` shows active pools
- [ ] No clients waiting (`cl_waiting = 0`)
- [ ] Query response times improved
- [ ] Monitoring/alerting configured

---

**🎉 PgBouncer Setup Complete!** Your application is now using connection pooling for optimal performance.
