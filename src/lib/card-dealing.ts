import { getCardDealingDelay } from '@/store/settingsStore'

export class CardDealingAnimation {
  private static delays: { [key: string]: NodeJS.Timeout } = {}

  /**
   * Deal cards with animation delay based on user settings
   */
  static async dealCardsWithDelay(
    cards: any[], 
    onCardDealt?: (card: any, index: number) => void,
    delayKey: string = 'default'
  ): Promise<void> {
    // Clear any existing delays for this key
    this.clearDelays(delayKey)

    const speed = this.getCurrentSpeed()
    const delay = getCardDealingDelay(speed)

    for (let i = 0; i < cards.length; i++) {
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          if (onCardDealt) {
            onCardDealt(cards[i], i)
          }
          resolve()
        }, delay * (i + 1)) // Progressive delay for each card

        this.delays[`${delayKey}_${i}`] = timeoutId
      })
    }
  }

  /**
   * Deal a single card with delay
   */
  static async dealSingleCard(
    card: any,
    onCardDealt?: (card: any) => void,
    delayKey: string = 'default'
  ): Promise<void> {
    const speed = this.getCurrentSpeed()
    const delay = getCardDealingDelay(speed)

    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        if (onCardDealt) {
          onCardDealt(card)
        }
        resolve()
      }, delay)

      this.delays[delayKey] = timeoutId
    })
  }

  /**
   * Animate dealer's play with multiple cards
   */
  static async animateDealerPlay(
    cards: any[],
    onCardDealt?: (card: any, index: number) => void,
    delayKey: string = 'dealer'
  ): Promise<void> {
    // Clear any existing dealer delays
    this.clearDelays(delayKey)

    const speed = this.getCurrentSpeed()
    const baseDelay = getCardDealingDelay(speed)

    for (let i = 0; i < cards.length; i++) {
      await new Promise<void>((resolve) => {
        // Dealer cards are dealt slightly faster than player cards
        const dealerDelay = baseDelay * 0.8
        const timeoutId = setTimeout(() => {
          if (onCardDealt) {
            onCardDealt(cards[i], i)
          }
          resolve()
        }, dealerDelay * (i + 1))

        this.delays[`${delayKey}_${i}`] = timeoutId
      })
    }
  }

  /**
   * Get current card dealing speed from settings
   */
  private static getCurrentSpeed(): 'slow' | 'normal' | 'fast' {
    // Try to get from store (client-side)
    try {
      if (typeof window !== 'undefined') {
        // Dynamic import to avoid SSR issues
        const { useSettingsStore } = eval('require("@/store/settingsStore")')
        const settings = useSettingsStore.getState()
        return settings.cardDealingSpeed
      }
    } catch (error) {
      console.warn('Could not get card dealing speed from store, using default')
    }
    
    return 'normal' // Default speed
  }

  /**
   * Clear all pending delays for a specific key
   */
  static clearDelays(delayKey: string): void {
    Object.keys(this.delays).forEach(key => {
      if (key.startsWith(delayKey)) {
        clearTimeout(this.delays[key])
        delete this.delays[key]
      }
    })
  }

  /**
   * Clear all pending delays
   */
  static clearAllDelays(): void {
    Object.values(this.delays).forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    this.delays = {}
  }

  /**
   * Check if there are pending animations
   */
  static hasPendingAnimations(delayKey?: string): boolean {
    if (delayKey) {
      return Object.keys(this.delays).some(key => key.startsWith(delayKey))
    }
    return Object.keys(this.delays).length > 0
  }
}