-- CreateIndex
CREATE INDEX "transactions_userId_status_createdAt_idx" ON "transactions"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "games_playerId_state_createdAt_idx" ON "games"("playerId", "state", "createdAt");
