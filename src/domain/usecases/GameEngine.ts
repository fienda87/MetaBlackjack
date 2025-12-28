import { Game, Hand, Card, GameResult, GameMove, GameState } from '../entities/Game'
import { IGameRepository } from '../repositories/GameRepository'
import { 
  calculateGameResult as calculateGameResultLogic,
  canOfferInsurance,
  calculateInsuranceBet
} from '@/lib/game-logic'

export class GameEngine {
  constructor(private repository: IGameRepository) {}

  // Pure game logic functions
  static createDeck(): Card[] {
    const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades']
    const ranks: Array<'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'> = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    
    const deck: Card[] = []
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          value: this.getCardValue(rank)
        })
      }
    }
    
    return this.shuffleDeck(deck)
  }

  static getCardValue(rank: string): number {
    if (rank === 'A') return 11
    if (rank === 'K' || rank === 'Q' || rank === 'J') return 10
    return parseInt(rank)
  }

  static calculateHandValue(cards: Card[], aceValue?: number): Hand {
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
    
    // If specific ace value is provided, use it
    if (aceValue !== undefined && aces > 0) {
      value = value - 11 + aceValue // Replace default ace value (11) with selected value
    }
    
    return {
      cards,
      value,
      isBust: value > 21,
      isBlackjack: cards.length === 2 && value === 21,
      aceValue: aceValue
    }
  }

  static canChooseAceValue(hand: Hand): boolean {
    // Can choose ace value if hand has an ace and is not bust
    return hand.cards.some(card => card.rank === 'A') && !hand.isBust
  }

  static getOptimalAceValue(hand: Card[]): number {
    // Calculate best ace value (1 or 11) for the hand
    let value = 0
    let aces = 0
    
    for (const card of hand) {
      if (card.rank === 'A') aces++
      value += card.value
    }
    
    // Try ace as 11 first
    if (value <= 21) return 11
    
    // Try ace as 1
    value -= 10 // Convert one ace from 11 to 1
    return value <= 21 ? 1 : 11 // Return 1 if still bust, otherwise 1
  }

  static shuffleDeck(deck: Card[]): Card[] {
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

  static calculateGameResult(
    playerHand: Hand,
    dealerHand: Hand,
    betAmount: number,
    insuranceBet: number = 0,
    dealerHasBlackjack: boolean = false
  ): GameResult {
    // Convert to compatible Hand type for game-logic lib
    const compatiblePlayerHand = {
      ...playerHand,
      isSplittable: playerHand.isSplittable ?? false,
      canSurrender: playerHand.canSurrender ?? false,
      hasSplit: playerHand.hasSplit ?? false
    }
    
    const compatibleDealerHand = {
      ...dealerHand,
      isSplittable: dealerHand.isSplittable ?? false,
      canSurrender: dealerHand.canSurrender ?? false,
      hasSplit: dealerHand.hasSplit ?? false
    }
    
    // Use the enhanced game logic with bonuses
    const gameResult = calculateGameResultLogic(
      compatiblePlayerHand,
      compatibleDealerHand,
      betAmount,
      insuranceBet,
      dealerHasBlackjack
    )
    
    // Convert to our GameResult format
    let netProfit = 0
    const resultStr = String(gameResult.result).toUpperCase()
    if (resultStr === 'LOSE') {
      netProfit = -betAmount - insuranceBet
    } else if (resultStr === 'PUSH') {
      netProfit = -insuranceBet
    } else {
      // Win, blackjack, or bonus_win
      netProfit = gameResult.winAmount - betAmount - insuranceBet
    }
    
    return {
      result: gameResult.result,
      winAmount: gameResult.winAmount,
      insuranceWin: gameResult.insuranceWin,
      netProfit,
      bonusType: gameResult.bonusType,
      bonusMultiplier: gameResult.bonusMultiplier,
      basePayout: gameResult.basePayout,
      totalPayout: gameResult.totalPayout
    }
  }

  static canOfferInsurance(dealerHand: Hand): boolean {
    const compatibleHand = {
      ...dealerHand,
      isSplittable: dealerHand.isSplittable ?? false,
      canSurrender: dealerHand.canSurrender ?? false,
      hasSplit: dealerHand.hasSplit ?? false
    }
    return canOfferInsurance(compatibleHand)
  }

  static calculateInsuranceBet(originalBet: number): number {
    return calculateInsuranceBet(originalBet)
  }

  // Game state transitions
  async processMove(gameId: string, move: GameMove): Promise<Game> {
    const game = await this.repository.getGame(gameId)
    if (!game) {
      throw new Error(`Game ${gameId} not found`)
    }

    const isValidMove = await this.repository.validateMove(gameId, move)
    if (!isValidMove) {
      throw new Error(`Invalid move: ${move.type}`)
    }

    let updatedGame: Game

    switch (move.type) {
      case 'DEAL':
        updatedGame = this.processDeal(game)
        break
      case 'HIT':
        updatedGame = this.processHit(game)
        break
      case 'STAND':
        updatedGame = this.processStand(game)
        break
      case 'DOUBLE_DOWN':
        updatedGame = this.processDoubleDown(game)
        break
      case 'INSURANCE_ACCEPT':
        updatedGame = this.processInsuranceAccept(game)
        break
      case 'INSURANCE_DECLINE':
        updatedGame = this.processInsuranceDecline(game)
        break
      case 'SURRENDER':
        updatedGame = this.processSurrender(game)
        break
      default:
        throw new Error(`Unknown move type: ${move.type}`)
    }

    return await this.repository.updateGame(gameId, updatedGame)
  }

  private processDeal(game: Game): Game {
    const deck = game.deck.length < 20 ? GameEngine.createDeck() : [...game.deck]
    
    const playerCards = [deck.pop()!, deck.pop()!]
    const dealerCards = [deck.pop()!, deck.pop()!]
    
    const playerHand = GameEngine.calculateHandValue(playerCards)
    const firstDealerCard = dealerCards[0]
    if (!firstDealerCard) throw new Error('Invalid dealer card')
    const dealerHand = GameEngine.calculateHandValue([firstDealerCard])
    
    let newState: GameState = 'PLAYING'
    const _message = 'Your turn'
    
    if (playerHand.isBlackjack) {
      newState = 'DEALER'
    }

    // Check for insurance offer
    if (GameEngine.canOfferInsurance(dealerHand)) {
      newState = 'INSURANCE'
    }

    return {
      ...game,
      deck,
      playerHand,
      dealerHand: { ...dealerHand, cards: dealerCards },
      currentBet: game.betAmount,
      state: newState
    }
  }

  private processHit(game: Game): Game {
    const deck = [...game.deck]
    const newCard = deck.pop()!
    const newCards = [...game.playerHand.cards, newCard]
    const newHand = GameEngine.calculateHandValue(newCards)

    let newState: GameState = 'PLAYING'
    if (newHand.isBust) {
      newState = 'ENDED'
    } else if (newHand.value === 21) {
      // Auto-stand on 21
      return this.processStand({ ...game, playerHand: newHand, deck })
    }

    return {
      ...game,
      deck,
      playerHand: newHand,
      state: newState
    }
  }

  private processStand(game: Game): Game {
    // Dealer plays their hand with smart AI
    const dealerHand = this.playDealerHand(game.dealerHand, game.deck, game.playerHand.value)
    
    return {
      ...game,
      dealerHand,
      state: 'ENDED'
    }
  }

  private processDoubleDown(game: Game): Game {
    const deck = [...game.deck]
    const newCard = deck.pop()!
    const newCards = [...game.playerHand.cards, newCard]
    const newHand = GameEngine.calculateHandValue(newCards)

    return {
      ...game,
      deck,
      playerHand: newHand,
      currentBet: game.currentBet * 2,
      state: newHand.isBust ? 'ENDED' : 'DEALER'
    }
  }

  private processInsuranceAccept(game: Game): Game {
    const insuranceBet = GameEngine.calculateInsuranceBet(game.betAmount)
    
    return {
      ...game,
      insuranceBet,
      state: 'PLAYING'
    }
  }

  private processInsuranceDecline(game: Game): Game {
    return {
      ...game,
      insuranceBet: 0,
      state: 'PLAYING'
    }
  }

  private processSurrender(game: Game): Game {
    return {
      ...game,
      state: 'ENDED',
      result: 'SURRENDER' as any,
      winAmount: 0,
      netProfit: -game.currentBet / 2,
      hasSurrendered: true,
      endedAt: new Date()
    }
  }

  private playDealerHand(dealerHand: Hand, deck: Card[], playerValue: number = 0): Hand {
    let currentHand = { ...dealerHand }
    let currentDeck = [...deck]
    
    // Smart dealer logic following standard casino rules with intelligence:
    // - Hit on 16 or less
    // - Stand on 17 or more normally
    // - Consider risky moves when player has strong hand
    
    while (currentHand.value < 17) {
      const card = currentDeck.pop()
      if (!card) break
      
      currentHand = GameEngine.calculateHandValue([...currentHand.cards, card])
    }
    
    // Smart decisions based on player's hand
    if (playerValue > 0 && playerValue <= 21) {
      // If dealer has less than player and player <= 21, consider risky moves
      if (currentHand.value < playerValue && currentHand.value >= 17) {
        // Consider hitting on 17 if player is much higher
        if (currentHand.value === 17 && playerValue >= 20) {
          // Risky move - 30% chance to hit on 17 against player's 20+
          if (Math.random() < 0.3) {
            const card = currentDeck.pop()
            if (card) {
              currentHand = GameEngine.calculateHandValue([...currentHand.cards, card])
            }
          }
        }
        // Consider hitting on 18 if player has 19-21
        else if (currentHand.value === 18 && playerValue >= 19) {
          // Very risky move - 15% chance to hit on 18 against player's 19+
          if (Math.random() < 0.15) {
            const card = currentDeck.pop()
            if (card) {
              currentHand = GameEngine.calculateHandValue([...currentHand.cards, card])
            }
          }
        }
      }
    }
    
    return currentHand
  }
}