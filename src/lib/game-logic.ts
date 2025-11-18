// Simple card utilities - KISS principle
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export type Suit = typeof SUITS[number]
export type Rank = typeof RANKS[number]

export interface Card {
  suit: Suit
  rank: Rank
  value: number
}

export interface Hand {
  cards: Card[]
  value: number
  isBust: boolean
  isBlackjack: boolean
  isSplittable: boolean
  canSurrender: boolean
  hasSplit: boolean
  originalBet?: number
}

// Simple card value calculation - DRY principle
export const getCardValue = (rank: Rank): number => {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

// Simple hand calculation - KISS principle
export const calculateHandValue = (cards: Card[], hasSplit: boolean = false): Hand => {
  let value = 0
  let aces = 0
  
  for (const card of cards) {
    if (card.rank === 'A') aces++
    value += card.value
  }
  
  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }
  
  // Check if hand can be split (first two cards same rank)
  const isSplittable = cards.length === 2 && 
                      cards[0]?.rank === cards[1]?.rank && 
                      !hasSplit
  
  // Check if surrender is allowed (first two cards only, not after split)
  const canSurrender = cards.length === 2 && !hasSplit
  
  return {
    cards,
    value,
    isBust: value > 21,
    isBlackjack: cards.length === 2 && value === 21 && !hasSplit,
    isSplittable,
    canSurrender,
    hasSplit
  }
}

// Simple deck creation - DRY principle
export const createDeck = (): Card[] => {
  const deck: Card[] = []
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: getCardValue(rank)
      })
    }
  }
  
  return shuffleDeck(deck)
}

// Simple shuffle - KISS principle
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    if (temp && shuffled[j]) {
      shuffled[i] = shuffled[j]!
      shuffled[j] = temp
    }
  }
  return shuffled
}

// Simple dealer engine with smart decisions - KISS principle
export class DealerEngine {
  static shouldHit(hand: Hand, playerValue: number): boolean {
    // Basic rule: always hit below 17
    if (hand.value < 17) {
      // Smart decision based on player's hand
      if (playerValue >= 18) {
        // Player has strong hand, dealer needs to be more aggressive
        if (hand.value <= 16) return true
      }
      
      // Conservative approach when dealer is ahead
      if (hand.value > playerValue && hand.value >= 15) {
        return false // Stand when ahead and safe
      }
      
      return true
    }
    
    // At 17 or above, basic rule is to stand
    if (hand.value >= 17) {
      // Exception: if player has much higher hand, consider hitting on 17
      if (hand.value === 17 && playerValue >= 20) {
        // Risky move: only hit on 17 against player's 20+
        return Math.random() < 0.3 // 30% chance to take risk
      }
      
      return false
    }
    
    return false
  }
  
  static playHand(hand: Hand, deck: Card[], playerValue: number): { hand: Hand; remainingDeck: Card[] } {
    let currentHand = { ...hand }
    let currentDeck = [...deck]
    
    while (this.shouldHit(currentHand, playerValue)) {
      const card = currentDeck.pop()
      if (!card) break
      
      currentHand = calculateHandValue([...currentHand.cards, card])
    }
    
    return { hand: currentHand, remainingDeck: currentDeck }
  }
}

// Payout system according to PAYOUT_SYSTEM.md - Gobog Blackjack Rules
export const PAYOUT_MULTIPLIERS = {
  // Standard wins (OFFICIAL GOBOG BLACKJACK RULES)
  win: 2.0,        // 1:1 payout - Return bet + equal profit (100 bet → 200 total)
  push: 1.0,       // 1:1 - Return original bet only (100 bet → 100 back)
  
  // Premium hands
  blackjack: 2.5,  // 3:2 payout - Return bet + 1.5x profit (100 bet → 250 total)
  
  // Insurance (when dealer shows Ace)
  insurance: 2.0   // 2:1 payout for insurance bet (50 insurance → 100 total)
} as const

// Removed bonus combinations - Keep it simple per Gobog Blackjack rules
// Only standard payouts: Blackjack 3:2, Win 1:1, Push 1:1, Insurance 2:1

// Game result calculation per PAYOUT_SYSTEM.md - Gobog Blackjack Rules
export const calculateGameResult = (
  playerHand: Hand,
  dealerHand: Hand,
  betAmount: number,
  insuranceBet: number = 0,
  dealerHasBlackjack: boolean = false,
  hasSurrendered: boolean = false
): {
  result: 'WIN' | 'LOSE' | 'PUSH' | 'BLACKJACK' | 'SURRENDER'
  winAmount: number
  insuranceWin: number
} => {
  // Handle surrender first (return half of bet)
  if (hasSurrendered) {
    return { 
      result: 'SURRENDER', 
      winAmount: calculateSurrender(betAmount), 
      insuranceWin: 0 
    }
  }
  
  // Handle insurance (2:1 payout if dealer has blackjack)
  let insuranceWin = 0
  if (insuranceBet > 0 && dealerHasBlackjack) {
    insuranceWin = insuranceBet * PAYOUT_MULTIPLIERS.insurance // 2:1 = 2x insurance bet
  }
  
  // Player bust - lose bet
  if (playerHand.isBust) {
    return { result: 'LOSE', winAmount: 0, insuranceWin }
  }
  
  // Dealer bust - player wins (1:1 payout)
  if (dealerHand.isBust) {
    return { 
      result: 'WIN', 
      winAmount: betAmount * PAYOUT_MULTIPLIERS.win, // 1:1 = bet + profit (2x total)
      insuranceWin
    }
  }
  
  // Blackjack - Natural 21 with first two cards (3:2 payout)
  if (playerHand.isBlackjack && !dealerHand.isBlackjack) {
    return { 
      result: 'BLACKJACK', 
      winAmount: betAmount * PAYOUT_MULTIPLIERS.blackjack, // 3:2 = bet + 1.5x profit (2.5x total)
      insuranceWin
    }
  }
  
  // Dealer blackjack vs player non-blackjack - player loses
  if (dealerHand.isBlackjack && !playerHand.isBlackjack) {
    return { result: 'LOSE', winAmount: 0, insuranceWin }
  }
  
  // Both blackjack - push (return original bet)
  if (playerHand.isBlackjack && dealerHand.isBlackjack) {
    return { 
      result: 'PUSH', 
      winAmount: betAmount * PAYOUT_MULTIPLIERS.push, // 1:1 = return bet only (1x total)
      insuranceWin 
    }
  }
  
  // Compare hand values
  if (playerHand.value > dealerHand.value) {
    // Player wins (1:1 payout)
    return { 
      result: 'WIN', 
      winAmount: betAmount * PAYOUT_MULTIPLIERS.win, // 1:1 = bet + profit (2x total)
      insuranceWin
    }
  }
  
  if (playerHand.value < dealerHand.value) {
    // Dealer wins - player loses
    return { result: 'LOSE', winAmount: 0, insuranceWin }
  }
  
  // Push - tie (return original bet)
  return { 
    result: 'PUSH', 
    winAmount: betAmount * PAYOUT_MULTIPLIERS.push, // 1:1 = return bet only (1x total)
    insuranceWin 
  }
}

// Check if dealer shows Ace (for insurance)
export const canOfferInsurance = (dealerHand: Hand): boolean => {
  return dealerHand.cards.length === 2 && 
         dealerHand.cards[0]?.rank === 'A'
}

// Calculate insurance bet (typically half of original bet)
export const calculateInsuranceBet = (originalBet: number): number => {
  return Math.floor(originalBet / 2)
}

// Split hand into two separate hands
export const splitHand = (hand: Hand): { hand1: Hand; hand2: Hand } => {
  if (!hand.isSplittable) {
    throw new Error('Hand cannot be split')
  }
  
  const card1 = hand.cards[0]
  const card2 = hand.cards[1]
  
  if (!card1 || !card2) return { hand1: hand, hand2: hand }
  
  const hand1 = calculateHandValue([card1], true)
  const hand2 = calculateHandValue([card2], true)
  
  // Set original bet for both hands
  hand1.originalBet = hand.originalBet
  hand2.originalBet = hand.originalBet
  
  return { hand1, hand2 }
}

// Calculate surrender payout (return half of bet)
export const calculateSurrender = (betAmount: number): number => {
  return Math.floor(betAmount / 2)
}

// Check if surrender is advantageous
export const shouldSurrender = (playerHand: Hand, dealerUpCard: Card): boolean => {
  if (!playerHand.canSurrender) return false
  
  const playerValue = playerHand.value
  const dealerValue = dealerUpCard.value
  
  // Basic strategy for surrender:
  // Surrender 16 vs 9, 10, A
  // Surrender 15 vs 10, A
  
  if (playerValue === 16) {
    return dealerValue >= 9 || dealerUpCard.rank === 'A'
  }
  
  if (playerValue === 15) {
    return dealerValue === 10 || dealerUpCard.rank === 'A'
  }
  
  return false
}