# Bug Fix: Double Down Action & Payout System

## 🐛 Bugs Fixed

### 1. Double Down Balance Bug
**Problem**: 
- Saat melakukan double down, bet digandakan tapi balance user tidak dikurangi
- User bisa double down tanpa benar-benar membayar bet tambahan
- Balance calculation salah di akhir game

**Solution**:
```typescript
// Deduct additional bet immediately when doubling down
const additionalBet = game.currentBet
await db.user.update({
  where: { id: userId },
  data: { balance: user.balance - additionalBet }
})
```

**Changes Made**:
- ✅ Validate user has sufficient balance for additional bet
- ✅ Deduct additional bet from user balance immediately
- ✅ Update user object for correct final balance calculation
- ✅ Refund if card draw fails
- ✅ Auto-trigger dealer play after double down (cannot take more actions)

### 2. Payout System Incorrect
**Problem**:
- Payout system menggunakan bonus combinations yang tidak sesuai Gobog Blackjack rules
- Multiplier dan calculation tidak match dengan PAYOUT_SYSTEM.md

**Solution per PAYOUT_SYSTEM.md**:
```typescript
// Official Gobog Blackjack Payout Rules
BLACKJACK: 3:2 payout (betAmount * 2.5)
  - Bet 100 GBC → Win 250 GBC (150 profit + 100 original bet)

REGULAR WIN: 1:1 payout (betAmount * 2)
  - Bet 100 GBC → Win 200 GBC (100 profit + 100 original bet)

PUSH (TIE): 1:1 return bet (betAmount * 1)
  - Bet 100 GBC → Get back 100 GBC (no profit, no loss)

INSURANCE: 2:1 payout (insuranceBet * 2)
  - Insurance 50 GBC → Win 100 GBC if dealer has Blackjack
```

**Changes Made**:
- ✅ Removed all bonus combinations (triple7, perfectPair, flush, straight)
- ✅ Simplified `calculateGameResult()` to only use official rules
- ✅ Fixed multipliers: Blackjack 2.5x, Win 2x, Push 1x, Insurance 2x
- ✅ Updated comments to reference PAYOUT_SYSTEM.md

## ✅ Test Cases

### Test 1: Double Down with Sufficient Balance
```
Initial Balance: 1000 GBC
Bet: 100 GBC
Action: Double Down

Expected:
- Balance after bet: 900 GBC (1000 - 100 initial)
- Balance after double: 800 GBC (900 - 100 additional)
- If Win: 800 + 400 = 1200 GBC (profit 200)
- If Lose: 800 GBC (lost 200 total)
```

### Test 2: Double Down with Insufficient Balance
```
Initial Balance: 150 GBC
Bet: 100 GBC
Action: Double Down (needs additional 100 GBC)

Expected:
- Error: "Insufficient balance for double down"
- Balance unchanged: 50 GBC
```

### Test 3: Blackjack Payout (3:2)
```
Bet: 100 GBC
Player: A♠ K♥ (Blackjack)
Dealer: 19

Expected:
- Win Amount: 250 GBC (3:2 = 100 + 150 profit)
- Net Profit: 150 GBC
```

### Test 4: Regular Win Payout (1:1)
```
Bet: 100 GBC
Player: 20
Dealer: 18

Expected:
- Win Amount: 200 GBC (1:1 = 100 + 100 profit)
- Net Profit: 100 GBC
```

### Test 5: Push/Tie Payout (Return Bet)
```
Bet: 100 GBC
Player: 18
Dealer: 18

Expected:
- Win Amount: 100 GBC (return original bet)
- Net Profit: 0 GBC
```

### Test 6: Insurance Payout (2:1)
```
Bet: 100 GBC
Insurance: 50 GBC
Player: 19
Dealer: Blackjack (A♣ K♦)

Expected:
- Main Game: Lose 100 GBC
- Insurance Win: 100 GBC (2:1 = 50 * 2)
- Net: Break even (0 GBC profit/loss)
```

## 🎯 Manual Testing Steps

### Step 1: Test Double Down Logic
1. Start game with 1000 GBC balance
2. Bet 100 GBC
3. Get dealt 2 cards
4. Click "Double Down"
5. **Verify**: Balance shows 800 GBC (900 - 100 additional)
6. **Verify**: One card is drawn automatically
7. **Verify**: Dealer plays automatically (cannot take more actions)
8. **Verify**: Final balance calculation is correct

### Step 2: Test Payout Calculations
1. **Blackjack Test**:
   - Force blackjack hand (A + 10-value card)
   - Bet 100 GBC
   - **Expected**: Win 250 GBC total (150 profit)

2. **Regular Win Test**:
   - Get hand value 20
   - Dealer gets 18
   - Bet 100 GBC
   - **Expected**: Win 200 GBC total (100 profit)

3. **Push Test**:
   - Both player and dealer get 18
   - Bet 100 GBC
   - **Expected**: Get back 100 GBC (0 profit)

### Step 3: Test Edge Cases
1. **Double Down No Cards**:
   - Empty deck scenario
   - **Expected**: Error + refund additional bet

2. **Double Down Then Bust**:
   - Double down and get card that busts
   - **Expected**: Lose full doubled bet (200 GBC)

3. **Insurance Win**:
   - Dealer shows Ace
   - Take insurance (50 GBC)
   - Dealer gets blackjack
   - **Expected**: Win 100 GBC from insurance

## 📝 Files Modified

1. **src/lib/game-logic.ts**
   - Removed bonus combinations
   - Simplified `calculateGameResult()`
   - Fixed payout multipliers
   - Updated comments

2. **src/app/api/game/action/route.ts**
   - Added balance deduction for double down
   - Added validation for sufficient balance
   - Added auto dealer play after double down
   - Added refund on error

## 🚀 Performance Impact

- No performance degradation
- Simplified logic = faster calculations
- Removed unused bonus combination checks
- More predictable game flow

## ✅ Compliance

All changes comply with:
- ✅ PAYOUT_SYSTEM.md specifications
- ✅ Gobog Blackjack official rules
- ✅ Standard blackjack double down rules
- ✅ Proper balance management
- ✅ Transaction integrity
