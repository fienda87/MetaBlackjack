/**
 * Cache invalidation utilities for strategic cache management
 * Handles complex invalidation patterns and ensures cache consistency
 */

import { cacheInvalidateByTags, cacheDeletePattern } from './cache-operations'
import { CACHE_PATTERNS, CACHE_TAGS } from './cache-strategy'
import { perfMetrics } from './performance-monitor'

// Cache invalidation manager
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager
  private isEnabled = true

  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager()
    }
    return CacheInvalidationManager.instance
  }

  // Enable/disable cache invalidation
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    console.log(`[CacheInvalidation] ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }

  // Invalidate user-related caches
  async invalidateUserData(userId: string, reason: string = 'user_mutation'): Promise<void> {
    if (!this.isEnabled) return
    
    const perfLabel = `cache:invalidate:user:${userId}`
    perfMetrics.start(perfLabel)

    try {
      console.log(`[CacheInvalidation] User data invalidated for ${userId}: ${reason}`)
      
      await Promise.all([
        // Invalidate user balance cache
        cacheInvalidateByTags(CACHE_TAGS.USER_BALANCE(userId)),
        // Invalidate user stats cache
        cacheInvalidateByTags(CACHE_TAGS.USER_STATS(userId)),
        // Invalidate user history cache
        cacheInvalidateByTags(CACHE_TAGS.USER_HISTORY(userId)),
        // Invalidate all user games cache
        cacheDeletePattern(CACHE_PATTERNS.USER_GAMES(userId))
      ])

      console.log(`[CacheInvalidation] ✅ User ${userId} caches invalidated`)
    } catch (error) {
      console.error(`[CacheInvalidation] ❌ Error invalidating user ${userId}:`, error)
    } finally {
      perfMetrics.end(perfLabel)
    }
  }

  // Invalidate game-related caches
  async invalidateGameData(gameId: string, userId: string, reason: string = 'game_mutation'): Promise<void> {
    if (!this.isEnabled) return
    
    const perfLabel = `cache:invalidate:game:${gameId}`
    perfMetrics.start(perfLabel)

    try {
      console.log(`[CacheInvalidation] Game data invalidated for ${gameId}: ${reason}`)
      
      await Promise.all([
        // Invalidate specific game state cache
        cacheDeletePattern(CACHE_PATTERNS.GAME_STATE(gameId)),
        // Invalidate user's related caches
        this.invalidateUserData(userId, `game_${reason}`)
      ])

      console.log(`[CacheInvalidation] ✅ Game ${gameId} caches invalidated`)
    } catch (error) {
      console.error(`[CacheInvalidation] ❌ Error invalidating game ${gameId}:`, error)
    } finally {
      perfMetrics.end(perfLabel)
    }
  }

  // Invalidate admin data caches
  async invalidateAdminData(resource: string, reason: string = 'admin_mutation'): Promise<void> {
    if (!this.isEnabled) return
    
    const perfLabel = `cache:invalidate:admin:${resource}`
    perfMetrics.start(perfLabel)

    try {
      console.log(`[CacheInvalidation] Admin data invalidated for ${resource}: ${reason}`)
      
      await cacheInvalidateByTags(CACHE_TAGS.ADMIN_DATA(resource))

      console.log(`[CacheInvalidation] ✅ Admin ${resource} caches invalidated`)
    } catch (error) {
      console.error(`[CacheInvalidation] ❌ Error invalidating admin ${resource}:`, error)
    } finally {
      perfMetrics.end(perfLabel)
    }
  }

  // Bulk invalidation for system-wide changes
  async invalidateSystemData(resource: string, reason: string = 'system_mutation'): Promise<void> {
    if (!this.isEnabled) return
    
    const perfLabel = `cache:invalidate:system:${resource}`
    perfMetrics.start(perfLabel)

    try {
      console.log(`[CacheInvalidation] System data invalidated for ${resource}: ${reason}`)
      
      await Promise.all([
        // Invalidate system config cache
        cacheDeletePattern(CACHE_PATTERNS.SYSTEM_DATA(resource)),
        // Invalidate all admin caches
        cacheInvalidateByTags(CACHE_TAGS.ADMIN_DATA(resource))
      ])

      console.log(`[CacheInvalidation] ✅ System ${resource} caches invalidated`)
    } catch (error) {
      console.error(`[CacheInvalidation] ❌ Error invalidating system ${resource}:`, error)
    } finally {
      perfMetrics.end(perfLabel)
    }
  }

  // Smart invalidation based on game result
  async invalidateOnGameEnd(gameId: string, userId: string, gameResult: string): Promise<void> {
    if (!this.isEnabled) return
    
    console.log(`[CacheInvalidation] Game ended: ${gameId}, result: ${gameResult}`)
    
    // Invalidate multiple cache layers for comprehensive update
    await Promise.all([
      // Game state cache
      this.invalidateGameData(gameId, userId, 'game_ended'),
      // User balance (immediate update needed)
      this.invalidateUserData(userId, 'balance_change'),
      // User stats (updated after game completion)
      this.invalidateUserData(userId, 'stats_update')
    ])
  }

  // Periodic cache warming for frequently accessed data
  async warmUpCaches(frequentUserIds: string[] = []): Promise<void> {
    if (!this.isEnabled) return
    
    const perfLabel = 'cache:warmup'
    perfMetrics.start(perfLabel)

    try {
      console.log('[CacheInvalidation] 🔥 Warming up caches...')
      
      // Warm up system configuration
      await cacheInvalidateByTags(CACHE_TAGS.SYSTEM_DATA('config'))
      
      // Warm up frequently accessed user data
      for (const userId of frequentUserIds) {
        await this.invalidateUserData(userId, 'warmup')
      }

      console.log('[CacheInvalidation] ✅ Cache warmup completed')
    } catch (error) {
      console.error('[CacheInvalidation] ❌ Cache warmup error:', error)
    } finally {
      perfMetrics.end(perfLabel)
    }
  }

  // Get cache invalidation statistics
  async getInvalidationStats(): Promise<{
    enabled: boolean
    recentInvalidations: number
    performance: any
  }> {
    return {
      enabled: this.isEnabled,
      recentInvalidations: perfMetrics.getStats('cache:invalidate:*')?.count || 0,
      performance: perfMetrics.getAllStats()
    }
  }
}

// Singleton instance
export const cacheInvalidation = CacheInvalidationManager.getInstance()

// Convenience functions for common invalidation scenarios
export const invalidateOnUserAction = async (userId: string, action: string): Promise<void> => {
  switch (action) {
    case 'balance_change':
      return cacheInvalidation.invalidateUserData(userId, 'balance_change')
    case 'game_played':
      return cacheInvalidation.invalidateUserData(userId, 'game_played')
    case 'profile_update':
      return cacheInvalidation.invalidateUserData(userId, 'profile_update')
    default:
      return cacheInvalidation.invalidateUserData(userId, 'general_update')
  }
}

export const invalidateOnGameAction = async (gameId: string, userId: string, action: string): Promise<void> => {
  switch (action) {
    case 'game_started':
      return cacheInvalidation.invalidateGameData(gameId, userId, 'game_started')
    case 'game_action':
      return cacheInvalidation.invalidateGameData(gameId, userId, 'game_action')
    case 'game_ended':
      return cacheInvalidation.invalidateOnGameEnd(gameId, userId, 'ended')
    default:
      return cacheInvalidation.invalidateGameData(gameId, userId, 'general_update')
  }
}

export const invalidateOnAdminAction = async (resource: string, action: string): Promise<void> => {
  return cacheInvalidation.invalidateAdminData(resource, action)
}