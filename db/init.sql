-- Create Users table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "balance" REAL DEFAULT 1000.0,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create GameSessions table
CREATE TABLE IF NOT EXISTS "GameSession" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "handsPlayed" INTEGER DEFAULT 0,
    "totalBet" REAL DEFAULT 0,
    "result" REAL DEFAULT 0,
    "winRate" REAL DEFAULT 0,
    "duration" INTEGER DEFAULT 0,
    "blackjacks" INTEGER DEFAULT 0,
    "busts" INTEGER DEFAULT 0,
    "isCompleted" BOOLEAN DEFAULT FALSE,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create GameRounds table
CREATE TABLE IF NOT EXISTS "GameRound" (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "playerHand" TEXT NOT NULL,
    "dealerHand" TEXT NOT NULL,
    "playerValue" INTEGER NOT NULL,
    "dealerValue" INTEGER NOT NULL,
    "betAmount" REAL NOT NULL,
    "result" TEXT NOT NULL,
    "winAmount" REAL NOT NULL,
    "isBlackjack" BOOLEAN DEFAULT FALSE,
    "isBust" BOOLEAN DEFAULT FALSE,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE
);

-- Create CryptoPrices table
CREATE TABLE IF NOT EXISTS "CryptoPrice" (
    "id" TEXT PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "priceGBC" REAL NOT NULL,
    "priceUSD" REAL NOT NULL,
    "change24h" REAL NOT NULL,
    "volume24h" REAL NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Transactions table
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "fromCurrency" TEXT,
    "toCurrency" TEXT,
    "rate" REAL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "description" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create Wallets table
CREATE TABLE IF NOT EXISTS "Wallet" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "address" TEXT,
    "balance" REAL DEFAULT 0,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create Posts table
CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN DEFAULT FALSE,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);