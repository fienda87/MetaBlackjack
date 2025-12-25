-- AlterTable: Change default balance and startingBalance from 10.0 to 0.0
-- This fixes the issue where new users were getting free money on signup
-- Users should start with 0 balance and must deposit or claim from faucet

-- Update the default values for the balance and startingBalance columns
ALTER TABLE "users" ALTER COLUMN "balance" SET DEFAULT 0.0;
ALTER TABLE "users" ALTER COLUMN "startingBalance" SET DEFAULT 0.0;

-- Note: This does NOT update existing user balances, only sets the default for new users
-- Existing users retain their current balance values
