# Gobog Blackjack Payout System

## ✅ Compliance with Gobog Blackjack Rules

The game payout system has been implemented according to the official Gobog Blackjack rules:

### 1. Blackjack (Natural 21) - 3:2
- **Rule**: Natural 21 with first two cards
- **Implementation**: `betAmount * 2.5` (3:2 ratio)
- **Example**: Bet 100 GBC → Win 250 GBC (150 profit + 100 original bet)

### 2. Regular Win - 1:1
- **Rule**: Beat dealer without busting
- **Implementation**: `betAmount * 2` (1:1 ratio)
- **Example**: Bet 100 GBC → Win 200 GBC (100 profit + 100 original bet)

### 3. Push (Tie) - 1:1
- **Rule**: Same value as dealer
- **Implementation**: Return original bet amount
- **Example**: Bet 100 GBC → Get back 100 GBC (no profit, no loss)

### 4. Insurance - 2:1
- **Rule**: When dealer shows Ace
- **Implementation**: `insuranceBet * 2` (2:1 ratio)
- **Example**: Insurance 50 GBC → Win 100 GBC if dealer has Blackjack

## 🎯 Game Features

### Insurance System
- **Trigger**: Dealer shows Ace as first card
- **Cost**: Half of original bet (automatically calculated)
- **Payout**: 2:1 if dealer has Blackjack
- **Dialog**: Interactive insurance acceptance/declination

### Payout Calculation Logic
```typescript
// Game result calculation includes insurance
const result = calculateGameResult(
  playerHand, 
  dealerHand, 
  betAmount, 
  insuranceBet, 
  dealerHasBlackjack
)

// Returns:
// - result: 'win' | 'lose' | 'push' | 'blackjack'
// - winAmount: Main game winnings
// - insuranceWin: Insurance winnings (if any)
```

### Balance Updates
- **Deduct**: Original bet + Insurance (if accepted)
- **Credit**: Game winnings + Insurance winnings
- **Net**: Proper profit/loss calculation

## 📊 Example Scenarios

### Scenario 1: Player Blackjack
- Bet: 100 GBC
- Player: Blackjack (A + 10)
- Dealer: 19
- **Result**: Win 250 GBC (3:2 payout)

### Scenario 2: Regular Win
- Bet: 100 GBC
- Player: 20
- Dealer: 18
- **Result**: Win 200 GBC (1:1 payout)

### Scenario 3: Insurance Win
- Bet: 100 GBC
- Insurance: 50 GBC
- Player: 19
- Dealer: Blackjack (A + 10)
- **Result**: Lose main bet (100 GBC) + Win insurance (100 GBC) = Break even

### Scenario 4: Push
- Bet: 100 GBC
- Player: 18
- Dealer: 18
- **Result**: Get back 100 GBC (no loss)

## 🎮 UI Features

### Insurance Dialog
- Clear explanation of insurance terms
- Shows insurance cost (half of bet)
- Accept/Decline options
- Balance validation

### Result Modal
- Shows game result breakdown
- Displays insurance winnings separately
- Total payout calculation
- Clear profit/loss indication

## ✅ Verification

All payout rates have been verified against Gobog Blackjack specifications:
- ✅ Blackjack: 3:2 (2.5x return)
- ✅ Regular Win: 1:1 (2x return)
- ✅ Push: 1:1 (return original bet)
- ✅ Insurance: 2:1 (when dealer shows Ace)

The system provides instant settlement in GBC (GOBOG COIN) with all winnings automatically credited to the player's account.