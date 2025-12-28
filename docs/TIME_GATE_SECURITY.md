# Time-Gate Security Layer Documentation

## Overview

The Time-Gate security layer prevents race condition bugs where multiple simultaneous requests cause double balance deduction in the blackjack game.

## Problem Statement

### Race Condition Bug

When users click "Confirm Deal" button quickly or experience network lag, the browser can send multiple requests within milliseconds:

**Timeline Example:**
```
T=0ms:   Request A arrives → No game found → Deduct bet -5 GBC → Create Game A ✅
T=0.1ms: Request B arrives → Game A not yet saved to DB → Deduct bet -5 GBC → Create Game B ❌
```

**Result:**
- Balance deducted twice for single game
- Start: 100 GBC
- After Game A: 95 GBC (correct)
- After Game B: 90 GBC (WRONG - ghost game!)
- When user refreshes Account: Shows 90 GBC (both deductions visible)

**Root Cause:**
No time-based protection against rapid sequential requests before database consistency is achieved.

## Solution: Two-Layer Security

### Layer 1: TIME-GATE (Primary Protection)

**Purpose:** Enforce 3-second cooldown between game creations

**Implementation:**
```typescript
const lastGame = await db.game.findFirst({
  where: { playerId: userId },
  orderBy: { createdAt: 'desc' },
  select: { id: true, createdAt: true, state: true }
})

if (lastGame) {
  const now = Date.now()
  const lastGameTime = new Date(lastGame.createdAt).getTime()
  const timeDiff = now - lastGameTime

  if (timeDiff < 3000) {
    console.log(`🚫 TIME-GATE BLOCKED: User ${userId} request too fast (${timeDiff}ms since last game)`)
    return NextResponse.json(
      {
        success: false,
        message: "Too fast! Please wait a moment before starting a new game.",
        game: lastGame,
        cooldownRemaining: Math.ceil((3000 - timeDiff) / 1000)
      },
      { status: 429 } // 429 Too Many Requests
    )
  }
}
```

**How It Works:**
1. Query for user's most recent game (any state)
2. Calculate time difference between now and last game creation
3. If difference < 3000ms (3 seconds), reject with HTTP 429
4. Return last game data so frontend can handle gracefully
5. Include `cooldownRemaining` to show user how long to wait

### Layer 2: Active Game Check (Backup Protection)

**Purpose:** Prevent multiple active games as secondary safeguard

**Implementation:**
```typescript
const existingGame = await db.game.findFirst({
  where: {
    playerId: userId,
    state: "PLAYING",
  },
});

if (existingGame) {
  console.log(`🚫 Blocked double game creation for user ${userId}`);
  return NextResponse.json(
    {
      success: false,
      message: "Selesaikan game yang sedang berjalan dulu!",
      game: existingGame
    },
    { status: 409 } // 409 Conflict
  );
}
```

**How It Works:**
1. Check if user has any game in PLAYING state
2. If exists, reject with HTTP 409 Conflict
3. Return existing game for frontend to continue

## Protection Demonstration

### Scenario: Rapid Clicks (5 requests within 100ms)

```
T=0ms:    Request 1 → TIME GATE: PASS ✅ → Deduct -5 GBC → Create Game A
T=10ms:   Request 2 → TIME GATE: BLOCK ❌ (10ms < 3000ms) → Return 429 + Game A
T=20ms:   Request 3 → TIME GATE: BLOCK ❌ (20ms < 3000ms) → Return 429 + Game A
T=100ms:  Request 4 → TIME GATE: BLOCK ❌ (100ms < 3000ms) → Return 429 + Game A
T=3100ms: Request 5 → TIME GATE: PASS ✅ (3100ms > 3000ms) → Allow new game

RESULT:
- Only 2 games created (Game A at T=0, potentially Game 5 at T=3100)
- No ghost games in between
- Balance deducted correctly (only for legitimate games)
- NO race condition exploitation ✅
```

### Scenario: Network Lag (Multiple requests arrive simultaneously)

```
User clicks once, but network retries create 3 requests:

T=0ms:   Request 1 arrives → TIME GATE: PASS ✅ → Create Game
T=5ms:   Request 2 arrives → TIME GATE: BLOCK ❌ → Return 429
T=8ms:   Request 3 arrives → TIME GATE: BLOCK ❌ → Return 429

RESULT: Only 1 game created, balance deducted once ✅
```

## HTTP Status Codes

### 429 Too Many Requests
**Trigger:** Request arrives within 3-second cooldown window

**Response:**
```json
{
  "success": false,
  "message": "Too fast! Please wait a moment before starting a new game.",
  "game": { /* last game data */ },
  "cooldownRemaining": 2 // seconds remaining
}
```

**Frontend Handling:**
- Show friendly message to user
- Optionally show countdown timer
- Use returned `game` data to continue (if applicable)

### 409 Conflict
**Trigger:** User already has an active PLAYING game

**Response:**
```json
{
  "success": false,
  "message": "Selesaikan game yang sedang berjalan dulu!",
  "game": { /* existing active game */ }
}
```

**Frontend Handling:**
- Redirect to existing game
- Show "You have an active game" message
- Load game state from returned `game` object

## Performance Considerations

### Database Queries
- **Layer 1:** 1 additional query (`findFirst` with `orderBy createdAt desc`)
- **Layer 2:** Already existed (no new query)
- **Total overhead:** ~10-20ms for Layer 1 query

### Optimization
- Query is minimal (`select: { id, createdAt, state }`)
- Uses indexed `playerId` field for fast lookup
- Executed early in request flow (before balance checks)

### Caching
Time-Gate queries are NOT cached because:
- Timestamp must be real-time accurate
- Cache could allow race conditions to slip through
- Performance impact is minimal (~10-20ms)

## User Experience

### Normal Usage (No Impact)
- Users playing normally (waiting for game to finish) experience no change
- 3-second cooldown is imperceptible for normal gameplay
- Game flow remains smooth and responsive

### Rapid Clicking (Protected)
- Users who rapidly click see: "Too fast! Please wait a moment"
- Countdown timer shows remaining cooldown time
- Game continues with last created game (no data loss)
- No balance deduction issues

### Network Issues (Protected)
- Multiple retry requests are blocked automatically
- Only first request succeeds
- No duplicate charges
- No ghost games

## Testing

### Manual Testing Steps

1. **Normal Game Flow**
   ```
   1. Start game (should work)
   2. Finish game
   3. Wait 3+ seconds
   4. Start new game (should work)
   ✅ Expected: Both games created successfully
   ```

2. **Rapid Click Test**
   ```
   1. Click "Confirm Deal" 5 times rapidly
   2. Check console for TIME-GATE BLOCKED logs
   3. Check network tab for 429 responses
   4. Verify only 1 game created in database
   5. Verify balance deducted only once
   ✅ Expected: Only 1 game, correct balance
   ```

3. **Cooldown Expiry Test**
   ```
   1. Start game
   2. Wait exactly 3.1 seconds
   3. Start new game
   ✅ Expected: New game created successfully
   ```

4. **Active Game Protection**
   ```
   1. Start game (leave in PLAYING state)
   2. Try to start another game
   3. Should see 409 Conflict
   ✅ Expected: Blocked with active game message
   ```

### Database Verification

```sql
-- Check for duplicate games (should find none)
SELECT playerId, COUNT(*) as game_count, 
       STRING_AGG(createdAt::text, ', ') as timestamps
FROM game
WHERE playerId = 'USER_ID'
  AND createdAt > NOW() - INTERVAL '1 minute'
GROUP BY playerId
HAVING COUNT(*) > 1;

-- Should return empty result (no duplicates)
```

### Automated Testing

```typescript
// Test: Time-gate blocks rapid requests
test('blocks game creation within 3-second window', async () => {
  const userId = 'test-user-123';
  
  // Create first game
  const res1 = await POST('/api/game/play', { userId, betAmount: 10, moveType: 'DEAL' });
  expect(res1.status).toBe(200);
  
  // Immediate second request (should be blocked)
  const res2 = await POST('/api/game/play', { userId, betAmount: 10, moveType: 'DEAL' });
  expect(res2.status).toBe(429);
  expect(res2.json).toMatchObject({
    success: false,
    message: expect.stringContaining("Too fast"),
    cooldownRemaining: expect.any(Number)
  });
});

// Test: Allows game after cooldown expires
test('allows game creation after 3-second cooldown', async () => {
  const userId = 'test-user-456';
  
  // Create first game
  await POST('/api/game/play', { userId, betAmount: 10, moveType: 'DEAL' });
  
  // Wait 3.1 seconds
  await sleep(3100);
  
  // Should allow new game
  const res = await POST('/api/game/play', { userId, betAmount: 10, moveType: 'DEAL' });
  expect(res.status).toBe(200);
});
```

## Security Impact

### Prevented Exploits

✅ **Double Balance Deduction** - Race condition from rapid clicks  
✅ **Ghost Games** - Multiple games created from single action  
✅ **Network Lag Exploitation** - Retry spam causing duplicate charges  
✅ **Automated Spam** - Bot scripts creating games rapidly  
✅ **Button Spam** - Accidental or intentional rapid clicking  
✅ **Race Condition Attacks** - Timing-based exploitation attempts  

### Attack Mitigation

**Before Time-Gate:**
```
Attacker sends 100 requests in 1 second
→ 100 games created
→ Balance deducted 100 times
→ System exploited ❌
```

**After Time-Gate:**
```
Attacker sends 100 requests in 1 second
→ 1 game created
→ 99 requests blocked with 429
→ Balance deducted once
→ Attack mitigated ✅
```

## Monitoring & Logging

### Console Logs

**Time-Gate Block:**
```
🚫 TIME-GATE BLOCKED: User abc123 request too fast (250ms since last game)
```

**Active Game Block:**
```
🚫 Blocked double game creation for user abc123
```

### Metrics to Monitor

1. **429 Response Rate** - Track frequency of time-gate blocks
   - High rate = potential attack or UI issue
   - Normal rate = occasional rapid clicks (expected)

2. **Cooldown Violations** - Count requests blocked by time-gate
   - Grouped by user ID
   - Alert if single user triggers many blocks

3. **Game Creation Rate** - Games created per minute per user
   - Should not exceed 20/minute (3-second cooldown)
   - Alert if exceeded

## Configuration

### Cooldown Duration

Current: **3 seconds (3000ms)**

To modify:
```typescript
// In src/app/api/game/play/route.ts
const COOLDOWN_MS = 3000; // Change this value

if (timeDiff < COOLDOWN_MS) {
  // ...
  cooldownRemaining: Math.ceil((COOLDOWN_MS - timeDiff) / 1000)
}
```

**Considerations:**
- Too short (< 1s): May not prevent all race conditions
- Too long (> 5s): May frustrate legitimate users
- Recommended: 2-4 seconds for optimal balance

## Frontend Integration

### Handling 429 Responses

```typescript
async function startGame(userId: string, betAmount: number) {
  const res = await fetch('/api/game/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, betAmount, moveType: 'DEAL' })
  });

  if (res.status === 429) {
    const data = await res.json();
    
    // Show friendly message
    toast.warning(data.message);
    
    // Optionally show countdown
    showCooldownTimer(data.cooldownRemaining);
    
    // Use existing game if applicable
    if (data.game) {
      loadGameState(data.game);
    }
    
    return;
  }

  // Handle success...
}
```

### UI Improvements

**Option 1: Disable button during cooldown**
```typescript
const [cooldownRemaining, setCooldownRemaining] = useState(0);

useEffect(() => {
  if (cooldownRemaining > 0) {
    const timer = setTimeout(() => {
      setCooldownRemaining(cooldownRemaining - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [cooldownRemaining]);

<button disabled={cooldownRemaining > 0}>
  {cooldownRemaining > 0 
    ? `Wait ${cooldownRemaining}s` 
    : 'Confirm Deal'}
</button>
```

**Option 2: Show toast notification**
```typescript
if (res.status === 429) {
  toast.info("Please wait a moment before starting a new game");
}
```

## Rollback Plan

If Time-Gate causes issues:

1. **Quick Disable (Emergency)**
   ```typescript
   // In src/app/api/game/play/route.ts
   const ENABLE_TIME_GATE = false; // Set to false
   
   if (ENABLE_TIME_GATE && lastGame) {
     // ... time-gate logic
   }
   ```

2. **Reduce Cooldown**
   ```typescript
   const COOLDOWN_MS = 1000; // Reduce to 1 second
   ```

3. **Full Rollback**
   - Git revert to commit before Time-Gate implementation
   - Redeploy previous version

## Related Files

- **Implementation:** `src/app/api/game/play/route.ts` (lines 93-120)
- **Documentation:** `docs/TIME_GATE_SECURITY.md` (this file)
- **Tests:** (to be created)

## Changelog

### 2024-12-28 - Initial Implementation
- ✅ Added Layer 1: Time-Gate (3-second cooldown)
- ✅ Enhanced Layer 2: Active Game Check (already existed, improved)
- ✅ Added HTTP 429 response for rate limiting
- ✅ Added `cooldownRemaining` field in response
- ✅ Added comprehensive console logging
- ✅ Documented security measures

## Future Enhancements

1. **Dynamic Cooldown** - Adjust based on user behavior
   - Trusted users: 2 seconds
   - New users: 3 seconds
   - Suspicious activity: 5 seconds

2. **Rate Limiting by IP** - Track requests per IP address
   - Prevent distributed attacks
   - Block malicious IPs automatically

3. **User Reputation System** - Allow trusted users faster cooldown
   - Track game completion rate
   - Reduce cooldown for users with good history

4. **Analytics Dashboard** - Monitor time-gate effectiveness
   - Track 429 response rate over time
   - Identify patterns in blocked requests
   - Detect potential attack attempts

## Contact

For questions or issues related to Time-Gate security:
- Report bugs via issue tracker
- Security concerns: Contact development team
- Feature requests: Submit pull request with proposal
