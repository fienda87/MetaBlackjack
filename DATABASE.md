# 🗄️ Database Management Guide - BlackJack Game

## 📋 Database Overview

BlackJack game menggunakan **Prisma ORM** dengan **SQLite** untuk development dan bisa beralih ke **PostgreSQL/MySQL** untuk production.

### Current Database Structure:
```sql
- users (player data, balance, authentication)
- game_sessions (session tracking)
- games (individual game records)
- system_configs (game settings)
- audit_logs (activity tracking)
```

## 🏗️ Database Schema

### Users Table
```sql
- id: Unique identifier
- email: User email (login)
- username: Display name
- balance: Current GBC balance
- created_at: Registration date
- updated_at: Last update
```

### Game Sessions Table
```sql
- id: Session identifier
- user_id: Player reference
- start_time: Session start
- end_time: Session end
- starting_balance: Balance at start
- ending_balance: Balance at end
- total_hands: Number of games played
- total_bet: Total amount wagered
- net_result: Profit/Loss
```

### Games Table
```sql
- id: Game identifier
- session_id: Session reference
- user_id: Player reference
- bet_amount: Amount wagered
- result: WIN/LOSE/PUSH/BLACKJACK
- payout: Amount won/lost
- player_hand: Player's cards
- dealer_hand: Dealer's cards
- played_at: Game timestamp
```

## 🚀 Database Setup

### 1. Development (SQLite)
```bash
# Push schema to SQLite
npm run db:push

# View database
sqlite3 db/dev.db
```

### 2. Production (PostgreSQL)
```bash
# Install PostgreSQL client
npm install pg

# Update DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/blackjack"

# Push schema to PostgreSQL
npm run db:push
```

### 3. Alternative: MySQL
```bash
# Install MySQL client
npm install mysql2

# Update DATABASE_URL
DATABASE_URL="mysql://user:password@localhost:3306/blackjack"

# Push schema to MySQL
npm run db:push
```

## 📊 Database Operations

### Basic Commands
```bash
# Push schema changes
npm run db:push

# Generate Prisma Client
npm run db:generate

# View database in Prisma Studio
npm run db:studio

# Reset database (dangerous!)
npm run db:reset
```

### Seed Data
```bash
# Run seed script
npm run db:seed

# Custom seed with specific data
node scripts/seed-production.js
```

## 🔧 Database Configuration

### Environment Variables
```env
# Development (SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# Production (MySQL)
DATABASE_URL="mysql://user:password@host:port/database"

# Database Pooling (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20"
```

### Prisma Configuration
```javascript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"        // or "postgresql" or "mysql"
  url      = env("DATABASE_URL")
}
```

## 📈 Database Scaling

### 1. SQLite → PostgreSQL Migration
```bash
# 1. Export SQLite data
npm run db:export

# 2. Update DATABASE_URL to PostgreSQL
# 3. Push schema to PostgreSQL
npm run db:push

# 4. Import data
npm run db:import
```

### 2. Connection Pooling
```javascript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query'],
  // Connection pooling for production
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

## 🔒 Database Security

### 1. Environment Protection
```bash
# Never commit .env files
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 2. Connection Security
```env
# Use SSL for production databases
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Connection limits
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=10"
```

### 3. Access Control
```sql
-- Create dedicated database user
CREATE USER blackjack_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE blackjack TO blackjack_app;
GRANT USAGE ON SCHEMA public TO blackjack_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO blackjack_app;
```

## 📱 Database for Mobile

### Optimized Queries
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
    payout: true,
    playedAt: true
  }
})

// Optimized session stats
const stats = await db.game.aggregate({
  where: { userId: user.id },
  _count: { id: true },
  _sum: { betAmount: true, payout: true }
})
```

### Caching Strategy
```javascript
// Cache user balance
const cachedBalance = await cache.get(`balance:${userId}`)
if (!cachedBalance) {
  const balance = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true }
  })
  await cache.set(`balance:${userId}`, balance.balance, 300) // 5min
}
```

## 🚨 Database Troubleshooting

### Common Issues
```bash
# Database locked
rm db/dev.db-journal

# Permission denied
chmod 664 db/dev.db
chmod 775 db/

# Connection timeout
DATABASE_URL="postgresql://user:password@host:port/database?connect_timeout=60"
```

### Performance Issues
```sql
-- Add indexes for common queries
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_session_id ON games(session_id);
CREATE INDEX idx_games_played_at ON games(played_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM games WHERE user_id = 'user123';
```

## 📊 Database Monitoring

### Query Logging
```javascript
// Enable query logging in development
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' }
  ],
})

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Params: ' + e.params)
  console.log('Duration: ' + e.duration + 'ms')
})
```

### Health Checks
```javascript
// API endpoint for database health
app.get('/api/health', async (req, res) => {
  try {
    await db.$queryRaw`SELECT 1`
    res.json({ status: 'healthy', database: 'connected' })
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message })
  }
})
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# SQLite backup
cp db/dev.db backups/dev-$(date +%Y%m%d-%H%M%S).db

# PostgreSQL backup
pg_dump blackjack > backups/blackjack-$(date +%Y%m%d).sql

# MySQL backup
mysqldump blackjack > backups/blackjack-$(date +%Y%m%d).sql
```

### Recovery Process
```bash
# SQLite recovery
cp backups/dev-20241009-120000.db db/dev.db

# PostgreSQL recovery
psql blackjack < backups/blackjack-20241009.sql

# MySQL recovery
mysql blackjack < backups/blackjack-20241009.sql
```

---

## 🎯 Best Practices

1. **Use PostgreSQL for production** - better performance and features
2. **Implement connection pooling** - handle concurrent users
3. **Add proper indexes** - optimize query performance
4. **Regular backups** - prevent data loss
5. **Monitor performance** - identify bottlenecks early
6. **Use transactions** - ensure data consistency
7. **Validate inputs** - prevent SQL injection
8. **Plan for scaling** - design for growth

Database Anda sudah siap untuk production! 🗄️✨