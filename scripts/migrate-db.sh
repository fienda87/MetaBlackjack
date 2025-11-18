#!/bin/bash

# Database Migration Script
# Migrate from SQLite to PostgreSQL or MySQL

set -e

BACKUP_DIR="/home/z/my-project/backups"
MIGRATION_DIR="/home/z/my-project/migrations"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$BACKUP_DIR/migration.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
    log "INFO: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
}

print_question() {
    echo -e "${BLUE}[QUESTION]${NC} $1"
}

# Create directories
mkdir -p "$BACKUP_DIR" "$MIGRATION_DIR"

print_status "BlackJack Game Database Migration Tool"
echo "============================================"

# Get current database URL
CURRENT_DB_URL=${DATABASE_URL:-$(grep DATABASE_URL .env.local | cut -d'=' -f2- | tr -d '"')}

if [ -z "$CURRENT_DB_URL" ]; then
    print_error "Current DATABASE_URL not found"
    exit 1
fi

print_status "Current database: ${CURRENT_DB_URL:0:20}..."

# Check current database type
if [[ "$CURRENT_DB_URL" == file:* ]]; then
    CURRENT_TYPE="SQLite"
elif [[ "$CURRENT_DB_URL" == postgresql:* ]]; then
    CURRENT_TYPE="PostgreSQL"
elif [[ "$CURRENT_DB_URL" == mysql:* ]]; then
    CURRENT_TYPE="MySQL"
else
    print_error "Unsupported current database type"
    exit 1
fi

print_status "Current database type: $CURRENT_TYPE"

# Select target database type
echo ""
print_question "Select target database type:"
echo "1) PostgreSQL (Recommended for production)"
echo "2) MySQL"
echo "3) SQLite"
echo "4) Cancel"

read -r target_choice

case $target_choice in
    1)
        TARGET_TYPE="PostgreSQL"
        TARGET_PREFIX="postgresql://"
        ;;
    2)
        TARGET_TYPE="MySQL"
        TARGET_PREFIX="mysql://"
        ;;
    3)
        TARGET_TYPE="SQLite"
        TARGET_PREFIX="file:"
        ;;
    4)
        print_status "Migration cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

if [ "$CURRENT_TYPE" = "$TARGET_TYPE" ]; then
    print_error "Cannot migrate to the same database type"
    exit 1
fi

print_status "Target database type: $TARGET_TYPE"

# Get target database URL
print_question "Enter target database URL:"
echo "Format examples:"
echo "- PostgreSQL: postgresql://user:password@host:port/database"
echo "- MySQL: mysql://user:password@host:port/database"
echo "- SQLite: file:./path/to/database.db"
echo ""

read -r target_db_url

if [[ ! "$target_db_url" == "$TARGET_PREFIX"* ]]; then
    print_error "Invalid database URL format for $TARGET_TYPE"
    exit 1
fi

print_status "Target database: ${target_db_url:0:20}..."

# Confirmation
print_warning "You are about to migrate from $CURRENT_TYPE to $TARGET_TYPE"
print_warning "This will create a backup of your current database"
print_question "Do you want to continue? (yes/no):"

read -r confirm

if [[ "$confirm" != "yes" ]]; then
    print_status "Migration cancelled"
    exit 0
fi

# Step 1: Backup current database
print_status "Step 1: Creating backup of current database..."
BACKUP_FILE="$BACKUP_DIR/migration_backup_$TIMESTAMP"

if [[ "$CURRENT_DB_URL" == file:* ]]; then
    # SQLite backup
    DB_FILE="${CURRENT_DB_URL#file:}"
    cp "$DB_FILE" "$BACKUP_FILE.db"
    gzip "$BACKUP_FILE.db"
    print_status "SQLite backup created: ${BACKUP_FILE.db.gz"
else
    # PostgreSQL/MySQL backup
    if [[ "$CURRENT_DB_URL" == postgresql:* ]]; then
        pg_dump "$CURRENT_DB_URL" > "$BACKUP_FILE.sql"
    else
        mysqldump "$CURRENT_DB_URL" > "$BACKUP_FILE.sql"
    fi
    gzip "$BACKUP_FILE.sql"
    print_status "Database backup created: ${BACKUP_FILE.sql.gz"
fi

# Step 2: Extract data for migration
print_status "Step 2: Extracting data from current database..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

if [[ "$CURRENT_DB_URL" == file:* ]]; then
    gunzip -c "${BACKUP_FILE}.db.gz" > "$TEMP_DIR/current.db"
    CURRENT_DB_FILE="$TEMP_DIR/current.db"
else
    gunzip -c "${BACKUP_FILE.sql.gz" > "$TEMP_DIR/current.sql"
    CURRENT_SQL_FILE="$TEMP_DIR/current.sql"
fi

# Step 3: Set up target database
print_status "Step 3: Setting up target database..."

# Update .env.local temporarily
ENV_BACKUP=".env.local.backup.$TIMESTAMP"
cp .env.local "$ENV_BACKUP"

# Update DATABASE_URL in .env.local
sed -i.tmp "s|DATABASE_URL=.*|DATABASE_URL=$target_db_url|" .env.local
rm .env.local.tmp

# Push schema to target database
print_status "Pushing schema to target database..."
npm run db:push

# Step 4: Migrate data
print_status "Step 4: Migrating data..."

# Create migration script
cat > "$TEMP_DIR/migrate.js" << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function migrate() {
    const sourceDb = new PrismaClient({
        datasources: {
            db: {
                url: process.env.SOURCE_DB_URL
            }
        }
    });
    
    const targetDb = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });

    try {
        console.log('Starting data migration...');
        
        // Migrate users
        const users = await sourceDb.user.findMany();
        console.log(`Migrating ${users.length} users...`);
        await targetDb.user.createMany({
            data: users
        });
        
        // Migrate game sessions
        const sessions = await sourceDb.gameSession.findMany();
        console.log(`Migrating ${sessions.length} game sessions...`);
        await targetDb.gameSession.createMany({
            data: sessions
        });
        
        // Migrate games
        const games = await sourceDb.game.findMany();
        console.log(`Migrating ${games.length} games...`);
        await targetDb.game.createMany({
            data: games
        });
        
        // Migrate game moves
        const moves = await sourceDb.gameMove.findMany();
        console.log(`Migrating ${moves.length} game moves...`);
        await targetDb.gameMove.createMany({
            data: moves
        });
        
        // Migrate system config
        const configs = await sourceDb.systemConfig.findMany();
        console.log(`Migrating ${configs.length} system configs...`);
        await targetDb.systemConfig.createMany({
            data: configs
        });
        
        // Migrate audit logs
        const logs = await sourceDb.auditLog.findMany();
        console.log(`Migrating ${logs.length} audit logs...`);
        await targetDb.auditLog.createMany({
            data: logs
        });
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await sourceDb.$disconnect();
        await targetDb.$disconnect();
    }
}

migrate();
EOF

# Run migration
SOURCE_DB_URL="$CURRENT_DB_URL" DATABASE_URL="$target_db_url" node "$TEMP_DIR/migrate.js"

# Step 5: Verify migration
print_status "Step 5: Verifying migration..."

# Create verification script
cat > "$TEMP_DIR/verify.js" << 'EOF'
const { PrismaClient } = require('@prisma/client');

async function verify() {
    const db = new PrismaClient();
    
    try {
        const userCount = await db.user.count();
        const gameCount = await db.game.count();
        const sessionCount = await db.gameSession.count();
        
        console.log(`Users: ${userCount}`);
        console.log(`Games: ${gameCount}`);
        console.log(`Sessions: ${sessionCount}`);
        
        if (userCount > 0 && gameCount > 0) {
            console.log('Verification successful!');
        } else {
            console.log('Verification failed - no data found');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

verify();
EOF

DATABASE_URL="$target_db_url" node "$TEMP_DIR/verify.js"

# Step 6: Update configuration
print_status "Step 6: Updating configuration..."

# Keep the new DATABASE_URL in .env.local
print_status "DATABASE_URL updated in .env.local"

# Clean up
rm -f "$ENV_BACKUP"

# Create migration report
REPORT_FILE="$MIGRATION_DIR/migration_report_$TIMESTAMP.txt"
cat > "$REPORT_FILE" << EOF
BlackJack Game Database Migration Report
======================================
Migration Date: $(date)
Source Database: $CURRENT_TYPE
Target Database: $TARGET_TYPE
Source URL: ${CURRENT_DB_URL:0:20}...
Target URL: ${target_db_url:0:20}...
Backup File: ${BACKUP_FILE}.gz

Migration Status: SUCCESS

Data Migrated:
- Users: $(node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient({datasources: {db: {url: '$target_db_url'}}});
db.user.count().then(c => console.log(c)).finally(() => db.\$disconnect());
")
- Games: $(node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient({datasources: {db: {url: '$target_db_url'}}});
db.game.count().then(c => console.log(c)).finally(() => db.\$disconnect());
")
- Sessions: $(node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient({datasources: {db: {url: '$target_db_url'}}});
db.gameSession.count().then(c => console.log(c)).finally(() => db.\$disconnect());
")

Next Steps:
1. Test the application with new database
2. Verify all functionality works correctly
3. Update any database-specific configurations
4. Monitor performance in the next few days

Rollback Instructions:
1. Restore backup: gunzip -c ${BACKUP_FILE}.gz > temp_restore
2. Update .env.local with original DATABASE_URL
3. Run: npm run db:push
EOF

print_status "Migration completed successfully!"
print_status "Migration report: $REPORT_FILE"
print_status "Backup file: ${BACKUP_FILE}.gz"
print_status "Log file: $LOG_FILE"

print_warning "Please test your application thoroughly with the new database"
print_warning "Keep the backup file for at least 30 days"

echo ""
print_status "Migration Summary:"
echo "- Source: $CURRENT_TYPE → Target: $TARGET_TYPE"
echo "- Backup created: ${BACKUP_FILE}.gz"
echo "- Configuration updated"
echo "- Verification passed"