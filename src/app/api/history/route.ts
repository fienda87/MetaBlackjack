import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, buildCursorPaginationResponse, buildPrismaCursorParams } from '@/lib/pagination'
import { createCachedResponse, CACHE_PRESETS } from '@/lib/http-cache'

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
        sessions: [], 
        overallStats: { 
          totalHands: 0, 
          totalBet: 0, 
          totalWin: 0, 
          netProfit: 0, 
          winRate: 0, 
          blackjacks: 0, 
          busts: 0 
        }, 
        pagination: { 
          limit, 
          nextCursor: undefined, 
          hasMore: false 
        } 
      })
    }
    
    // Build where clause
    const whereClause: any = { playerId: userId }
    if (resultFilter !== 'all') {
      whereClause.result = resultFilter.toUpperCase()
    }

    // 🚀 Phase 2: Cursor-based pagination for better performance
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

    // 🚀 Phase 2: Lean payload - minimal formatting
    const formattedGames = games.map(game => {
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

    // 🚀 Simplified stats - computed from current page only
    const overallStats = {
      totalBet: formattedGames.reduce((sum, game) => sum + game.betAmount, 0),
      totalWin: formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').reduce((sum, game) => sum + (game.winAmount || 0), 0),
      netProfit: formattedGames.reduce((sum, game) => sum + (game.netProfit || 0), 0),
      winRate: formattedGames.length > 0 ? (formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').length / formattedGames.length) * 100 : 0,
      blackjacks: formattedGames.filter(g => g.isBlackjack).length,
      busts: formattedGames.filter(g => g.isBust).length
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