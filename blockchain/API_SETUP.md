# Backend Processing APIs Setup

## Overview

The backend processing APIs provide secure endpoints for blockchain event listeners to process deposits, withdrawals, and faucet claims. These APIs use internal authentication to prevent unauthorized access.

## Architecture

```
Blockchain Event → Event Listener → Internal API → Database + Socket.IO
```

### API Endpoints

1. **POST /api/deposit/process** - Process deposit events
2. **POST /api/withdrawal/process** - Process withdrawal events  
3. **POST /api/faucet/process** - Process faucet claim events

All endpoints require `x-internal-api-key` header for authentication.

## Setup Instructions

### 1. Configure Internal API Key

The internal API key has been generated. Add it to your `.env` file:

```bash
INTERNAL_API_KEY="ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615"
```

**⚠️ IMPORTANT:** Keep this key secure and never commit it to version control.

### 2. Verify API Health

Test that endpoints are accessible:

```bash
# Check deposit API
curl http://localhost:3000/api/deposit/process

# Check withdrawal API
curl http://localhost:3000/api/withdrawal/process

# Check faucet API
curl http://localhost:3000/api/faucet/process
```

All should return:
```json
{
  "service": "...",
  "status": "ready",
  "version": "1.0.0"
}
```

### 3. Test Authentication

```bash
# Without API key (should fail with 401)
curl -X POST http://localhost:3000/api/deposit/process \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x...", "amount": 100}'

# With valid API key (should process)
curl -X POST http://localhost:3000/api/deposit/process \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "amount": 100,
    "txHash": "0x1234567890123456789012345678901234567890123456789012345678901234",
    "blockNumber": 12345,
    "timestamp": 1234567890
  }'
```

## API Specifications

### Deposit Processing

**Endpoint:** `POST /api/deposit/process`

**Request Body:**
```typescript
{
  walletAddress: string;  // 42 chars (0x + 40 hex)
  amount: number;         // Positive number
  txHash: string;         // 66 chars (0x + 64 hex)
  blockNumber: number;    // Positive integer
  timestamp: number;      // Unix timestamp
  totalBalance?: number;  // Optional on-chain balance
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Deposit processed successfully",
  "data": {
    "transactionId": "uuid",
    "userId": "uuid",
    "walletAddress": "0x...",
    "amount": 100,
    "balanceBefore": 50,
    "balanceAfter": 150,
    "txHash": "0x...",
    "blockNumber": 12345
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid input)
- `401` - Unauthorized (missing/invalid API key)
- `404` - User not found (withdrawal only)
- `500` - Internal server error

**Features:**
- ✅ Duplicate prevention via transaction hash
- ✅ Atomic balance update with transaction creation
- ✅ Auto-creates user if not exists
- ✅ Increments `totalDeposited` counter

### Withdrawal Processing

**Endpoint:** `POST /api/withdrawal/process`

**Request Body:**
```typescript
{
  walletAddress: string;
  amount: number;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  nonce?: number;  // Optional withdrawal nonce
}
```

**Additional Features:**
- ✅ Balance validation (checks sufficient funds)
- ✅ Increments `totalWithdrawn` counter
- ✅ Stores negative amount in Transaction

**Error Cases:**
- User not found → 404
- Insufficient balance → 400 with shortfall details

### Faucet Processing

**Endpoint:** `POST /api/faucet/process`

**Request Body:**
```typescript
{
  walletAddress: string;
  amount: number;       // Usually 100 GBC
  txHash: string;
  blockNumber: number;
  timestamp: number;
}
```

**Features:**
- ✅ Creates `SIGNUP_BONUS` transaction type
- ✅ Auto-creates user if not exists
- ✅ Marks as signup bonus in metadata

## Database Schema

### Transaction Types

```typescript
enum TransactionType {
  DEPOSIT         // Blockchain deposit via DepositEscrow
  WITHDRAWAL      // Blockchain withdrawal via GameWithdraw
  SIGNUP_BONUS    // Faucet claim (100 GBC)
  WIN             // Game win payout
  LOSS            // Game loss deduction
}
```

### Transaction Record

```prisma
model Transaction {
  id            String   @id @default(cuid())
  userId        String
  type          String   // DEPOSIT, WITHDRAWAL, SIGNUP_BONUS
  amount        Decimal  // Positive for credits, negative for debits
  balanceBefore Decimal
  balanceAfter  Decimal
  status        String   // COMPLETED, PENDING, FAILED
  referenceId   String?  // Transaction hash for blockchain txs
  description   String?
  metadata      Json?    // blockNumber, timestamp, nonce, etc.
  createdAt     DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@index([referenceId]) // Fast lookup by tx hash
}
```

## Integration with Event Listeners

### Current Status
✅ APIs implemented  
⏳ Event listeners need update to call APIs instead of direct DB access

### Next Steps

Update `blockchain/listeners/depositListener.ts`:

```typescript
async processDeposit(event: DepositEvent): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/api/deposit/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': process.env.INTERNAL_API_KEY!,
      },
      body: JSON.stringify({
        walletAddress: event.player,
        amount: event.amount,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        timestamp: event.timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Emit Socket.IO event
    this.io?.to(result.data.userId).emit('balance:updated', {
      type: 'deposit',
      amount: result.data.amount,
      newBalance: result.data.balanceAfter,
      txHash: event.txHash,
    });

  } catch (error) {
    console.error('Failed to process deposit via API:', error);
    // Optional: Fallback to direct DB access
  }
}
```

## Security Considerations

### API Key Protection
- Store in `.env` file (never in code)
- Use different keys for dev/staging/production
- Rotate keys periodically (e.g., every 90 days)
- Add to `.gitignore` (already configured)

### IP Whitelisting (Optional)
Enable in production by uncommenting in `internal-auth.ts`:

```typescript
const ALLOWED_IPS = ['127.0.0.1', '::1']; // Localhost only
```

### Rate Limiting (Future Enhancement)
Consider adding rate limiting to prevent abuse:

```typescript
// Example using upstash/ratelimit
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, '1m'),
});
```

## Monitoring

### Logs to Watch

```bash
# Successful processing
🟢 Processing deposit: 100 GBC for 0x1234...
✅ Deposit processed: 50.00 → 150.00 GBC

🔴 Processing withdrawal: 50 GBC for 0x1234...
✅ Withdrawal processed: 150.00 → 100.00 GBC

🚰 Processing faucet claim: 100 GBC for 0x1234...
✅ Faucet claim processed: 0.00 → 100.00 GBC
```

### Error Patterns

```bash
# Duplicate transaction (safe to ignore)
⏭️  Deposit already processed: 0x1234...

# Insufficient balance (user error)
❌ Insufficient balance: has 30, needs 50

# User not found (only for withdrawals)
❌ User not found: 0x1234...
```

## Testing

### Manual Test Script

```bash
#!/bin/bash
API_KEY="ec106d0a8ff3dca203c8a8aa336fe1b5394bb36960d498d182411b4420cb4615"
BASE_URL="http://localhost:3000"

# Test deposit
curl -X POST "$BASE_URL/api/deposit/process" \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $API_KEY" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "amount": 100,
    "txHash": "0x'$(openssl rand -hex 32)'",
    "blockNumber": 12345,
    "timestamp": '$(date +%s)'
  }' | jq

# Test withdrawal
curl -X POST "$BASE_URL/api/withdrawal/process" \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: $API_KEY" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "amount": 50,
    "txHash": "0x'$(openssl rand -hex 32)'",
    "blockNumber": 12346,
    "timestamp": '$(date +%s)'
  }' | jq
```

## Troubleshooting

### "Unauthorized" Error
- Check `INTERNAL_API_KEY` is set in `.env`
- Verify header name is `x-internal-api-key` (lowercase)
- Ensure API key matches exactly (no spaces/newlines)

### "User not found" Error
- Only applies to withdrawals (deposits auto-create)
- User must deposit first before withdrawing
- Check wallet address format (0x + 40 hex chars)

### "Insufficient balance" Error
- User balance < withdrawal amount
- Check user's current balance in database
- May indicate desync between blockchain and database

### Transaction Already Processed
- Safe message, indicates duplicate prevention working
- Transaction hash already exists in database
- No action needed, original transaction succeeded

## Next Steps

1. ✅ Add `INTERNAL_API_KEY` to `.env`
2. ⏳ Update event listeners to call these APIs
3. ⏳ Test end-to-end flow with real blockchain events
4. ⏳ Add monitoring/alerting for failed API calls
5. ⏳ Implement retry logic with exponential backoff

---

**Generated:** 2024-01-XX  
**Version:** 1.0.0  
**Status:** Ready for integration
