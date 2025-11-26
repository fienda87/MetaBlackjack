/**
 * Query Result Cache Module
 * Provides caching for expensive database queries with TTL invalidation
 */

import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern, CACHE_TTL } from './redis';

/**
 * Cache key builders for deterministic keys
 */
export const QUERY_CACHE_KEYS = {
  userStats: (userId: string) => `query:user_stats:${userId}`,
  userHistory: (userId: string, cursor?: string, filter?: string) => 
    `query:user_history:${userId}:${cursor || 'start'}:${filter || 'all'}`,
  walletSummary: (userId: string) => `query:wallet_summary:${userId}`,
  gameDetails: (gameId: string) => `query:game:${gameId}`,
  sessionDetails: (sessionId: string) => `query:session:${sessionId}`,
  userTransactions: (userId: string, cursor?: string) => 
    `query:transactions:${userId}:${cursor || 'start'}`,
  leaderboard: (period: string, limit: number) => 
    `query:leaderboard:${period}:${limit}`,
};

/**
 * Cache TTL configurations (in seconds)
 */
export const QUERY_CACHE_TTL = {
  USER_STATS: 300, // 5 minutes - frequently updated
  USER_HISTORY: 120, // 2 minutes - changes with new games
  WALLET_SUMMARY: 60, // 1 minute - balance changes often
  GAME_DETAILS: 3600, // 1 hour - games don't change after ending
  SESSION_DETAILS: 600, // 10 minutes - session in progress
  TRANSACTIONS: 300, // 5 minutes - transaction history
  LEADERBOARD: 600, // 10 minutes - leaderboard updates
};

/**
 * Get cached query result
 */
export async function getCachedQuery<T>(key: string): Promise<T | null> {
  return cacheGet<T>(key);
}

/**
 * Set cached query result with TTL
 */
export async function setCachedQuery<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.STATS
): Promise<boolean> {
  return cacheSet(key, data, ttl);
}

/**
 * Invalidate specific query cache
 */
export async function invalidateQuery(key: string): Promise<boolean> {
  return cacheDelete(key);
}

/**
 * Invalidate multiple queries by pattern
 */
export async function invalidateQueryPattern(pattern: string): Promise<number> {
  return cacheDeletePattern(pattern);
}

/**
 * Cache invalidation helpers for common scenarios
 */

/**
 * Invalidate user-related caches when user data changes
 */
export async function invalidateUserCaches(userId: string): Promise<void> {
  await Promise.all([
    invalidateQueryPattern(`query:user_stats:${userId}*`),
    invalidateQueryPattern(`query:user_history:${userId}*`),
    invalidateQueryPattern(`query:wallet_summary:${userId}*`),
    invalidateQueryPattern(`query:transactions:${userId}*`),
  ]);
  console.log(`[Cache] Invalidated caches for user ${userId}`);
}

/**
 * Invalidate game-related caches when game ends
 */
export async function invalidateGameCaches(gameId: string, userId: string): Promise<void> {
  await Promise.all([
    invalidateQuery(QUERY_CACHE_KEYS.gameDetails(gameId)),
    invalidateQueryPattern(`query:user_history:${userId}*`),
    invalidateQueryPattern(`query:user_stats:${userId}*`),
  ]);
  console.log(`[Cache] Invalidated caches for game ${gameId}`);
}

/**
 * Invalidate transaction-related caches
 */
export async function invalidateTransactionCaches(userId: string): Promise<void> {
  await Promise.all([
    invalidateQueryPattern(`query:transactions:${userId}*`),
    invalidateQueryPattern(`query:wallet_summary:${userId}*`),
  ]);
  console.log(`[Cache] Invalidated transaction caches for user ${userId}`);
}

/**
 * Invalidate session-related caches
 */
export async function invalidateSessionCaches(sessionId: string, userId: string): Promise<void> {
  await Promise.all([
    invalidateQuery(QUERY_CACHE_KEYS.sessionDetails(sessionId)),
    invalidateQueryPattern(`query:user_history:${userId}*`),
  ]);
  console.log(`[Cache] Invalidated caches for session ${sessionId}`);
}

/**
 * Invalidate leaderboard caches
 */
export async function invalidateLeaderboardCaches(): Promise<void> {
  await invalidateQueryPattern('query:leaderboard:*');
  console.log('[Cache] Invalidated leaderboard caches');
}

/**
 * Helper: Cache wrapper for expensive queries
 * Automatically handles cache get/set with consistent pattern
 */
export async function cacheQuery<T>(
  cacheKey: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await getCachedQuery<T>(cacheKey);
  if (cached !== null) {
    console.log(`[Cache] Hit: ${cacheKey}`);
    return cached;
  }

  // Cache miss - execute query
  console.log(`[Cache] Miss: ${cacheKey}`);
  const result = await queryFn();

  // Store in cache (fire-and-forget)
  setCachedQuery(cacheKey, result, ttl).catch(err => {
    console.error(`[Cache] Failed to cache ${cacheKey}:`, err);
  });

  return result;
}

/**
 * Precomputed Stats Cache Functions
 */

export interface PrecomputedUserStats {
  totalHands: number;
  totalBet: number;
  totalWin: number;
  netProfit: number;
  winRate: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  lastUpdated: string;
}

/**
 * Get precomputed user stats (from cache or database)
 */
export async function getPrecomputedStats(userId: string): Promise<PrecomputedUserStats | null> {
  const cacheKey = QUERY_CACHE_KEYS.userStats(userId);
  
  // Try cache first
  const cached = await getCachedQuery<PrecomputedUserStats>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback: Try to get from SystemConfig
  try {
    const { db } = await import('./db');
    const config = await db.systemConfig.findUnique({
      where: { key: `user_stats:${userId}` }
    });

    if (config && config.value) {
      const stats = config.value as unknown as PrecomputedUserStats;
      
      // Cache for next time
      await setCachedQuery(cacheKey, stats, QUERY_CACHE_TTL.USER_STATS);
      
      return stats;
    }
  } catch (error) {
    console.error('[Cache] Failed to get precomputed stats:', error);
  }

  return null;
}

/**
 * Store precomputed user stats
 */
export async function setPrecomputedStats(
  userId: string,
  stats: PrecomputedUserStats
): Promise<boolean> {
  const cacheKey = QUERY_CACHE_KEYS.userStats(userId);
  return setCachedQuery(cacheKey, stats, QUERY_CACHE_TTL.USER_STATS);
}
