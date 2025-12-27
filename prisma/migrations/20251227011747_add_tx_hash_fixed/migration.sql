-- ALTER TABLE "transactions" ADD COLUMN "txHash" VARCHAR(255);
-- Column already exists in database via previous db push

-- -- CreateIndex
-- CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");
-- Index may already exist, commenting out to avoid conflict
