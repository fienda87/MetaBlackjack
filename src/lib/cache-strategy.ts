/**
 * Cache strategy definitions for different data types
 * Defines TTL, cache keys, and invalidation patterns
 */

export type CacheStrategy = {
  key: string
  ttl: number // milliseconds
  tags: string[]
}

export const CACHE_STRATEGIES = {
  // Highly volatile - short cache
  GAME_STATE: (gameId: string): CacheStrategy => ({
    key: `game:${gameId}:state`,
    ttl: 5000, // 5 seconds
    tags: ['game', gameId]
  }),
  
  // Real-time critical - very short cache
  USER_BALANCE: (userId: string): CacheStrategy => ({
    key: `user:${userId}:balance`,
    ttl: 2000, // 2 seconds
    tags: ['user', userId, 'balance']
  }),
  
  // Semi-volatile - medium cache
  GAME_HISTORY: (userId: string, cursor?: string): CacheStrategy => ({
    key: `history:${userId}:cursor:${cursor || 'first'}`,
    ttl: 30000, // 30 seconds
    tags: ['user', userId, 'history']
  }),
  
  // Mostly static - longer cache
  USER_STATS: (userId: string): CacheStrategy => ({
    key: `stats:${userId}`,
    ttl: 60000, // 60 seconds
    tags: ['user', userId, 'stats']
  }),
  
  // Static data - very long cache
  GAME_RULES: (): CacheStrategy => ({
    key: 'game:rules',
    ttl: 86400000, // 24 hours
    tags: ['static', 'game', 'rules']
  }),
  
  // Admin data - medium cache
  ADMIN_USERS: (cursor?: string): CacheStrategy => ({
    key: `admin:users:cursor:${cursor || 'first'}`,
    ttl: 120000, // 2 minutes
    tags: ['admin', 'users']
  }),
  
  ADMIN_GAMES: (cursor?: string): CacheStrategy => ({
    key: `admin:games:cursor:${cursor || 'first'}`,
    ttl: 60000, // 1 minute
    tags: ['admin', 'games']
  }),
  
  ADMIN_TRANSACTIONS: (cursor?: string): CacheStrategy => ({
    key: `admin:transactions:cursor:${cursor || 'first'}`,
    ttl: 60000, // 1 minute
    tags: ['admin', 'transactions']
  }),
  
  // System data - long cache
  SYSTEM_CONFIG: (): CacheStrategy => ({
    key: 'system:config',
    ttl: 3600000, // 1 hour
    tags: ['system', 'config']
  }),
  
  DATABASE_STATS: (): CacheStrategy => ({
    key: 'system:db:stats',
    ttl: 300000, // 5 minutes
    tags: ['system', 'database', 'stats']
  })
}

// Cache key generation with variations
export const generateCacheKey = (
  base: string,
  params: Record<string, any>
): string => {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(':')
  return `${base}:${sorted}`
}

// Cache patterns for invalidation
export const CACHE_PATTERNS = {
  USER_GAMES: (userId: string) => `game:*:${userId}:*`,
  USER_HISTORY: (userId: string) => `history:${userId}:*`,
  USER_STATS: (userId: string) => `stats:${userId}`,
  USER_BALANCE: (userId: string) => `user:${userId}:balance`,
  GAME_STATE: (gameId: string) => `game:${gameId}:state`,
  ADMIN_DATA: (resource: string) => `admin:${resource}:*`,
  SYSTEM_DATA: (resource: string) => `system:${resource}:*`
}

// Tag-based invalidation patterns
export const CACHE_TAGS = {
  USER_DATA: (userId: string) => ['user', userId],
  USER_BALANCE: (userId: string) => ['user', userId, 'balance'],
  USER_STATS: (userId: string) => ['user', userId, 'stats'],
  USER_HISTORY: (userId: string) => ['user', userId, 'history'],
  GAME_DATA: (gameId: string) => ['game', gameId],
  ADMIN_DATA: (resource: string) => ['admin', resource],
  SYSTEM_DATA: (resource: string) => ['system', resource]
}

// Cache TTL presets for quick reference
export const CACHE_TTLS = {
  VERY_SHORT: 2000,    // 2 seconds
  SHORT: 5000,         // 5 seconds
  MEDIUM: 30000,       // 30 seconds
  LONG: 60000,         // 1 minute
  VERY_LONG: 3600000,  // 1 hour
  DAY: 86400000        // 24 hours
}

// Cache invalidation triggers
export const CACHE_INVALIDATION_TRIGGERS = {
  // User triggers
  USER_BALANCE_CHANGED: (userId: string) => CACHE_TAGS.USER_BALANCE(userId),
  USER_STATS_UPDATED: (userId: string) => CACHE_TAGS.USER_STATS(userId),
  USER_GAME_CREATED: (userId: string) => [
    ...CACHE_TAGS.USER_HISTORY(userId),
    ...CACHE_TAGS.USER_STATS(userId)
  ],
  
  // Game triggers
  GAME_STATE_CHANGED: (gameId: string, userId: string) => [
    ...CACHE_TAGS.GAME_DATA(gameId),
    ...CACHE_TAGS.USER_DATA(userId)
  ],
  
  // Admin triggers
  ADMIN_DATA_CHANGED: (resource: string) => CACHE_TAGS.ADMIN_DATA(resource),
  
  // System triggers
  SYSTEM_CONFIG_CHANGED: () => ['system', 'config']
}