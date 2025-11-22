-- 🚀 Performance Indexes Migration
-- Add strategic indexes for faster query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS "users_isActive_createdAt_idx" ON "users"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- Games table indexes (additional to existing)
CREATE INDEX IF NOT EXISTS "games_playerId_result_createdAt_idx" ON "games"("playerId", "result", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "games_state_createdAt_idx" ON "games"("state", "createdAt");
CREATE INDEX IF NOT EXISTS "games_result_createdAt_idx" ON "games"("result", "createdAt");

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "transactions_userId_type_createdAt_idx" ON "transactions"("userId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "transactions_referenceId_idx" ON "transactions"("referenceId");
CREATE INDEX IF NOT EXISTS "transactions_status_createdAt_idx" ON "transactions"("status", "createdAt");

-- GameMove table indexes
CREATE INDEX IF NOT EXISTS "game_moves_gameId_timestamp_idx" ON "game_moves"("gameId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "game_moves_moveType_timestamp_idx" ON "game_moves"("moveType", "timestamp");

-- AuditLog table indexes
CREATE INDEX IF NOT EXISTS "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resourceId_timestamp_idx" ON "audit_logs"("resource", "resourceId", "timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_action_timestamp_idx" ON "audit_logs"("action", "timestamp");

-- Wallet table indexes
CREATE INDEX IF NOT EXISTS "wallets_address_idx" ON "wallets"("address");
CREATE INDEX IF NOT EXISTS "wallets_currency_balance_idx" ON "wallets"("currency", "balance");

-- Analyze tables to update statistics for query planner
ANALYZE "users";
ANALYZE "games";
ANALYZE "transactions";
ANALYZE "game_moves";
ANALYZE "game_sessions";
ANALYZE "audit_logs";
ANALYZE "wallets";
