/**
 * Redis Client Configuration
 * Provides centralized Redis connection for caching and session management
 */

import Redis from 'ioredis'
import { logger } from '@/lib/logger'

// Redis configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately
  retryStrategy: (times: number) => {
    // Stop retrying after 1 attempt (fail fast for optional Redis)
    if (times > 1) {
      return null // Give up immediately
    }
    return null // Don't retry at all
  },
  connectTimeout: 2000, // 2 second timeout
  enableOfflineQueue: false // Don't queue commands when disconnected
}

// Create Redis client
let redisClient: Redis | null = null
let isRedisAvailable = false

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<Redis | null> {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient
  }

  try {
    logger.info('[Redis] Attempting to connect...')
    
    redisClient = new Redis(REDIS_CONFIG)

    // Connection events
    redisClient.on('connect', () => {
      logger.info('[Redis] Connected successfully')
      isRedisAvailable = true
    })

    redisClient.on('ready', () => {
      logger.info('[Redis] Ready to accept commands')
    })

    redisClient.on('error', (err) => {
      // Suppress connection errors (Redis is optional)
      if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
        // Silent fail - Redis not available
      } else {
        logger.warn('[Redis] Error', err.message)
      }
      isRedisAvailable = false
    })

    redisClient.on('close', () => {
      isRedisAvailable = false
    })

    // Try to connect with timeout
    const connectPromise = redisClient.connect()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 3000)
    )
    
    await Promise.race([connectPromise, timeoutPromise])
    
    // Test connection
    await redisClient.ping()
    
    return redisClient
  } catch {
    // Silent fail - Redis is optional
    isRedisAvailable = false
    
    // Clean up failed connection
    if (redisClient) {
      try {
        redisClient.disconnect()
      } catch {
        // Ignore disconnect errors
      }
      redisClient = null
    }
    
    return null
  }
}

/**
 * Get Redis client (fallback to null if not available)
 */
export function getRedisClient(): Redis | null {
  return redisClient
}

/**
 * Check if Redis is available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null && redisClient.status === 'ready'
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isRedisAvailable = false
    logger.info('[Redis] Connection closed')
  }
}

/**
 * Cache key prefixes for organized storage
 */
export const CACHE_KEYS = {
  USER: 'user:',
  GAME: 'game:',
  SESSION: 'session:',
  HISTORY: 'history:',
  STATS: 'stats:',
  RATE_LIMIT: 'ratelimit:',
  BALANCE: 'balance:'
} as const

/**
 * Default TTL values (in seconds)
 */
export const CACHE_TTL = {
  USER: 300, // 5 minutes
  GAME: 60, // 1 minute (active games)
  SESSION: 3600, // 1 hour
  HISTORY: 120, // 2 minutes
  STATS: 300, // 5 minutes
  RATE_LIMIT: 60, // 1 minute
  BALANCE: 30 // 30 seconds
} as const

/**
 * Generic cache get with fallback
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisConnected() || !redisClient) {
    return null
  }

  try {
    const data = await redisClient.get(key)
    if (!data) return null
    
    return JSON.parse(data) as T
  } catch (error) {
    logger.error(`[Redis] Get error for key ${key}`, error)
    return null
  }
}

/**
 * Generic cache set with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.USER
): Promise<boolean> {
  if (!isRedisConnected() || !redisClient) {
    return false
  }

  try {
    const serialized = JSON.stringify(value)
    await redisClient.setex(key, ttl, serialized)
    return true
  } catch (error) {
    logger.error(`[Redis] Set error for key ${key}`, error)
    return false
  }
}

/**
 * Delete cache key
 */
export async function cacheDelete(key: string): Promise<boolean> {
  if (!isRedisConnected() || !redisClient) {
    return false
  }

  try {
    await redisClient.del(key)
    return true
  } catch (error) {
    logger.error(`[Redis] Delete error for key ${key}`, error)
    return false
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!isRedisConnected() || !redisClient) {
    return 0
  }

  try {
    const keys = await redisClient.keys(pattern)
    if (keys.length === 0) return 0
    
    await redisClient.del(...keys)
    return keys.length
  } catch (error) {
    logger.error(`[Redis] Delete pattern error for ${pattern}`, error)
    return 0
  }
}

/**
 * Check if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  if (!isRedisConnected() || !redisClient) {
    return false
  }

  try {
    const exists = await redisClient.exists(key)
    return exists === 1
  } catch (error) {
    logger.error(`[Redis] Exists error for key ${key}`, error)
    return false
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean
  totalKeys: number
  memory: string | null
  hitRate: number
}> {
  if (!isRedisConnected() || !redisClient) {
    return {
      connected: false,
      totalKeys: 0,
      memory: null,
      hitRate: 0
    }
  }

  try {
    const dbSize = await redisClient.dbsize()
    const info = await redisClient.info('memory')
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
    const memory = memoryMatch ? memoryMatch[1] : null

    // Get hit rate from Redis stats
    const stats = await redisClient.info('stats')
    const hitsMatch = stats.match(/keyspace_hits:(\d+)/)
    const missesMatch = stats.match(/keyspace_misses:(\d+)/)
    
    const hits = hitsMatch?.[1] ? parseInt(hitsMatch[1]) : 0
    const misses = missesMatch?.[1] ? parseInt(missesMatch[1]) : 0
    const total = hits + misses
    const hitRate = total > 0 ? (hits / total) * 100 : 0

    return {
      connected: true,
      totalKeys: dbSize,
      memory: memory || null,
      hitRate: parseFloat(hitRate.toFixed(2))
    }
  } catch (error) {
    logger.error('[Redis] Stats error', error)
    return {
      connected: false,
      totalKeys: 0,
      memory: null,
      hitRate: 0
    }
  }
}

/**
 * Rate limiting using Redis
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: number
}> {
  if (!isRedisConnected() || !redisClient) {
    // Fallback: Allow all requests when Redis unavailable
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000
    }
  }

  const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`

  try {
    const current = await redisClient.incr(key)
    
    if (current === 1) {
      // First request in window, set expiry
      await redisClient.expire(key, windowSeconds)
    }

    const ttl = await redisClient.ttl(key)
    const resetAt = Date.now() + (ttl * 1000)

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetAt
    }
  } catch (error) {
    logger.error('[Redis] Rate limit error', error)
    // Fallback: Allow request on error
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000
    }
  }
}

/**
 * Session storage using Redis
 */
export async function setSession(
  sessionId: string,
  data: any,
  ttl: number = CACHE_TTL.SESSION
): Promise<boolean> {
  const key = `${CACHE_KEYS.SESSION}${sessionId}`
  return cacheSet(key, data, ttl)
}

export async function getSession(sessionId: string): Promise<any | null> {
  const key = `${CACHE_KEYS.SESSION}${sessionId}`
  return cacheGet(key)
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const key = `${CACHE_KEYS.SESSION}${sessionId}`
  return cacheDelete(key)
}

// DO NOT auto-initialize Redis on module load
// Let server.ts handle initialization explicitly

const redisModule = {
  initRedis,
  getRedisClient,
  isRedisConnected,
  closeRedis,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheExists,
  getCacheStats,
  checkRateLimit,
  setSession,
  getSession,
  deleteSession,
  CACHE_KEYS,
  CACHE_TTL
}

export default redisModule
