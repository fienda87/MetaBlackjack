-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "txHash" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");
