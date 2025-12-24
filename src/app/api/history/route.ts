export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildSafeCursorParams, buildCursorPaginationResponse, GAME_SELECT, getSafeLimit } from '@/lib/query-helpers'
import { cacheGetOrFetch, CACHE_STRATEGIES } from '@/lib/cache-operations'
import { perfMetrics } from '@/lib/performance-monitor'


export async function GET(request: NextRequest) {
  const perfLabel = 'api:history'
  perfMetrics.start(perfLabel)
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const cursor = searchParams.get('cursor')
    const limit = getSafeLimit(parseInt(searchParams.get('limit') || '20'))
    const resultFilter = searchParams.get('resultFilter') || 'all'

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId required' 
      }, { status: 400 })
    }
    
    // Build where clause
    const whereClause: any = { playerId: userId }
    if (resultFilter !== 'all') {
      whereClause.result = resultFilter.toUpperCase()
    }

    // 🚀 CACHED: Include cursor in cache key for pagination
    const historyStrategy = CACHE_STRATEGIES.GAME_HISTORY(userId, cursor || undefined)
    
    const result = await cacheGetOrFetch(
      historyStrategy.key,
      historyStrategy,
      async () => {
        // 🚀 OPTIMIZED: Use cursor pagination with explicit fields
        const cursorParams = buildSafeCursorParams(cursor, limit)
        
        const games = await db.game.findMany({
          where: whereClause,
          select: GAME_SELECT.HISTORY, // Optimized field selection
          ...cursorParams,
          orderBy: { createdAt: 'desc' }
        })
        
        // Build cursor pagination response
        const paginated = buildCursorPaginationResponse(games, limit)
        
        return paginated
      }
    )

    // 🚀 Minimal formatting - let client handle date formatting
    const formattedGames = result.data.map(game => {
      const playerHand = game.playerHand as any
      const dealerHand = game.dealerHand as any
      return {
        id: game.id,
        date: game.createdAt.toISOString(),
        betAmount: game.betAmount,
        result: game.result || 'UNKNOWN',
        netProfit: game.netProfit || 0,
        playerValue: playerHand?.value || 0,
        dealerValue: dealerHand?.value || 0,
        isBlackjack: playerHand?.isBlackjack || false,
        isBust: playerHand?.isBust || false
      }
    })

    return NextResponse.json({ 
      games: formattedGames,
      pagination: result.pagination
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('❌ Error fetching game history:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch game history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    perfMetrics.end(perfLabel)
  }
}
