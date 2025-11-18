// Game Rules Entity - Business rules and validation
export const PAYOUT_RATES = {
  BLACKJACK: 2.5, // 3:2
  REGULAR_WIN: 2, // 1:1
  PUSH: 1, // Return bet
  INSURANCE: 2, // 2:1
} as const

export const GAME_CONSTANTS = {
  MIN_BET: 25,
  MAX_BET: 10000,
  DECK_SIZE: 52,
  BLACKJACK_VALUE: 21,
  DEALER_HIT_THRESHOLD: 17,
  INSURANCE_BET_RATIO: 0.5,
} as const

export class GameRules {
  static validateBet(amount: number, balance: number): { valid: boolean; error?: string } {
    if (amount < GAME_CONSTANTS.MIN_BET) {
      return { valid: false, error: `Minimum bet is ${GAME_CONSTANTS.MIN_BET} GBC` }
    }
    if (amount > GAME_CONSTANTS.MAX_BET) {
      return { valid: false, error: `Maximum bet is ${GAME_CONSTANTS.MAX_BET} GBC` }
    }
    if (amount > balance) {
      return { valid: false, error: 'Insufficient balance' }
    }
    return { valid: true }
  }

  static canOfferInsurance(dealerHand: { cards: any[] }): boolean {
    return dealerHand.cards.length === 2 && dealerHand.cards[0]?.rank === 'A'
  }

  static calculateInsuranceBet(originalBet: number): number {
    return Math.floor(originalBet * GAME_CONSTANTS.INSURANCE_BET_RATIO)
  }

  static validateGameMove(move: any, gameState: any): { valid: boolean; error?: string } {
    switch (move.type) {
      case 'bet':
        if (gameState.gameState !== 'betting') {
          return { valid: false, error: 'Cannot bet during game' }
        }
        return this.validateBet(move.amount, gameState.balance)
      
      case 'hit':
        if (gameState.gameState !== 'playing') {
          return { valid: false, error: 'Cannot hit now' }
        }
        if (gameState.playerHand.isBust) {
          return { valid: false, error: 'Cannot hit when bust' }
        }
        return { valid: true }
      
      case 'stand':
        if (gameState.gameState !== 'playing') {
          return { valid: false, error: 'Cannot stand now' }
        }
        return { valid: true }
      
      case 'double':
        if (gameState.gameState !== 'playing') {
          return { valid: false, error: 'Cannot double now' }
        }
        if (gameState.playerHand.cards.length !== 2) {
          return { valid: false, error: 'Can only double with 2 cards' }
        }
        if (move.amount > gameState.balance) {
          return { valid: false, error: 'Insufficient balance to double' }
        }
        return { valid: true }
      
      case 'insurance':
        if (!this.canOfferInsurance(gameState.dealerHand)) {
          return { valid: false, error: 'Insurance not available' }
        }
        const insuranceAmount = this.calculateInsuranceBet(gameState.currentBet)
        if (insuranceAmount > gameState.balance) {
          return { valid: false, error: 'Insufficient balance for insurance' }
        }
        return { valid: true }
      
      default:
        return { valid: false, error: 'Invalid move type' }
    }
  }
}