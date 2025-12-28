export interface Game {
  id: string
  playerId: string
  state: GameState
  playerHand: Hand
  dealerHand: Hand
  betAmount: number
  insuranceBet: number
  currentBet: number
  deck: Card[]
  gameStats: GameStats
  result?: GameResult
  winAmount?: number
  insuranceWin?: number
  netProfit?: number
  hasSplit?: boolean // Kept for backward compatibility with existing database records
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
  isSplittable?: boolean // Kept for backward compatibility
  canSurrender?: boolean
  hasSplit?: boolean // Kept for backward compatibility with existing database records
  originalBet?: number // Kept for backward compatibility with existing database records
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

export type GameState = 'BETTING' | 'PLAYING' | 'DEALER' | 'ENDED' | 'INSURANCE' | 'SURRENDERED'

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface GameResult {
  result: 'WIN' | 'LOSE' | 'PUSH' | 'BLACKJACK' | 'BONUS_WIN' | 'SURRENDER'
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
  type: 'HIT' | 'STAND' | 'DOUBLE_DOWN' | 'DEAL' | 'INSURANCE_ACCEPT' | 'INSURANCE_DECLINE' | 'SURRENDER'
  payload?: any
}