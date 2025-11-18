import { GameEngine } from '../usecases/GameEngine'
import { GameRules } from '../entities/GameRules'

describe('GameEngine', () => {
  describe('createDeck', () => {
    it('should create a deck with 52 cards', () => {
      const deck = GameEngine.createDeck()
      expect(deck).toHaveLength(52)
    })

    it('should have all suits and ranks', () => {
      const deck = GameEngine.createDeck()
      const suits = [...new Set(deck.map(card => card.suit))]
      const ranks = [...new Set(deck.map(card => card.rank))]
      
      expect(suits).toHaveLength(4)
      expect(ranks).toHaveLength(13)
    })
  })

  describe('calculateHandValue', () => {
    it('should calculate simple hand values correctly', () => {
      const hand = [
        { suit: 'hearts', rank: '7', value: 7 },
        { suit: 'spades', rank: 'K', value: 10 }
      ]
      const result = GameEngine.calculateHandValue(hand)
      
      expect(result.value).toBe(17)
      expect(result.isBust).toBe(false)
      expect(result.isBlackjack).toBe(false)
    })

    it('should handle blackjack correctly', () => {
      const hand = [
        { suit: 'hearts', rank: 'A', value: 11 },
        { suit: 'spades', rank: 'K', value: 10 }
      ]
      const result = GameEngine.calculateHandValue(hand)
      
      expect(result.value).toBe(21)
      expect(result.isBust).toBe(false)
      expect(result.isBlackjack).toBe(true)
    })

    it('should handle soft ace correctly', () => {
      const hand = [
        { suit: 'hearts', rank: 'A', value: 11 },
        { suit: 'spades', rank: '5', value: 5 },
        { suit: 'clubs', rank: 'K', value: 10 }
      ]
      const result = GameEngine.calculateHandValue(hand)
      
      expect(result.value).toBe(16) // Ace should count as 1, not 11
      expect(result.isBust).toBe(false)
    })

    it('should detect bust correctly', () => {
      const hand = [
        { suit: 'hearts', rank: 'K', value: 10 },
        { suit: 'spades', rank: 'Q', value: 10 },
        { suit: 'clubs', rank: '5', value: 5 }
      ]
      const result = GameEngine.calculateHandValue(hand)
      
      expect(result.value).toBe(25)
      expect(result.isBust).toBe(true)
    })
  })

  describe('calculateGameResult', () => {
    it('should handle regular win correctly', () => {
      const playerHand = { cards: [], value: 20, isBust: false, isBlackjack: false }
      const dealerHand = { cards: [], value: 18, isBust: false, isBlackjack: false }
      const betAmount = 100
      
      const result = GameEngine.calculateGameResult(playerHand, dealerHand, betAmount)
      
      expect(result.result).toBe('win')
      expect(result.winAmount).toBe(200) // 2x bet
      expect(result.netProfit).toBe(100) // 1x profit
    })

    it('should handle blackjack correctly', () => {
      const playerHand = { cards: [], value: 21, isBust: false, isBlackjack: true }
      const dealerHand = { cards: [], value: 19, isBust: false, isBlackjack: false }
      const betAmount = 100
      
      const result = GameEngine.calculateGameResult(playerHand, dealerHand, betAmount)
      
      expect(result.result).toBe('blackjack')
      expect(result.winAmount).toBe(250) // 2.5x bet (3:2)
      expect(result.netProfit).toBe(150) // 1.5x profit
    })

    it('should handle push correctly', () => {
      const playerHand = { cards: [], value: 18, isBust: false, isBlackjack: false }
      const dealerHand = { cards: [], value: 18, isBust: false, isBlackjack: false }
      const betAmount = 100
      
      const result = GameEngine.calculateGameResult(playerHand, dealerHand, betAmount)
      
      expect(result.result).toBe('push')
      expect(result.winAmount).toBe(100) // Return bet
      expect(Math.abs(result.netProfit)).toBe(0) // No profit/loss (handle -0)
    })

    it('should handle insurance correctly', () => {
      const playerHand = { cards: [], value: 19, isBust: false, isBlackjack: false }
      const dealerHand = { cards: [], value: 21, isBust: false, isBlackjack: true }
      const betAmount = 100
      const insuranceBet = 50
      
      const result = GameEngine.calculateGameResult(playerHand, dealerHand, betAmount, insuranceBet, true)
      
      expect(result.result).toBe('lose')
      expect(result.insuranceWin).toBe(100) // 2x insurance bet
      expect(result.netProfit).toBe(-150) // -100 bet loss - 50 insurance cost + 100 insurance win
    })
  })

  describe('dealerPlay', () => {
    it('should dealer hit on 16', () => {
      const hand = { cards: [], value: 16, isBust: false, isBlackjack: false }
      const deck = GameEngine.createDeck().slice(0, 10)
      
      const result = GameEngine.dealerPlay(hand, deck, 18)
      
      expect(result.hand.value).toBeGreaterThan(16)
    })

    it('should dealer stand on 17', () => {
      const hand = { cards: [], value: 17, isBust: false, isBlackjack: false }
      const deck = GameEngine.createDeck().slice(0, 10)
      
      const result = GameEngine.dealerPlay(hand, deck, 18)
      
      expect(result.hand.value).toBe(17)
    })
  })
})

describe('GameRules', () => {
  describe('validateBet', () => {
    it('should accept valid bet', () => {
      const result = GameRules.validateBet(100, 1000)
      expect(result.valid).toBe(true)
    })

    it('should reject bet below minimum', () => {
      const result = GameRules.validateBet(10, 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Minimum bet')
    })

    it('should reject bet above balance', () => {
      const result = GameRules.validateBet(2000, 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Insufficient balance')
    })
  })

  describe('canOfferInsurance', () => {
    it('should offer insurance when dealer shows Ace', () => {
      const dealerHand = {
        cards: [
          { suit: 'hearts', rank: 'A', value: 11 },
          { suit: 'spades', rank: '5', value: 5 }
        ]
      }
      
      expect(GameRules.canOfferInsurance(dealerHand)).toBe(true)
    })

    it('should not offer insurance when dealer does not show Ace', () => {
      const dealerHand = {
        cards: [
          { suit: 'hearts', rank: 'K', value: 10 },
          { suit: 'spades', rank: '5', value: 5 }
        ]
      }
      
      expect(GameRules.canOfferInsurance(dealerHand)).toBe(false)
    })
  })

  describe('calculateInsuranceBet', () => {
    it('should calculate insurance as half of original bet', () => {
      const insurance = GameRules.calculateInsuranceBet(100)
      expect(insurance).toBe(50)
    })

    it('should handle odd bet amounts', () => {
      const insurance = GameRules.calculateInsuranceBet(99)
      expect(insurance).toBe(49) // Floor division
    })
  })
})