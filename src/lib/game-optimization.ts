// Optimized game action processing
// Reduces database queries and improves response time

import { db } from '@/lib/db'
import { cache, CacheKeys, CacheTTL, invalidateCache } from './cache'

export interface OptimizedGameData {
  game: any
  user: any
  session: any | null
}

// Batch fetch game, user, and session data in parallel
export async function fetchGameData(gameId: string, userId: string): Promise<OptimizedGameData> {
  // Use Promise.all for parallel queries instead of sequential
  const [game, user, session] = await Promise.all([
    // Try cache first for game
    cache.get(CacheKeys.game(gameId)) || 
      db.game.findUnique({ 
        where: { id: gameId },
        select: {
          id: true,
          playerId: true,
          betAmount: true,
          currentBet: true,
          state: true,
          playerHand: true,
          dealerHand: true,
          deck: true,
          result: true,
          netProfit: true,
          insuranceBet: true,
          hasSplit: true,
          hasSurrendered: true,
          hasInsurance: true,
          splitHands: true,
          sessionId: true
        }
      }).then(g => {
        if (g) cache.set(CacheKeys.game(gameId), g, CacheTTL.game)
        return g
      }),
    
    // Try cache first for user
    cache.get(CacheKeys.user(userId)) ||
      db.user.findUnique({ 
        where: { id: userId },
        select: {
          id: true,
          balance: true,
          username: true,
          walletAddress: true
        }
      }).then(u => {
        if (u) cache.set(CacheKeys.user(userId), u, CacheTTL.user)
        return u
      }),
    
    // Session lookup (optional, don't block if not found)
    db.gameSession.findFirst({
      where: {
        playerId: userId,
        endTime: null,
        startTime: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        totalGames: true,
        totalBet: true,
        totalWin: true,
        netProfit: true,
        stats: true
      }
    }).catch(() => null) // Don't fail if session not found
  ])

  return { game, user, session }
}

// Optimized balance update - only update, don't fetch again
export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { balance: newBalance }
  })
  
  // Invalidate cache
  invalidateCache.user(userId)
  invalidateCache.userBalance(userId)
}

// Batch update game and create transaction in single database round-trip
export async function finalizeGame(
  gameId: string,
  userId: string,
  gameData: any,
  transactionData: any
): Promise<void> {
  // Use transaction for atomicity but minimize queries
  await db.$transaction([
    db.game.update({
      where: { id: gameId },
      data: gameData
    }),
    db.transaction.create({
      data: transactionData
    })
  ])
  
  // Invalidate caches
  invalidateCache.game(gameId)
}

// Optimized session stats update - debounced and batched
const sessionUpdateQueue = new Map<string, NodeJS.Timeout>()

export function queueSessionUpdate(
  sessionId: string,
  updateFn: () => Promise<void>,
  debounceMs: number = 1000
): void {
  // Clear existing timeout
  const existing = sessionUpdateQueue.get(sessionId)
  if (existing) {
    clearTimeout(existing)
  }
  
  // Set new timeout
  const timeout = setTimeout(async () => {
    await updateFn()
    sessionUpdateQueue.delete(sessionId)
  }, debounceMs)
  
  sessionUpdateQueue.set(sessionId, timeout)
}
