-- Add missing blockchain fields to transactions table
-- These fields exist in schema.prisma but were never migrated to the database

-- AlterTable: Add blockNumber column
ALTER TABLE "transactions" ADD COLUMN "blockNumber" INTEGER;

-- AlterTable: Add errorMessage column for transaction error tracking
ALTER TABLE "transactions" ADD COLUMN "errorMessage" TEXT;

-- AlterTable: Add txHash column (if not exists from the commented migration)
ALTER TABLE "transactions" ADD COLUMN "txHash" VARCHAR(255);

-- CreateIndex: Add unique constraint for txHash
CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");

-- Note: confirmations column should already exist from 20251227001503 migration
-- If it doesn't exist, uncomment the line below:
-- ALTER TABLE "transactions" ADD COLUMN "confirmations" INTEGER NOT NULL DEFAULT 0;
