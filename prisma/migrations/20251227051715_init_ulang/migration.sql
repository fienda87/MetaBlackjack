-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GameState" AS ENUM ('BETTING', 'PLAYING', 'DEALER', 'ENDED', 'INSURANCE', 'SPLIT_PLAYING', 'SURRENDERED');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSE', 'PUSH', 'BLACKJACK', 'SURRENDER', 'SPLIT_WIN', 'SPLIT_LOSE', 'SPLIT_PUSH');

-- CreateEnum
CREATE TYPE "MoveType" AS ENUM ('HIT', 'STAND', 'DOUBLE_DOWN', 'DEAL', 'INSURANCE_ACCEPT', 'INSURANCE_DECLINE', 'SPLIT', 'SURRENDER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SIGNUP_BONUS', 'DEPOSIT', 'WITHDRAWAL', 'GAME_WIN', 'GAME_LOSS', 'GAME_BET', 'ADMIN_ADJUSTMENT', 'REFERRAL_BONUS', 'DAILY_BONUS');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "startingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "twoFactorSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "sessionId" TEXT,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalBet" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalWin" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stats" JSONB NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "moveType" "MoveType" NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingTimeMs" INTEGER,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "referenceId" VARCHAR(255),
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "txHash" VARCHAR(255),
    "blockNumber" INTEGER,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_prices" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "priceGBC" DOUBLE PRECISION NOT NULL,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crypto_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "address" TEXT,
    "encryptedPrivateKey" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE INDEX "users_isActive_createdAt_idx" ON "users"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "users_isActive_lastLoginAt_idx" ON "users"("isActive", "lastLoginAt");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_walletAddress_idx" ON "users"("walletAddress");

-- CreateIndex
CREATE INDEX "users_isActive_walletAddress_idx" ON "users"("isActive", "walletAddress");

-- CreateIndex
CREATE INDEX "games_playerId_state_idx" ON "games"("playerId", "state");

-- CreateIndex
CREATE INDEX "games_playerId_createdAt_idx" ON "games"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "games_playerId_result_createdAt_idx" ON "games"("playerId", "result", "createdAt");

-- CreateIndex
CREATE INDEX "games_sessionId_idx" ON "games"("sessionId");

-- CreateIndex
CREATE INDEX "games_state_createdAt_idx" ON "games"("state", "createdAt");

-- CreateIndex
CREATE INDEX "games_result_createdAt_idx" ON "games"("result", "createdAt");

-- CreateIndex
CREATE INDEX "games_playerId_state_createdAt_idx" ON "games"("playerId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "games_createdAt_state_idx" ON "games"("createdAt", "state");

-- CreateIndex
CREATE INDEX "games_playerId_result_idx" ON "games"("playerId", "result");

-- CreateIndex
CREATE INDEX "game_sessions_playerId_endTime_idx" ON "game_sessions"("playerId", "endTime");

-- CreateIndex
CREATE INDEX "game_sessions_playerId_startTime_idx" ON "game_sessions"("playerId", "startTime");

-- CreateIndex
CREATE INDEX "game_moves_gameId_timestamp_idx" ON "game_moves"("gameId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "game_moves_moveType_timestamp_idx" ON "game_moves"("moveType", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_timestamp_idx" ON "audit_logs"("resource", "resourceId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_timestamp_idx" ON "audit_logs"("action", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");

-- CreateIndex
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_userId_status_idx" ON "transactions"("userId", "status");

-- CreateIndex
CREATE INDEX "transactions_txHash_idx" ON "transactions"("txHash");

-- CreateIndex
CREATE INDEX "transactions_status_type_idx" ON "transactions"("status", "type");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_currency_balance_idx" ON "wallets"("currency", "balance");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_currency_key" ON "wallets"("userId", "currency");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

