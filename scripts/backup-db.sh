#!/bin/bash

# Database Backup Script for BlackJack Game
# Supports SQLite, PostgreSQL, and MySQL

set -e

BACKUP_DIR="/home/z/my-project/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$BACKUP_DIR/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    print_status "Created backup directory: $BACKUP_DIR"
fi

# Get database URL from environment or .env.local
DATABASE_URL=${DATABASE_URL:-$(grep DATABASE_URL .env.local | cut -d'=' -f2- | tr -d '"')}

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not found in environment or .env.local"
    exit 1
fi

print_status "Starting database backup..."
print_status "Database URL: ${DATABASE_URL:0:20}..."

# Detect database type and perform backup
if [[ "$DATABASE_URL" == file:* ]]; then
    # SQLite backup
    DB_FILE="${DATABASE_URL#file:}"
    if [ -f "$DB_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/sqlite_backup_$TIMESTAMP.db"
        cp "$DB_FILE" "$BACKUP_FILE"
        gzip "$BACKUP_FILE"
        print_status "SQLite backup completed: ${BACKUP_FILE}.gz"
        
        # Verify backup
        if [ -f "${BACKUP_FILE}.gz" ]; then
            SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            print_status "Backup size: $SIZE"
        else
            print_error "Backup verification failed"
            exit 1
        fi
    else
        print_error "SQLite database file not found: $DB_FILE"
        exit 1
    fi
    
elif [[ "$DATABASE_URL" == postgresql:* ]]; then
    # PostgreSQL backup
    BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"
    
    if command -v pg_dump &> /dev/null; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        gzip "$BACKUP_FILE"
        print_status "PostgreSQL backup completed: ${BACKUP_FILE}.gz"
        
        # Verify backup
        if [ -f "${BACKUP_FILE}.gz" ]; then
            SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            print_status "Backup size: $SIZE"
        else
            print_error "Backup verification failed"
            exit 1
        fi
    else
        print_error "pg_dump not found. Please install PostgreSQL client tools"
        exit 1
    fi
    
elif [[ "$DATABASE_URL" == mysql:* ]]; then
    # MySQL backup
    BACKUP_FILE="$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"
    
    if command -v mysqldump &> /dev/null; then
        mysqldump "$DATABASE_URL" > "$BACKUP_FILE"
        gzip "$BACKUP_FILE"
        print_status "MySQL backup completed: ${BACKUP_FILE}.gz"
        
        # Verify backup
        if [ -f "${BACKUP_FILE}.gz" ]; then
            SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            print_status "Backup size: $SIZE"
        else
            print_error "Backup verification failed"
            exit 1
        fi
    else
        print_error "mysqldump not found. Please install MySQL client tools"
        exit 1
    fi
    
else
    print_error "Unsupported database type. Supported: SQLite, PostgreSQL, MySQL"
    exit 1
fi

# Clean up old backups (keep last 7 days)
print_status "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*backup_*.gz" -mtime +7 -delete
OLD_COUNT=$(find "$BACKUP_DIR" -name "*backup_*.gz" | wc -l)
print_status "Retained $OLD_COUNT backup files"

# Create backup summary
SUMMARY_FILE="$BACKUP_DIR/backup_summary_$TIMESTAMP.txt"
cat > "$SUMMARY_FILE" << EOF
BlackJack Game Database Backup Summary
=====================================
Backup Date: $(date)
Database Type: $(echo "$DATABASE_URL" | cut -d':' -f1)
Backup File: ${BACKUP_FILE}.gz
Backup Size: $SIZE
Database URL: ${DATABASE_URL:0:20}...

Files in backup directory:
$(ls -la "$BACKUP_DIR"/*.gz | tail -5)
EOF

print_status "Backup summary created: $SUMMARY_FILE"

# Health check - test database connection
print_status "Performing database health check..."
if [[ "$DATABASE_URL" == file:* ]]; then
    DB_FILE="${DATABASE_URL#file:}"
    if [ -f "$DB_FILE" ] && [ -r "$DB_FILE" ]; then
        print_status "Database health check passed"
    else
        print_warning "Database health check failed - file not accessible"
    fi
else
    # For PostgreSQL/MySQL, we'd need to implement connection test
    print_status "Database health check skipped for remote database"
fi

print_status "Backup process completed successfully!"
print_status "Log file: $LOG_FILE"
print_status "Backup directory: $BACKUP_DIR"

# Show recent backups
echo ""
print_status "Recent backups:"
ls -la "$BACKUP_DIR"/*.gz | tail -3 | awk '{print $9, $5}'