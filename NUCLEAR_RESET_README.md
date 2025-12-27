# Nuclear Database Reset - Complete Documentation

## ⚠️ WARNING: DATA LOSS OCCURRED

This was a **nuclear reset** of the database. All data has been permanently deleted.

## What Happened

The database accumulated migration conflicts and schema inconsistencies:
- `txHash` column existed but migration history didn't track it properly
- `blockNumber` column was missing from the database but defined in schema
- `confirmations` column had incomplete migration
- Multiple conflicting migration files
- Corrupted migration history in `_prisma_migrations` table

## Solution Implemented

### Nuclear Reset Process

1. **Deleted All Old Migrations**
   - Removed 6 conflicting migration folders
   - Cleared corrupted migration history

2. **Created Single Comprehensive Migration**
   - Migration: `20241227_nuclear_reset`
   - Drops all existing tables (CASCADE)
   - Recreates all enums
   - Recreates all tables from scratch based on `schema.prisma`
   - Creates all indexes
   - Establishes all foreign keys

3. **Executed Reset**
   - Used custom Node.js script (`nuclear-reset.js`) to bypass Prisma CLI hanging issues
   - Connected directly to PostgreSQL using `pg` driver
   - Executed the migration SQL
   - Updated `_prisma_migrations` table to record the reset

4. **Verified Success**
   - All tables created successfully
   - All blockchain columns exist (`txHash`, `blockNumber`, `confirmations`)
   - Database perfectly synchronized with `schema.prisma`
   - All data counts are zero (fresh start)

## Database State After Reset

### ✅ Tables Created
- `users` - User accounts (EMPTY)
- `games` - Game history (EMPTY)
- `game_sessions` - Gaming sessions (EMPTY)
- `game_moves` - Individual moves (EMPTY)
- `transactions` - All transactions (EMPTY)
- `wallets` - Crypto wallets (EMPTY)
- `audit_logs` - Audit trail (EMPTY)
- `system_config` - System configuration (EMPTY)
- `crypto_prices` - Crypto pricing data (EMPTY)

### ✅ Critical Blockchain Columns
All blockchain-related columns now exist in the `transactions` table:
- `txHash` (VARCHAR(255), nullable, unique)
- `blockNumber` (INTEGER, nullable)
- `confirmations` (INTEGER, default 0)
- `errorMessage` (TEXT, nullable)

### ✅ All Indexes Created
- User indexes (6 indexes for performance)
- Game indexes (9 indexes for game queries)
- Transaction indexes (4 indexes for blockchain tracking)
- Session indexes (2 indexes)
- And more...

### ✅ All Foreign Keys Established
- Games → Users
- GameSessions → Users
- GameMoves → Games
- Transactions → Users
- Wallets → Users

## Files Added

1. **`nuclear-reset.js`**
   - Custom script to execute nuclear reset
   - Bypasses Prisma CLI issues
   - Connects directly to PostgreSQL
   - Executes migration SQL
   - Updates migration history

2. **`verify-reset.js`**
   - Verification script
   - Lists all tables
   - Shows row counts (all should be 0)
   - Verifies critical columns exist
   - Confirms schema synchronization

3. **`prisma/migrations/20241227_nuclear_reset/migration.sql`**
   - Single comprehensive migration
   - Drops everything
   - Rebuilds from scratch
   - ~400 lines of SQL

## How to Use the Reset Scripts

### Run Nuclear Reset (if needed again)
```bash
node nuclear-reset.js
```

### Verify Database Structure
```bash
node verify-reset.js
```

## Railway Deployment

When this branch is deployed to Railway:

1. Railway will detect the new migration
2. `prisma migrate deploy` will run automatically
3. The database will be reset on Railway as well
4. All Railway data will be deleted
5. Application will start with a clean database

## Testing After Reset

1. **User Registration**
   - Create new user account
   - Verify balance starts at correct amount

2. **Game Play**
   - Play a game
   - Verify bet deduction
   - Verify win/loss handling

3. **Transactions**
   - Check transaction records
   - Verify all columns populated correctly
   - Confirm no "column does not exist" errors

4. **Blockchain Events**
   - Test deposit listener
   - Test withdrawal listener
   - Verify `txHash`, `blockNumber`, `confirmations` are recorded

## What Was Lost

### ❌ All User Data
- User accounts
- Wallet addresses
- Balances
- Login history

### ❌ All Game Data
- Game history
- Wins/losses
- Player statistics
- Session data

### ❌ All Transaction Data
- Deposits
- Withdrawals
- Game bets
- Blockchain transactions

### ❌ All Other Data
- Audit logs
- System configuration
- Crypto price history
- Wallet data

## Why This Was Acceptable

- ✅ Project is in testing/development phase
- ✅ No real users yet
- ✅ No production data
- ✅ Test data can be easily regenerated
- ✅ Cleaner than debugging migration conflicts
- ✅ Faster than piecemeal fixes
- ✅ Ensures perfect schema synchronization

## When NOT to Use Nuclear Reset

❌ **Do NOT use if:**
- You have production users
- User data is important
- You need to preserve balances
- You're in stable release phase
- Data loss would impact business

✅ **DO use if:**
- Testing/development phase
- Migration conflicts are complex
- Database is out of sync with schema
- Want a clean slate quickly
- Data can be regenerated

## Migration History

### Before Reset (Corrupted)
```
20251225081040_init
20251225120000_set_user_balance_defaults_to_zero
20251227001503_add_confirmations_to_transactions
20251227011747_add_tx_hash_fixed
20241227021050_add_blockchain_columns
20251227021050_add_blockchain_fields
```
(Note: Dates were inconsistent, migrations conflicting)

### After Reset (Clean)
```
20241227_nuclear_reset
```
(Single comprehensive migration, everything in sync)

## Next Steps

1. ✅ Database is reset and clean
2. ✅ Schema is synchronized
3. ✅ Migrations are clean
4. ⏭️ Test the application thoroughly
5. ⏭️ Create new test users
6. ⏭️ Verify all features work
7. ⏭️ Monitor for any database errors

## Troubleshooting

If you encounter any issues after the reset:

1. **Check Database Connection**
   ```bash
   node verify-reset.js
   ```

2. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Check Migration Status**
   ```bash
   npx prisma migrate status
   ```

4. **View Current Schema**
   ```bash
   npx prisma db pull
   ```

## Technical Details

### Tools Used
- **Prisma ORM** - Schema definition and migrations
- **PostgreSQL** - Database
- **pg** npm package - Direct database access
- **Node.js** - Custom reset scripts

### Why Prisma CLI Didn't Work
- `prisma migrate reset` hung on database connection
- `prisma db push --force-reset` also hung
- Likely due to connection pooler timeout issues
- Solution: Direct PostgreSQL connection with `pg` driver

### Migration SQL Structure
1. Drop all tables (CASCADE to handle foreign keys)
2. Drop all enums
3. Create enums
4. Create tables
5. Create unique indexes
6. Create performance indexes
7. Add foreign key constraints

## Commit Information

**Branch:** `chore-nuclear-db-reset-prisma`

**Commit Message:** 
```
chore: nuclear database reset - drop all tables and rebuild from scratch

BREAKING CHANGE: This completely resets the database and deletes all data
```

**Files Changed:**
- 10 files changed
- 417 insertions(+)
- 207 deletions(-)

## Summary

✅ **Problem Solved:** Migration conflicts and schema inconsistencies  
✅ **Solution:** Nuclear reset - drop everything and rebuild  
✅ **Result:** Clean database perfectly synchronized with schema  
✅ **Trade-off:** All data deleted (acceptable for testing phase)  
✅ **Status:** Ready for fresh testing  

---

**Date:** December 27, 2024  
**Database:** PostgreSQL (Supabase)  
**Deployment:** Railway  
**Phase:** Testing/Development  
