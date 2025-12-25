-- CreateTable User
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL UNIQUE,
    "username" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "startingBalance" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "totalDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "twoFactorSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable Game
CREATE TABLE "games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "betAmount" DOUBLE PRECISION NOT NULL,
    "insuranceBet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currentBet" DOUBLE PRECISION NOT NULL,
    "state" "GameState" NOT NULL DEFAULT 'BETTING',
    "playerHand" JSONB NOT NULL,
    "dealerHand" JSONB NOT NULL,
    "splitHands" JSONB,
    "deck" JSONB NOT NULL,
    "gameStats" JSONB NOT NULL,
    "result" "GameResult",
    "winAmount" DOUBLE PRECISION,
    "insuranceWin" DOUBLE PRECISION,
    "netProfit" DOUBLE PRECISION,
    "hasSplit" BOOLEAN NOT NULL DEFAULT false,
    "hasSurrendered" BOOLEAN NOT NULL DEFAULT false,
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "sessionId" TEXT
);

-- CreateTable GameSession
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "endTime" TIMESTAMP(3),
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalBet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalWin" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stats" JSONB NOT NULL
);

-- CreateTable GameMove
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "moveType" "MoveType" NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "processingTimeMs" INTEGER
);

-- CreateTable SystemConfig
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable AuditLog
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- CreateTable Transaction
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable CryptoPrice
CREATE TABLE "crypto_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "priceGBC" DOUBLE PRECISION NOT NULL,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable Wallet
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "address" TEXT,
    "encryptedPrivateKey" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex User
CREATE UNIQUE INDEX "User_username_key" ON "users"("username");

-- CreateIndex User
CREATE UNIQUE INDEX "User_email_key" ON "users"("email");

-- CreateIndex User
CREATE UNIQUE INDEX "User_apiKey_key" ON "users"("apiKey");

-- CreateIndex User
CREATE INDEX "User_isActive_createdAt_idx" ON "users"("isActive", "createdAt");

-- CreateIndex User
CREATE INDEX "User_isActive_lastLoginAt_idx" ON "users"("isActive", "lastLoginAt");

-- CreateIndex User
CREATE INDEX "User_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex User
CREATE INDEX "User_email_idx" ON "users"("email");

-- CreateIndex User
CREATE INDEX "User_walletAddress_idx" ON "users"("walletAddress");

-- CreateIndex User
CREATE INDEX "User_isActive_walletAddress_idx" ON "users"("isActive", "walletAddress");

-- CreateIndex Game
CREATE INDEX "Game_playerId_state_idx" ON "games"("playerId", "state");

-- CreateIndex Game
CREATE INDEX "Game_playerId_createdAt_idx" ON "games"("playerId", "createdAt" DESC);

-- CreateIndex Game
CREATE INDEX "Game_playerId_result_createdAt_idx" ON "games"("playerId", "result", "createdAt");

-- CreateIndex Game
CREATE INDEX "Game_sessionId_idx" ON "games"("sessionId");

-- CreateIndex Game
CREATE INDEX "Game_state_createdAt_idx" ON "games"("state", "createdAt");

-- CreateIndex Game
CREATE INDEX "Game_result_createdAt_idx" ON "games"("result", "createdAt");

-- CreateIndex Game
CREATE INDEX "Game_playerId_state_createdAt_idx" ON "games"("playerId", "state", "createdAt");

-- CreateIndex Game
CREATE INDEX "Game_createdAt_state_idx" ON "games"("createdAt", "state");

-- CreateIndex Game
CREATE INDEX "Game_playerId_result_idx" ON "games"("playerId", "result");

-- CreateIndex GameSession
CREATE INDEX "GameSession_playerId_endTime_idx" ON "game_sessions"("playerId", "endTime");

-- CreateIndex GameSession
CREATE INDEX "GameSession_playerId_startTime_idx" ON "game_sessions"("playerId", "startTime");

-- CreateIndex GameMove
CREATE INDEX "GameMove_gameId_timestamp_idx" ON "game_moves"("gameId", "timestamp" DESC);

-- CreateIndex GameMove
CREATE INDEX "GameMove_moveType_timestamp_idx" ON "game_moves"("moveType", "timestamp");

-- CreateIndex AuditLog
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp" DESC);

-- CreateIndex AuditLog
CREATE INDEX "AuditLog_resource_resourceId_timestamp_idx" ON "audit_logs"("resource", "resourceId", "timestamp");

-- CreateIndex AuditLog
CREATE INDEX "AuditLog_action_timestamp_idx" ON "audit_logs"("action", "timestamp");

-- CreateIndex Transaction
CREATE INDEX "Transaction_userId_createdAt_idx" ON "transactions"("userId", "createdAt" DESC);

-- CreateIndex Transaction
CREATE INDEX "Transaction_userId_type_createdAt_idx" ON "transactions"("userId", "type", "createdAt");

-- CreateIndex Transaction
CREATE INDEX "Transaction_status_type_idx" ON "transactions"("status", "type");

-- CreateIndex Transaction
CREATE INDEX "Transaction_referenceId_idx" ON "transactions"("referenceId");

-- CreateIndex Transaction
CREATE INDEX "Transaction_status_createdAt_idx" ON "transactions"("status", "createdAt");

-- CreateIndex Transaction
CREATE INDEX "Transaction_userId_status_createdAt_idx" ON "transactions"("userId", "status", "createdAt");

-- CreateIndex Wallet
CREATE UNIQUE INDEX "Wallet_userId_currency_key" ON "wallets"("userId", "currency");

-- CreateIndex Wallet
CREATE INDEX "Wallet_address_idx" ON "wallets"("address");

-- CreateIndex Wallet
CREATE INDEX "Wallet_currency_balance_idx" ON "wallets"("currency", "balance");

-- AddForeignKey Game
ALTER TABLE "games" ADD CONSTRAINT "games_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Game
ALTER TABLE "games" ADD CONSTRAINT "games_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey GameMove
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey GameSession
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Transaction
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Wallet
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
