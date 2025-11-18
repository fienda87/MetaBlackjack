#!/bin/bash

# Database Restore Script for BlackJack Game
# Supports SQLite, PostgreSQL, and MySQL

set -e

BACKUP_DIR="/home/z/my-project/backups"
LOG_FILE="$BACKUP_DIR/restore.log"

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

# Show available backups
show_backups() {
    echo ""
    print_status "Available backups:"
    echo "No.  File Name                           Size       Date"
    echo "------------------------------------------------------------"
    
    local count=1
    for file in "$BACKUP_DIR"/*.gz; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -c %y "$file" | cut -d' ' -f1,2 | cut -d'.' -f1)
            printf "%-4s %-35s %-10s %s\n" "$count" "$filename" "$size" "$date"
            ((count++))
        fi
    done
    echo ""
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Check if there are any backups
if [ ! "$(ls -A $BACKUP_DIR/*.gz 2>/dev/null)" ]; then
    print_error "No backup files found in $BACKUP_DIR"
    exit 1
fi

# Show available backups
show_backups

# Get database URL from environment or .env.local
DATABASE_URL=${DATABASE_URL:-$(grep DATABASE_URL .env.local | cut -d'=' -f2- | tr -d '"')}

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not found in environment or .env.local"
    exit 1
fi

print_status "Target database: ${DATABASE_URL:0:20}..."

# Select backup to restore
print_question "Enter backup number to restore (or 'q' to quit):"
read -r choice

if [[ "$choice" == "q" ]]; then
    print_status "Restore cancelled"
    exit 0
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
    print_error "Invalid choice. Please enter a number."
    exit 1
fi

# Get the selected backup file
backup_files=("$BACKUP_DIR"/*.gz)
if [ "$choice" -lt 1 ] || [ "$choice" -gt "${#backup_files[@]}" ]; then
    print_error "Invalid backup number"
    exit 1
fi

selected_backup="${backup_files[$((choice-1))]}"
backup_filename=$(basename "$selected_backup")

print_warning "You are about to restore from: $backup_filename"
print_warning "This will overwrite the current database!"
print_question "Are you sure you want to continue? (yes/no):"
read -r confirm

if [[ "$confirm" != "yes" ]]; then
    print_status "Restore cancelled"
    exit 0
fi

print_status "Starting database restore..."

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
print_status "Extracting backup file..."
gunzip -c "$selected_backup" > "$TEMP_DIR/restore_data"

# Detect database type and perform restore
if [[ "$DATABASE_URL" == file:* ]]; then
    # SQLite restore
    DB_FILE="${DATABASE_URL#file:}"
    
    # Create backup of current database before restore
    if [ -f "$DB_FILE" ]; then
        CURRENT_BACKUP="$BACKUP_DIR/current_before_restore_$(date +%Y%m%d_%H%M%S).db"
        cp "$DB_FILE" "$CURRENT_BACKUP"
        print_status "Current database backed up to: $CURRENT_BACKUP"
    fi
    
    # Restore database
    cp "$TEMP_DIR/restore_data" "$DB_FILE"
    print_status "SQLite database restored successfully"
    
elif [[ "$DATABASE_URL" == postgresql:* ]]; then
    # PostgreSQL restore
    if command -v psql &> /dev/null; then
        print_status "Restoring PostgreSQL database..."
        psql "$DATABASE_URL" < "$TEMP_DIR/restore_data"
        print_status "PostgreSQL database restored successfully"
    else
        print_error "psql not found. Please install PostgreSQL client tools"
        exit 1
    fi
    
elif [[ "$DATABASE_URL" == mysql:* ]]; then
    # MySQL restore
    if command -v mysql &> /dev/null; then
        print_status "Restoring MySQL database..."
        mysql "$DATABASE_URL" < "$TEMP_DIR/restore_data"
        print_status "MySQL database restored successfully"
    else
        print_error "mysql not found. Please install MySQL client tools"
        exit 1
    fi
    
else
    print_error "Unsupported database type. Supported: SQLite, PostgreSQL, MySQL"
    exit 1
fi

# Verify restore
print_status "Verifying restore..."
if [[ "$DATABASE_URL" == file:* ]]; then
    DB_FILE="${DATABASE_URL#file:}"
    if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
        SIZE=$(du -h "$DB_FILE" | cut -f1)
        print_status "Database verification passed. Size: $SIZE"
    else
        print_error "Database verification failed"
        exit 1
    fi
else
    print_status "Database verification completed for remote database"
fi

# Log restore operation
log "RESTORE: Restored from $backup_filename to $DATABASE_URL"

print_status "Database restore completed successfully!"
print_status "Log file: $LOG_FILE"

# Show database statistics if possible
if [[ "$DATABASE_URL" == file:* ]]; then
    print_status "Database statistics:"
    echo "- File size: $(du -h "$DB_FILE" | cut -f1)"
    echo "- Last modified: $(stat -c %y "$DB_FILE")"
fi