-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "balance" REAL NOT NULL DEFAULT 10.0,
    "startingBalance" REAL NOT NULL DEFAULT 10.0,
    "totalDeposited" REAL NOT NULL DEFAULT 0.0,
    "totalWithdrawn" REAL NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "twoFactorSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "emailVerificationToken" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "betAmount" REAL NOT NULL,
    "insuranceBet" REAL NOT NULL DEFAULT 0.0,
    "currentBet" REAL NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'BETTING',
    "playerHand" JSONB NOT NULL,
    "dealerHand" JSONB NOT NULL,
    "splitHands" JSONB,
    "deck" JSONB NOT NULL,
    "gameStats" JSONB NOT NULL,
    "result" TEXT,
    "winAmount" REAL,
    "insuranceWin" REAL,
    "netProfit" REAL,
    "hasSplit" BOOLEAN NOT NULL DEFAULT false,
    "hasSurrendered" BOOLEAN NOT NULL DEFAULT false,
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "sessionId" TEXT,
    CONSTRAINT "games_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "games_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalBet" REAL NOT NULL DEFAULT 0.0,
    "totalWin" REAL NOT NULL DEFAULT 0.0,
    "netProfit" REAL NOT NULL DEFAULT 0.0,
    "stats" JSONB NOT NULL,
    CONSTRAINT "game_sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "moveType" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingTimeMs" INTEGER,
    CONSTRAINT "game_moves_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
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
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "balanceBefore" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "crypto_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "priceGBC" REAL NOT NULL,
    "priceUSD" REAL NOT NULL,
    "change24h" REAL NOT NULL DEFAULT 0,
    "volume24h" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "address" TEXT,
    "encryptedPrivateKey" TEXT,
    "type" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "games_playerId_state_idx" ON "games"("playerId", "state");

-- CreateIndex
CREATE INDEX "games_playerId_createdAt_idx" ON "games"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "games_sessionId_idx" ON "games"("sessionId");

-- CreateIndex
CREATE INDEX "game_sessions_playerId_endTime_idx" ON "game_sessions"("playerId", "endTime");

-- CreateIndex
CREATE INDEX "game_sessions_playerId_startTime_idx" ON "game_sessions"("playerId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_currency_key" ON "wallets"("userId", "currency");
