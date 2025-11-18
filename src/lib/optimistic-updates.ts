// Optimistic UI updates for instant feedback
// This makes the game feel instant even before server response

import { Game } from '@/domain/entities/Game'

export class OptimisticGameState {
  private pendingActions: Map<string, any> = new Map()
  
  // Apply optimistic update immediately for instant UI feedback
  applyOptimisticAction(
    currentGame: Game,
    action: 'hit' | 'stand' | 'double_down',
    deck?: any[]
  ): Game {
    const optimisticGame = { ...currentGame }
    
    switch (action) {
      case 'hit':
        // Simulate drawing a card
        if (deck && deck.length > 0) {
          const simulatedCard = deck[0] // Just for UI, real card comes from server
          optimisticGame.playerHand = {
            ...optimisticGame.playerHand,
            cards: [...optimisticGame.playerHand.cards, simulatedCard]
          }
        }
        break
        
      case 'stand':
        // Immediately show that we're processing
        optimisticGame.state = 'DEALER' as any
        break
        
      case 'double_down':
        // Show bet doubled
        optimisticGame.currentBet = currentGame.currentBet * 2
        break
    }
    
    return optimisticGame
  }
  
  // Rollback if server returns error
  rollback(gameId: string): void {
    this.pendingActions.delete(gameId)
  }
  
  // Confirm when server responds successfully
  confirm(gameId: string): void {
    this.pendingActions.delete(gameId)
  }
}

// Debounce helper for reducing API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Request queue to prevent duplicate simultaneous requests
class RequestQueue {
  private pending: Map<string, Promise<any>> = new Map()
  
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If request already in flight, return existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>
    }
    
    // Start new request
    const promise = fn()
      .finally(() => {
        this.pending.delete(key)
      })
    
    this.pending.set(key, promise)
    return promise
  }
}

export const requestQueue = new RequestQueue()

// Preload/prefetch helper for predictive loading
export class PredictiveLoader {
  private cache: Map<string, any> = new Map()
  
  // Preload data that user is likely to need
  async preload(urls: string[]): Promise<void> {
    const promises = urls.map(url => {
      if (this.cache.has(url)) return Promise.resolve()
      
      return fetch(url)
        .then(res => res.json())
        .then(data => this.cache.set(url, data))
        .catch(() => {}) // Silent fail for preloading
    })
    
    await Promise.all(promises)
  }
  
  get(url: string): any | null {
    return this.cache.get(url) || null
  }
  
  clear(): void {
    this.cache.clear()
  }
}

// Retry helper with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
