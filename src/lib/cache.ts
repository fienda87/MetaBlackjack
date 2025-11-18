// In-memory cache for frequently accessed data
// This reduces database queries significantly

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000)
  }

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

// Global cache instance
export const cache = new MemoryCache()

// Cache key generators
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  game: (gameId: string) => `game:${gameId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  userBalance: (userId: string) => `balance:${userId}`,
}

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  user: 30000, // 30 seconds
  game: 10000, // 10 seconds - short TTL for active games
  session: 60000, // 1 minute
  balance: 5000, // 5 seconds - frequent updates
}

// Helper function to get or set cache
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000
): Promise<T> {
  // Try to get from cache
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()
  cache.set(key, data, ttl)
  return data
}

// Invalidate cache helpers
export const invalidateCache = {
  user: (userId: string) => cache.delete(CacheKeys.user(userId)),
  game: (gameId: string) => cache.delete(CacheKeys.game(gameId)),
  session: (sessionId: string) => cache.delete(CacheKeys.session(sessionId)),
  userBalance: (userId: string) => cache.delete(CacheKeys.userBalance(userId)),
}
