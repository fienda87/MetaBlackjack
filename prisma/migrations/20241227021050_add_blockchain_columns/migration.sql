-- Add missing blockchain columns to transactions table
-- These columns exist in schema.prisma but were never created in the database

-- Add blockNumber column for blockchain transaction block tracking
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "blockNumber" INTEGER;

-- Add txHash column for blockchain transaction hash (if not exists)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "txHash" VARCHAR(255);

-- Add errorMessage column for transaction failure details
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

-- Create unique index for txHash if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_txHash_key" ON "transactions"("txHash");

-- Note: confirmations column should exist from 20251227001503 migration
-- If it doesn't, uncomment the line below:
-- ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "confirmations" INTEGER NOT NULL DEFAULT 0;
