import { Game, Hand, Card, GameResult, GameMove, GameState } from '../entities/Game'
import { IGameRepository } from '../repositories/GameRepository'
import { 
  calculateGameResult as calculateGameResultLogic,
  checkBonusCombinations,
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

  static canSplit(playerHand: Hand): boolean {
    // Can split if first two cards have the same value
    if (playerHand.cards.length !== 2) return false
    
    const card1 = playerHand.cards[0]
    const card2 = playerHand.cards[1]
    
    if (!card1 || !card2) return false
    
    // Same rank cards can split
    if (card1.rank === card2.rank) return true
    
    // Different ranks but same value (10-point cards) can split
    const tenPointCards = ['10', 'J', 'Q', 'K']
    if (tenPointCards.includes(card1.rank) && tenPointCards.includes(card2.rank)) return true
    
    return false
  }

  static createSplitHand(playerHand: Hand): Hand[] {
    if (playerHand.cards.length !== 2) return []
    
    const card1 = playerHand.cards[0]
    const card2 = playerHand.cards[1]
    
    if (!card1 || !card2) return []
    
    const hand1 = GameEngine.calculateHandValue([card1])
    const hand2 = GameEngine.calculateHandValue([card2])
    
    return [hand1, hand2]
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
      case 'SPLIT':
        updatedGame = this.processSplit(game)
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

  private processSplit(game: Game): Game {
    if (!GameEngine.canSplit(game.playerHand)) {
      throw new Error('Cannot split this hand')
    }

    const splitHands = GameEngine.createSplitHand(game.playerHand)
    
    return {
      ...game,
      playerHand: { cards: [], value: 0, isBust: false, isBlackjack: false }, // Clear main hand
      splitHands,
      splitBet: game.betAmount, // Additional bet equal to original
      currentBet: game.betAmount * 2, // Total bet is now doubled
      state: 'PLAYING'
    }
  }

  private processSplitHit(game: Game, handIndex: number): Game {
    if (!game.splitHands || handIndex >= game.splitHands.length) {
      throw new Error('Invalid split hand index')
    }

    const deck = [...game.deck]
    const newCard = deck.pop()!
    const currentHand = game.splitHands?.[handIndex]
    if (!currentHand) throw new Error('Invalid split hand index')
    const updatedHand = GameEngine.calculateHandValue([...currentHand.cards, newCard])
    
    const updatedSplitHands = [...(game.splitHands || [])]
    updatedSplitHands[handIndex] = updatedHand

    // Check if all hands are done (bust or stand)
    const allHandsDone = updatedSplitHands.every(hand => hand.isBust || hand.value >= 21)
    
    return {
      ...game,
      deck,
      splitHands: updatedSplitHands,
      state: allHandsDone ? 'DEALER' : 'PLAYING'
    }
  }

  private processSplitStand(game: Game, handIndex: number): Game {
    if (!game.splitHands || handIndex >= game.splitHands.length) {
      throw new Error('Invalid split hand index')
    }

    // Mark this hand as standing (we'll use a property to track this)
    const updatedSplitHands = [...game.splitHands]
    
    // Check if all hands are done (bust or stand)
    const allHandsDone = updatedSplitHands.every(hand => hand.isBust || hand.value >= 21)
    
    return {
      ...game,
      splitHands: updatedSplitHands,
      state: allHandsDone ? 'DEALER' : 'PLAYING'
    }
  }

  private processSetAceValue(game: Game, aceValue: number): Game {
    if (aceValue !== 1 && aceValue !== 11) {
      throw new Error('Ace value must be 1 or 11')
    }

    // Update main hand or split hands
    if (game.splitHands && game.splitHands.length > 0) {
      // Update all split hands with ace
      const updatedSplitHands = game.splitHands.map(hand => {
        if (GameEngine.canChooseAceValue(hand)) {
          return GameEngine.calculateHandValue(hand.cards, aceValue)
        }
        return hand
      })
      
      return {
        ...game,
        splitHands: updatedSplitHands
      }
    } else {
      // Update main hand
      const updatedHand = GameEngine.calculateHandValue(game.playerHand.cards, aceValue)
      
      return {
        ...game,
        playerHand: updatedHand
      }
    }
  }
}