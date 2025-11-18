export interface Game {
  id: string
  playerId: string
  state: GameState
  playerHand: Hand
  splitHands?: Hand[] // For split functionality
  dealerHand: Hand
  betAmount: number
  insuranceBet: number
  currentBet: number
  splitBet?: number // Additional bet for split
  deck: Card[]
  gameStats: GameStats
  result?: GameResult
  winAmount?: number
  insuranceWin?: number
  netProfit?: number
  hasSplit?: boolean
  hasSurrendered?: boolean
  hasInsurance?: boolean
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
}

export interface Hand {
  cards: Card[]
  value: number
  isBust: boolean
  isBlackjack: boolean
  aceValue?: number // Track current ace value selection (1 or 11)
  isSplittable?: boolean
  canSurrender?: boolean
  hasSplit?: boolean
  originalBet?: number
}

export interface Card {
  suit: Suit
  rank: Rank
  value: number
}

export interface GameStats {
  wins: number
  losses: number
  pushes: number
  blackjacks: number
}

export type GameState = 'BETTING' | 'PLAYING' | 'DEALER' | 'ENDED' | 'INSURANCE' | 'SPLIT_PLAYING' | 'SURRENDERED'

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface GameResult {
  result: 'WIN' | 'LOSE' | 'PUSH' | 'BLACKJACK' | 'BONUS_WIN' | 'SURRENDER' | 'SPLIT_WIN' | 'SPLIT_LOSE' | 'SPLIT_PUSH'
  winAmount: number
  insuranceWin?: number
  netProfit: number
  bonusType?: string
  bonusMultiplier?: number
  basePayout?: number
  totalPayout?: number
  timestamp?: string
}

export interface GameMove {
  type: 'HIT' | 'STAND' | 'DOUBLE_DOWN' | 'DEAL' | 'INSURANCE_ACCEPT' | 'INSURANCE_DECLINE' | 'SPLIT' | 'SURRENDER'
  payload?: any
}