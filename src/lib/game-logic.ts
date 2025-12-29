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

export const getCardValue = (rank: Rank): number => {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

export const calculateHandValue = (cards: Card[], hasSplit: boolean = false): Hand => {
  let value = 0
  let aces = 0
  
  for (const card of cards) {
    if (card.rank === 'A') aces++
    value += card.value
  }
  
  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }
  
  const isSplittable = cards.length === 2 && 
                      cards[0]?.rank === cards[1]?.rank && 
                      !hasSplit
  
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

export class DealerEngine {
  static shouldHit(hand: Hand, playerValue: number): boolean {
    if (hand.value < 17) {
      if (playerValue >= 18) {
        if (hand.value <= 16) return true
      }
      
      if (hand.value > playerValue && hand.value >= 15) {
        return false
      }
      
      return true
    }
    
    if (hand.value >= 17) {
      if (hand.value === 17 && playerValue >= 20) {
        return Math.random() < 0.3
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

export const PAYOUT_MULTIPLIERS = {
  win: 2.0,
  push: 1.0,
  blackjack: 2.5,
  insurance: 2.0
} as const

export interface GameResult {
  result: 'WIN' | 'LOSE' | 'PUSH' | 'BLACKJACK' | 'SURRENDER'
  winAmount: number
  insuranceWin: number
  bonusType?: string
  bonusMultiplier?: number
  basePayout?: number
  totalPayout?: number
}

export function checkBonusCombinations(playerHand: any[], dealerCard: any): boolean {
  const card1 = playerHand?.[0] as Partial<Card> | undefined
  const card2 = playerHand?.[1] as Partial<Card> | undefined
  const dealerUpCard = dealerCard as Partial<Card> | undefined

  if (!card1?.rank || !card2?.rank || !dealerUpCard?.rank) return false

  if (card1.rank === '7' && card2.rank === '7' && dealerUpCard.rank === '7') return true

  if (card1.rank === card2.rank && card1.suit && card2.suit && card1.suit === card2.suit) return true

  if (card1.suit && card2.suit && card1.suit === card2.suit) return true

  const rankOrder: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const i1 = rankOrder.indexOf(card1.rank as Rank)
  const i2 = rankOrder.indexOf(card2.rank as Rank)
  if (i1 !== -1 && i2 !== -1 && Math.abs(i1 - i2) === 1) return true

  return false
}

export const calculateGameResult = (
  playerHand: Hand,
  dealerHand: Hand,
  betAmount: number,
  insuranceBet: number = 0,
  dealerHasBlackjack: boolean = false,
  hasSurrendered: boolean = false
): GameResult => {
  const buildResult = (
    result: GameResult['result'],
    winAmount: number,
    insuranceWin: number,
    bonus?: { type: string; multiplier: number } | null
  ): GameResult => {
    return {
      result,
      winAmount,
      insuranceWin,
      bonusType: bonus?.type,
      bonusMultiplier: bonus?.multiplier,
      basePayout: winAmount,
      totalPayout: winAmount
    }
  }

  if (hasSurrendered) {
    const winAmount = calculateSurrender(betAmount)
    return buildResult('SURRENDER', winAmount, 0, null)
  }

  let insuranceWin = 0
  if (insuranceBet > 0 && dealerHasBlackjack) {
    insuranceWin = insuranceBet * PAYOUT_MULTIPLIERS.insurance
  }

  const bonus = null

  if (playerHand.isBust) {
    return buildResult('LOSE', 0, insuranceWin, bonus)
  }

  if (dealerHand.isBust) {
    const winAmount = betAmount * PAYOUT_MULTIPLIERS.win
    return buildResult('WIN', winAmount, insuranceWin, bonus)
  }

  if (playerHand.isBlackjack && !dealerHand.isBlackjack) {
    const winAmount = betAmount * PAYOUT_MULTIPLIERS.blackjack
    return buildResult('BLACKJACK', winAmount, insuranceWin, bonus)
  }

  if (dealerHand.isBlackjack && !playerHand.isBlackjack) {
    return buildResult('LOSE', 0, insuranceWin, bonus)
  }

  if (playerHand.isBlackjack && dealerHand.isBlackjack) {
    const winAmount = betAmount * PAYOUT_MULTIPLIERS.push
    return buildResult('PUSH', winAmount, insuranceWin, bonus)
  }

  if (playerHand.value > dealerHand.value) {
    const winAmount = betAmount * PAYOUT_MULTIPLIERS.win
    return buildResult('WIN', winAmount, insuranceWin, bonus)
  }

  if (playerHand.value < dealerHand.value) {
    return buildResult('LOSE', 0, insuranceWin, bonus)
  }

  const winAmount = betAmount * PAYOUT_MULTIPLIERS.push
  return buildResult('PUSH', winAmount, insuranceWin, bonus)
}

export const canOfferInsurance = (dealerHand: Hand): boolean => {
  return dealerHand.cards.length === 2 && 
         dealerHand.cards[0]?.rank === 'A'
}

export const calculateInsuranceBet = (originalBet: number): number => {
  return Math.floor(originalBet / 2)
}

export const splitHand = (hand: Hand): { hand1: Hand; hand2: Hand } => {
  if (!hand.isSplittable) {
    throw new Error('Hand cannot be split')
  }
  
  const card1 = hand.cards[0]
  const card2 = hand.cards[1]
  
  if (!card1 || !card2) return { hand1: hand, hand2: hand }
  
  const hand1 = calculateHandValue([card1], true)
  const hand2 = calculateHandValue([card2], true)
  
  hand1.originalBet = hand.originalBet
  hand2.originalBet = hand.originalBet
  
  return { hand1, hand2 }
}

export const calculateSurrender = (betAmount: number): number => {
  return Math.floor(betAmount / 2)
}

export const shouldSurrender = (playerHand: Hand, dealerUpCard: Card): boolean => {
  if (!playerHand.canSurrender) return false
  
  const playerValue = playerHand.value
  const dealerValue = dealerUpCard.value
  
  if (playerValue === 16) {
    return dealerValue >= 9 || dealerUpCard.rank === 'A'
  }
  
  if (playerValue === 15) {
    return dealerValue === 10 || dealerUpCard.rank === 'A'
  }
  
  return false
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