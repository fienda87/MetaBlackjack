/**
 * Cache Helper Utilities
 * Provides high-level caching functions with fallback support
 */

import { getRedisClient, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { logger } from '@/lib/logger'

/**
 * Get cached data with automatic fallback to fetcher function
 * 
 * @param key - Cache key
 * @param fetcher - Function to fetch data if cache miss
 * @param ttl - Time to live in seconds (default: 60)
 * @returns Cached or fetched data
 * 
 * @example
 * const user = await getCached(
 *   `user:${userId}`,
 *   () => db.user.findUnique({ where: { id: userId } }),
 *   300
 * )
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  const redis = getRedisClient()
  
  // Fallback: No Redis available
  if (!redis) {
    return fetcher()
  }
  
  try {
    // Try to get from cache
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached) as T
    }
    
    // Cache miss: Fetch from source
    const data = await fetcher()
    
    // Store in cache (don't await to avoid blocking)
    redis.setex(key, ttl, JSON.stringify(data)).catch(err => {
      logger.error(`Cache set error for key ${key}`, err)
    })
    
    return data
  } catch (error) {
    logger.error(`Cache error for key ${key}`, error)
    // On error, fallback to direct fetch
    return fetcher()
  }
}

/**
 * Invalidate (delete) cache by key
 * 
 * @param key - Cache key to delete
 * @returns Success status
 * 
 * @example
 * await invalidateCache(`user:${userId}`)
 */
export async function invalidateCache(key: string): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false
  
  try {
    await redis.del(key)
    return true
  } catch (error) {
    logger.error(`Cache invalidation error for key ${key}`, error)
    return false
  }
}

/**
 * Invalidate multiple cache keys by pattern
 * 
 * @param pattern - Redis key pattern (e.g., "user:*")
 * @returns Number of keys deleted
 * 
 * @example
 * await invalidateCachePattern('balance:*')
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  const redis = getRedisClient()
  if (!redis) return 0
  
  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) return 0
    
    await redis.del(...keys)
    return keys.length
  } catch (error) {
    logger.error(`Cache pattern invalidation error for ${pattern}`, error)
    return 0
  }
}

/**
 * Set cache with TTL
 * 
 * @param key - Cache key
 * @param value - Data to cache
 * @param ttl - Time to live in seconds
 * @returns Success status
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = 60
): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false
  
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
    return true
  } catch (error) {
    logger.error(`Cache set error for key ${key}`, error)
    return false
  }
}

/**
 * Retry database query with exponential backoff
 * Useful for handling temporary database connection issues
 * 
 * @param fn - Database query function
 * @param retries - Number of retry attempts (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 * @returns Query result
 * 
 * @example
 * const user = await retryQuery(
 *   () => db.user.findUnique({ where: { id } }),
 *   3,
 *   1000
 * )
 */
export async function retryQuery<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    // Only retry on connection errors (P1001)
    if (retries > 0 && error.code === 'P1001') {
      logger.warn(`DB query failed, retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryQuery(fn, retries - 1, delay * 2) // Exponential backoff
    }
    throw error
  }
}

/**
 * Batch invalidate multiple related caches
 * 
 * @param patterns - Array of cache key patterns
 * @returns Total number of keys deleted
 * 
 * @example
 * await batchInvalidate([
 *   'user:123:*',
 *   'balance:0x...',
 *   'history:123'
 * ])
 */
export async function batchInvalidate(patterns: string[]): Promise<number> {
  const redis = getRedisClient()
  if (!redis) return 0
  
  try {
    let totalDeleted = 0
    
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
        totalDeleted += keys.length
      }
    }
    
    return totalDeleted
  } catch (error) {
    logger.error('Batch invalidation error', error)
    return 0
  }
}

// Export cache configuration for easy access
export { CACHE_KEYS, CACHE_TTL }
