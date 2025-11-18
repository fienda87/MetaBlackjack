# Database Management Scripts for BlackJack Game

## 📁 Available Scripts

### 🗄️ Database Operations

#### `backup-db.sh`
**Purpose**: Create automated backups of your database
**Supports**: SQLite, PostgreSQL, MySQL

```bash
# Usage
./scripts/backup-db.sh

# Features:
- Automatic database type detection
- Compressed backups
- Backup verification
- Old backup cleanup (7-day retention)
- Detailed logging
```

#### `restore-db.sh`
**Purpose**: Restore database from backup files
**Features**: Interactive backup selection, verification, current DB backup

```bash
# Usage
./scripts/restore-db.sh

# Process:
1. Shows available backups
2. Interactive selection
3. Confirmation prompt
4. Automatic restore
5. Post-restore verification
```

#### `migrate-db.sh`
**Purpose**: Migrate between different database types
**Supports**: SQLite ↔ PostgreSQL ↔ MySQL

```bash
# Usage
./scripts/migrate-db.sh

# Features:
- Automatic data migration
- Schema transfer
- Data verification
- Rollback capability
- Migration reporting
```

### 📊 Monitoring & Maintenance

#### `monitor-db.sh`
**Purpose**: Comprehensive database monitoring
**Features**: Health checks, performance metrics, alerts

```bash
# Usage
./scripts/monitor-db.sh

# Checks:
- Database connectivity
- Query performance
- Disk space usage
- Backup status
- Response time testing
```

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Make scripts executable (if permissions allow)
chmod +x scripts/*.sh

# Set up environment variables
export API_URL="http://localhost:3000"
export API_KEY="your-system-api-key"
export ALERT_EMAIL="admin@yourdomain.com"
```

### 2. Create Your First Backup
```bash
./scripts/backup-db.sh
```

### 3. Test Database Health
```bash
./scripts/monitor-db.sh --health-only
```

### 4. View Database Statistics
```bash
curl http://localhost:3000/api/database-stats
```

## 📋 Database Types & Configuration

### SQLite (Development)
```env
DATABASE_URL="file:./dev.db"
```
**Pros**: Simple, no setup required
**Cons**: Limited concurrency, not for production

### PostgreSQL (Production Recommended)
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```
**Pros**: High performance, reliable, scalable
**Cons**: Requires setup

### MySQL (Production Alternative)
```env
DATABASE_URL="mysql://user:password@host:port/database?ssl=true"
```
**Pros**: Good performance, widely supported
**Cons**: Less features than PostgreSQL

## 🔧 Production Configuration

### Environment Setup
```bash
# Copy production template
cp .env.production.example .env.production

# Update with your values
nano .env.production
```

### Key Production Settings
```env
# Connection pooling
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20"

# Security
DB_SSL_MODE=require
DB_LOG_QUERIES=false

# Performance
DB_SLOW_QUERY_THRESHOLD=1000
DB_CONNECTION_TIMEOUT=30000
```

## 📈 Monitoring Setup

### Automated Monitoring
```bash
# Add to crontab for automated monitoring
crontab -e

# Add these lines:
# Monitor database every 5 minutes
*/5 * * * * /path/to/scripts/monitor-db.sh --quiet

# Backup database daily at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh

# Cleanup old data weekly
0 3 * * 0 curl -X POST http://localhost:3000/api/database-cleanup -H "Authorization: Bearer $API_KEY"
```

### Health Check API
```bash
# Check database health
curl http://localhost:3000/api/health

# Get database statistics
curl http://localhost:3000/api/database-stats

# Cleanup old data (requires API key)
curl -X POST http://localhost:3000/api/database-cleanup \
  -H "Authorization: Bearer your-api-key"
```

## 🚨 Alert Configuration

### Email Alerts
```bash
export ALERT_EMAIL="admin@yourdomain.com"
export API_URL="https://yourdomain.com"
export API_KEY="your-secure-api-key"
```

### Alert Types
- Database connection failures
- High slow query percentage (>10%)
- High average query time (>500ms)
- High disk usage (>80%)
- Missing backups (24+ hours)
- Poor performance (>1s response time)

## 🔄 Migration Guide

### SQLite to PostgreSQL
```bash
# 1. Backup current SQLite database
./scripts/backup-db.sh

# 2. Run migration script
./scripts/migrate-db.sh

# 3. Select PostgreSQL as target
# 4. Enter PostgreSQL connection string
# 5. Confirm migration
# 6. Test application
```

### Production Migration Steps
1. **Schedule maintenance window**
2. **Create full backup**
3. **Test migration on staging**
4. **Run production migration**
5. **Verify all functionality**
6. **Monitor performance**
7. **Keep backup for 30 days**

## 📊 Performance Optimization

### Database Indexing
```sql
-- These indexes are automatically created
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_session_id ON games(session_id);
CREATE INDEX idx_games_played_at ON games(played_at);
```

### Connection Pooling
```javascript
// Production database client
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "?connection_limit=20&pool_timeout=20"
    }
  }
})
```

### Query Optimization
```javascript
// Efficient pagination
const games = await db.game.findMany({
  where: { userId: user.id },
  orderBy: { playedAt: 'desc' },
  take: 20,
  skip: page * 20,
  select: {
    id: true,
    betAmount: true,
    result: true,
    playedAt: true
  }
})
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Locked
```bash
# For SQLite
rm db/dev.db-journal
# Restart application
```

#### Connection Timeout
```bash
# Check connection string
echo $DATABASE_URL

# Test connectivity
./scripts/monitor-db.sh --health-only
```

#### Slow Queries
```bash
# Enable query logging
export DB_LOG_QUERIES=true
export DB_SLOW_QUERY_THRESHOLD=500

# Restart application and check logs
```

#### Backup Failures
```bash
# Check permissions
ls -la backups/
chmod 755 backups/

# Check disk space
df -h
```

## 📞 Support

### Log Files
- Database operations: `backups/backup.log`
- Monitoring: `backups/monitoring.log`
- Application: Check application logs

### Emergency Procedures
1. **Database down**: Use `restore-db.sh` with latest backup
2. **Performance issues**: Check `monitor-db.sh` output
3. **Migration failure**: Restore from backup and retry

### Best Practices
1. **Daily backups** for production
2. **Weekly monitoring** reports
3. **Monthly optimization** 
4. **Quarterly migration** testing
5. **Yearly disaster recovery** testing

---

Your BlackJack game database is now fully manageable with professional tools! 🗄️✨