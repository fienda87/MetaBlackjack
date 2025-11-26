import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, buildCursorPaginationResponse, buildPrismaCursorParams } from '@/lib/pagination'
import { createCachedResponse, CACHE_PRESETS } from '@/lib/http-cache'
import { cacheQuery, QUERY_CACHE_KEYS, QUERY_CACHE_TTL, getPrecomputedStats } from '@/lib/query-cache'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { limit, cursor } = parsePaginationParams(searchParams)
    const resultFilter = searchParams.get('resultFilter') || 'all'

    if (!userId) {
      return NextResponse.json({ 
        games: [], 
        overallStats: { 
          totalHands: 0, 
          totalBet: 0, 
          totalWin: 0, 
          netProfit: 0, 
          winRate: 0, 
          blackjacks: 0, 
          wins: 0,
          losses: 0,
          pushes: 0
        }, 
        pagination: { 
          limit, 
          nextCursor: undefined, 
          hasMore: false 
        } 
      })
    }
    
    // 🚀 Phase 3: Use query cache for game history
    const cacheKey = QUERY_CACHE_KEYS.userHistory(userId, cursor, resultFilter)
    
    const formattedGames = await cacheQuery(
      cacheKey,
      QUERY_CACHE_TTL.USER_HISTORY,
      async () => {
        // Build where clause
        const whereClause: any = { playerId: userId }
        if (resultFilter !== 'all') {
          whereClause.result = resultFilter.toUpperCase()
        }

        // Cursor-based pagination for better performance
        const games = await db.game.findMany({
          where: whereClause,
          select: {
            id: true,
            createdAt: true,
            betAmount: true,
            result: true,
            winAmount: true,
            netProfit: true,
            playerHand: true,
            dealerHand: true,
            sessionId: true
          },
          orderBy: { createdAt: 'desc' },
          ...(cursor ? { take: limit, skip: 1, cursor: { id: cursor } } : { take: limit })
        })

        // Lean payload - minimal formatting
        return games.map(game => {
          const playerHand = game.playerHand as any
          const dealerHand = game.dealerHand as any
          return {
            id: game.id,
            date: game.createdAt.toISOString(),
            betAmount: game.betAmount,
            result: game.result || 'UNKNOWN',
            winAmount: game.winAmount || 0,
            netProfit: game.netProfit || 0,
            playerValue: playerHand?.value || 0,
            dealerValue: dealerHand?.value || 0,
            isBlackjack: playerHand?.isBlackjack || false,
            isBust: playerHand?.isBust || false,
            sessionId: game.sessionId
          }
        })
      }
    )

    // 🚀 Phase 3: Get precomputed stats (from cache or database)
    const precomputedStats = await getPrecomputedStats(userId)
    
    let overallStats
    if (precomputedStats) {
      // Use precomputed stats for better performance
      overallStats = {
        totalHands: precomputedStats.totalHands,
        totalBet: precomputedStats.totalBet,
        totalWin: precomputedStats.totalWin,
        netProfit: precomputedStats.netProfit,
        winRate: precomputedStats.winRate,
        blackjacks: precomputedStats.blackjacks,
        wins: precomputedStats.wins,
        losses: precomputedStats.losses,
        pushes: precomputedStats.pushes
      }
    } else {
      // Fallback: compute from current page (if precomputed stats not available)
      overallStats = {
        totalHands: formattedGames.length,
        totalBet: formattedGames.reduce((sum, game) => sum + game.betAmount, 0),
        totalWin: formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').reduce((sum, game) => sum + (game.winAmount || 0), 0),
        netProfit: formattedGames.reduce((sum, game) => sum + (game.netProfit || 0), 0),
        winRate: formattedGames.length > 0 ? (formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').length / formattedGames.length) * 100 : 0,
        blackjacks: formattedGames.filter(g => g.isBlackjack).length,
        wins: formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').length,
        losses: formattedGames.filter(g => g.result === 'LOSE').length,
        pushes: formattedGames.filter(g => g.result === 'PUSH').length
      }
    }

    const responseData = { 
      games: formattedGames,
      overallStats,
      ...buildCursorPaginationResponse(formattedGames, limit)
    }

    // 🚀 Phase 2: Return cached response with ETag
    return createCachedResponse(responseData, request, {
      preset: CACHE_PRESETS.MEDIUM,
      vary: ['Authorization']
    })
  } catch (error) {
    console.error('❌ Error fetching game history:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch game history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}