/**
 * Cache operations with Redis integration
 * Provides get/set/delete operations with fallback handling
 */

import type Redis from 'ioredis'
import { getRedisClient, isRedisConnected } from './redis'
import { CacheStrategy } from './cache-strategy'

type MemoryCacheEntry = {
  value: string
  expiresAt: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
let memoryHits = 0
let memoryMisses = 0

const getConnectedRedisClient = (): Redis | null => {
  if (!isRedisConnected()) return null

  const client = getRedisClient()
  if (!client) return null

  return client
}

const getMemoryValue = (key: string): string | null => {
  const entry = memoryCache.get(key)
  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key)
    return null
  }

  return entry.value
}

const setMemoryValue = (key: string, value: string, ttlMs: number) => {
  const expiresAt = Date.now() + Math.max(0, ttlMs)
  memoryCache.set(key, { value, expiresAt })
}

const globToRegExp = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const regex = `^${escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.')}$`
  return new RegExp(regex)
}

const deleteMemoryByPattern = (pattern: string): number => {
  const regex = globToRegExp(pattern)

  let deleted = 0
  for (const key of memoryCache.keys()) {
    const entry = memoryCache.get(key)
    if (!entry) continue

    if (entry.expiresAt <= Date.now()) {
      memoryCache.delete(key)
      continue
    }

    if (!regex.test(key)) continue

    memoryCache.delete(key)
    deleted++
  }

  return deleted
}

// Cache get operation
export const cacheGet = async <T = any>(key: string): Promise<T | null> => {
  const redisClient = getConnectedRedisClient()

  if (!redisClient) {
    const cached = getMemoryValue(key)

    if (cached) {
      memoryHits++
      console.log(`[Cache] HIT (memory): ${key}`)
      return JSON.parse(cached) as T
    }

    memoryMisses++
    console.log(`[Cache] MISS (memory): ${key}`)
    return null
  }

  try {
    const cached = await redisClient.get(key)
    if (cached) {
      console.log(`[Cache] HIT: ${key}`)
      return JSON.parse(cached) as T
    }
    console.log(`[Cache] MISS: ${key}`)
    return null
  } catch (error) {
    console.error(`[Cache] Get error for ${key}:`, error)

    const cached = getMemoryValue(key)
    if (cached) {
      memoryHits++
      console.log(`[Cache] HIT (memory after error): ${key}`)
      return JSON.parse(cached) as T
    }

    memoryMisses++
    return null
  }
}

// Cache set operation
export const cacheSet = async (
  key: string,
  data: any,
  ttlMs: number
): Promise<boolean> => {
  const redisClient = getConnectedRedisClient()

  if (!redisClient) {
    try {
      setMemoryValue(key, JSON.stringify(data), ttlMs)
      console.log(`[Cache] SET (memory): ${key} (TTL: ${ttlMs}ms)`)
      return true
    } catch (error) {
      console.error(`[Cache] Set (memory) error for ${key}:`, error)
      return false
    }
  }

  try {
    const ttlSecs = Math.floor(ttlMs / 1000)
    const serialized = JSON.stringify(data)
    await redisClient.setex(key, ttlSecs, serialized)
    console.log(`[Cache] SET: ${key} (TTL: ${ttlMs}ms)`)
    return true
  } catch (error) {
    console.error(`[Cache] Set error for ${key}:`, error)

    try {
      setMemoryValue(key, JSON.stringify(data), ttlMs)
      console.log(`[Cache] SET (memory after error): ${key} (TTL: ${ttlMs}ms)`)
      return true
    } catch {
      return false
    }
  }
}

// Cache delete operation
export const cacheDelete = async (key: string): Promise<boolean> => {
  const redisClient = getConnectedRedisClient()

  if (!redisClient) {
    const deleted = memoryCache.delete(key)
    if (deleted) {
      console.log(`[Cache] DELETE (memory): ${key}`)
    }
    return deleted
  }

  try {
    await redisClient.del(key)
    console.log(`[Cache] DELETE: ${key}`)
    return true
  } catch (error) {
    console.error(`[Cache] Delete error for ${key}:`, error)

    const deleted = memoryCache.delete(key)
    if (deleted) {
      console.log(`[Cache] DELETE (memory after error): ${key}`)
    }
    return deleted
  }
}

// Cache delete by pattern (for tag invalidation)
export const cacheDeletePattern = async (pattern: string): Promise<number> => {
  const redisClient = getConnectedRedisClient()

  if (!redisClient) {
    const deleted = deleteMemoryByPattern(pattern)
    if (deleted === 0) {
      console.log(`[Cache] PATTERN DELETE (memory): ${pattern} (no matches)`)
    } else {
      console.log(`[Cache] PATTERN DELETE (memory): ${pattern} (${deleted} keys)`)
    }
    return deleted
  }

  try {
    const keys = await redisClient.keys(pattern)
    if (keys.length === 0) {
      console.log(`[Cache] PATTERN DELETE: ${pattern} (no matches)`)
      return 0
    }

    await redisClient.del(...keys)
    console.log(`[Cache] PATTERN DELETE: ${pattern} (${keys.length} keys)`)
    return keys.length
  } catch (error) {
    console.error(`[Cache] Pattern delete error for ${pattern}:`, error)
    return deleteMemoryByPattern(pattern)
  }
}

// Cache invalidation by tags
export const cacheInvalidateByTags = async (tags: string[]): Promise<void> => {
  try {
    const invalidationPromises = tags.map(tag => {
      const pattern = `*:${tag}:*`
      return cacheDeletePattern(pattern)
    })

    await Promise.all(invalidationPromises)
    console.log(`[Cache] TAGS INVALIDATED: [${tags.join(', ')}]`)
  } catch (error) {
    console.error(`[Cache] Tag invalidation error:`, error)
  }
}

// Cache get or fetch (read-through cache pattern)
export const cacheGetOrFetch = async <T = any>(
  key: string,
  strategy: CacheStrategy,
  fetchFn: () => Promise<T>
): Promise<T> => {
  // Try cache first
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  // Cache miss - fetch fresh data
  console.log(`[Cache] MISS - fetching fresh data: ${key}`)
  const data = await fetchFn()

  // Store in cache
  await cacheSet(key, data, strategy.ttl)

  return data
}

// Batch cache operations
export const cacheGetBatch = async <T = any>(
  keys: string[]
): Promise<(T | null)[]> => {
  const redisClient = getConnectedRedisClient()

  if (!redisClient) {
    return keys.map(key => {
      const value = getMemoryValue(key)
      if (value === null) {
        memoryMisses++
        console.log(`[Cache] BATCH MISS (memory): ${key}`)
        return null
      }

      memoryHits++
      console.log(`[Cache] BATCH HIT (memory): ${key}`)
      return JSON.parse(value) as T
    })
  }

  try {
    const values = await redisClient.mget(keys)
    return values.map((value, index) => {
      if (value === null) {
        console.log(`[Cache] BATCH MISS: ${keys[index]}`)
        return null
      }
      console.log(`[Cache] BATCH HIT: ${keys[index]}`)
      return JSON.parse(value) as T
    })
  } catch (error) {
    console.error(`[Cache] Batch get error:`, error)
    return keys.map(key => {
      const value = getMemoryValue(key)
      if (value === null) {
        memoryMisses++
        return null
      }

      memoryHits++
      return JSON.parse(value) as T
    })
  }
}

export const cacheSetBatch = async (
  entries: Array<{ key: string; data: any; ttlMs: number }>
): Promise<number> => {
  try {
    let successCount = 0

    for (const entry of entries) {
      const success = await cacheSet(entry.key, entry.data, entry.ttlMs)
      if (success) successCount++
    }

    return successCount
  } catch (error) {
    console.error(`[Cache] Batch set error:`, error)
    return 0
  }
}

// Cache stats
export const getCacheStats = async (): Promise<{
  connected: boolean
  totalKeys: number
  memory: string | null
  hitRate: number
}> => {
  const redisClient = getConnectedRedisClient()

  if (!redisClient) {
    const total = memoryHits + memoryMisses
    const hitRate = total > 0 ? (memoryHits / total) * 100 : 0

    return {
      connected: true,
      totalKeys: memoryCache.size,
      memory: 'in-memory',
      hitRate: parseFloat(hitRate.toFixed(2))
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
    console.error('[Cache] Stats error:', error)

    const total = memoryHits + memoryMisses
    const hitRate = total > 0 ? (memoryHits / total) * 100 : 0

    return {
      connected: true,
      totalKeys: memoryCache.size,
      memory: 'in-memory',
      hitRate: parseFloat(hitRate.toFixed(2))
    }
  }
}

// Warm up cache with frequently accessed data
export const cacheWarmup = async (): Promise<void> => {
  try {
    console.log('[Cache] Warming up cache...')

    // Cache could be warmed with:
    // - System configuration
    // - Game rules
    // - Static admin data
    // - Popular user data

    console.log('[Cache] Warmup completed')
  } catch (error) {
    console.error('[Cache] Warmup error:', error)
  }
}

// Cache key validation
export const isValidCacheKey = (key: string): boolean => {
  // Basic validation for cache keys
  return key.length > 0 &&
    key.length < 256 &&
    !key.includes('\n') &&
    !key.includes('\r')
}

// Extract cache statistics for monitoring
export const extractCacheMetrics = (stats: {
  connected: boolean
  totalKeys: number
  memory: string | null
  hitRate: number
}) => {
  return {
    enabled: stats.connected,
    totalKeys: stats.totalKeys,
    memoryUsage: stats.memory,
    hitRate: `${stats.hitRate}%`,
    health: stats.connected && stats.hitRate > 50 ? 'good' :
      stats.connected ? 'fair' : 'disabled'
  }
}

// Re-export CACHE_STRATEGIES for convenience
export { CACHE_STRATEGIES } from './cache-strategy'
