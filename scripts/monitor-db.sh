#!/bin/bash

# Database Monitoring Script for BlackJack Game
# This script monitors database health and performance

set -e

API_URL=${API_URL:-"http://localhost:3000"}
API_KEY=${API_KEY:-"your-system-api-key"}
LOG_FILE="/home/z/my-project/backups/monitoring.log"
ALERT_EMAIL=${ALERT_EMAIL:-""}

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

# Send alert function
send_alert() {
    local subject="$1"
    local message="$2"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log "ALERT: Email sent to $ALERT_EMAIL - $subject"
    fi
    
    # Also log as error
    print_error "$subject: $message"
}

# Check database health
check_health() {
    print_status "Checking database health..."
    
    local response=$(curl -s -w "%{http_code}" "$API_URL/api/health")
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$status" = "healthy" ]; then
            print_status "Database is healthy"
            return 0
        else
            send_alert "Database Health Alert" "Database status: $status"
            return 1
        fi
    else
        send_alert "Database Connection Failed" "HTTP $http_code - $body"
        return 1
    fi
}

# Check database statistics
check_stats() {
    print_status "Checking database statistics..."
    
    local response=$(curl -s "$API_URL/api/database-stats")
    
    if [ $? -eq 0 ]; then
        local user_count=$(echo "$response" | grep -o '"userCount":[0-9]*' | cut -d':' -f2)
        local game_count=$(echo "$response" | grep -o '"gameCount":[0-9]*' | cut -d':' -f2)
        local avg_query_time=$(echo "$response" | grep -o '"averageQueryTime":[0-9]*' | cut -d':' -f2)
        local slow_query_percentage=$(echo "$response" | grep -o '"slowQueryPercentage":[0-9]*' | cut -d':' -f2)
        
        print_status "Users: $user_count, Games: $game_count"
        print_status "Avg Query Time: ${avg_query_time}ms, Slow Queries: ${slow_query_percentage}%"
        
        # Alert on high slow query percentage
        if [ "$slow_query_percentage" -gt 10 ]; then
            send_alert "High Slow Query Percentage" "Slow queries: ${slow_query_percentage}%"
        fi
        
        # Alert on high average query time
        if [ "$avg_query_time" -gt 500 ]; then
            send_alert "High Average Query Time" "Average query time: ${avg_query_time}ms"
        fi
        
        return 0
    else
        send_alert "Database Stats Check Failed" "Could not retrieve database statistics"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    print_status "Checking disk space..."
    
    local db_path=$(echo "$DATABASE_URL" | sed 's/file://')
    local db_dir=$(dirname "$db_path")
    
    if [ -d "$db_dir" ]; then
        local disk_usage=$(df "$db_dir" | awk 'NR==2 {print $5}' | sed 's/%//')
        
        print_status "Disk usage: ${disk_usage}%"
        
        if [ "$disk_usage" -gt 80 ]; then
            send_alert "High Disk Usage" "Database disk usage: ${disk_usage}%"
        fi
        
        return 0
    else
        print_warning "Database directory not found: $db_dir"
        return 1
    fi
}

# Check backup status
check_backups() {
    print_status "Checking backup status..."
    
    local backup_dir="/home/z/my-project/backups"
    local backup_count=$(find "$backup_dir" -name "*backup_*.gz" -mtime -1 | wc -l)
    
    print_status "Recent backups (last 24h): $backup_count"
    
    if [ "$backup_count" -eq 0 ]; then
        send_alert "No Recent Backups" "No backups found in the last 24 hours"
        return 1
    fi
    
    return 0
}

# Performance test
performance_test() {
    print_status "Running performance test..."
    
    local start_time=$(date +%s%N)
    
    # Run multiple health checks
    for i in {1..10}; do
        curl -s "$API_URL/api/health" > /dev/null
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    local avg_time=$((duration / 10))
    
    print_status "Performance test: 10 requests in ${duration}ms (avg: ${avg_time}ms/request)"
    
    if [ "$avg_time" -gt 1000 ]; then
        send_alert "Poor Performance" "Average response time: ${avg_time}ms"
        return 1
    fi
    
    return 0
}

# Main monitoring function
run_monitoring() {
    print_status "Starting database monitoring..."
    print_status "API URL: $API_URL"
    
    local exit_code=0
    
    # Run all checks
    check_health || exit_code=1
    check_stats || exit_code=1
    check_disk_space || exit_code=1
    check_backups || exit_code=1
    performance_test || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        print_status "All monitoring checks passed"
    else
        print_error "Some monitoring checks failed"
    fi
    
    return $exit_code
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -q, --quiet         Run quietly (no output)"
    echo "  --health-only       Check health only"
    echo "  --stats-only        Check stats only"
    echo "  --performance-only  Run performance test only"
    echo ""
    echo "Environment variables:"
    echo "  API_URL             Base URL of the application (default: http://localhost:3000)"
    echo "  API_KEY             System API key for authenticated endpoints"
    echo "  ALERT_EMAIL         Email address for alerts"
    echo "  DATABASE_URL        Database connection URL"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_usage
        exit 0
        ;;
    -q|--quiet)
        exec > /dev/null 2>&1
        run_monitoring
        exit $?
        ;;
    --health-only)
        check_health
        exit $?
        ;;
    --stats-only)
        check_stats
        exit $?
        ;;
    --performance-only)
        performance_test
        exit $?
        ;;
    "")
        run_monitoring
        exit $?
        ;;
    *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac