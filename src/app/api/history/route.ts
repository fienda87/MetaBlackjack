import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { 
  cacheGet, 
  cacheSet, 
  isRedisConnected,
  CACHE_KEYS,
  CACHE_TTL
} from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 History API called')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const resultFilter = searchParams.get('resultFilter') || 'all'
    const offset = (page - 1) * limit

    if (!userId) {
      console.log('❌ No userId provided')
      return NextResponse.json({ games: [], sessions: [] })
    }

    console.log(`👤 Fetching history for user: ${userId}, filter: ${resultFilter}`)
    
    // Try Redis cache first
    const cacheKey = `${CACHE_KEYS.HISTORY}${userId}:${page}:${limit}:${resultFilter}`
    
    if (isRedisConnected()) {
      const cachedData = await cacheGet<any>(cacheKey)
      if (cachedData) {
        console.log('✅ History cache HIT (Redis)')
        return NextResponse.json(cachedData)
      }
      console.log('❌ History cache MISS (Redis)')
    }
    
    // Get user
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return NextResponse.json({ games: [], sessions: [] })
    }

    console.log(`📊 Fetching games: page=${page}, limit=${limit}`)

    // Build where clause with filter
    let whereClause: any = {
      playerId: userId
    }

    // Add result filter if not 'all'
    if (resultFilter !== 'all') {
      whereClause.result = resultFilter.toUpperCase()
    }

    // Fetch games with filter
    const games = await db.game.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    console.log(`🎮 Found ${games.length} games`)

    // Get total count with same filter
    const totalCount = await db.game.count({
      where: whereClause
    })

    // Format game data
    const formattedGames = games.map(game => {
      const playerHand = game.playerHand as any
      const dealerHand = game.dealerHand as any
      
      return {
        id: game.id,
        date: game.createdAt.toLocaleDateString(),
        time: game.createdAt.toLocaleTimeString(),
        betAmount: game.betAmount,
        result: game.result || 'UNKNOWN',
        winAmount: game.winAmount || 0,
        netProfit: game.netProfit || 0,
        playerValue: playerHand?.value || 0,
        dealerValue: dealerHand?.value || 0,
        isBlackjack: playerHand?.isBlackjack || false,
        isBust: playerHand?.isBust || false,
        sessionId: game.sessionId,
        sessionDate: game.createdAt.toLocaleDateString()
      }
    })

    // Fetch sessions with detailed stats
    const sessions = await db.gameSession.findMany({
      where: {
        playerId: userId
      },
      orderBy: { startTime: 'desc' },
      take: 10
    })

    console.log(`📈 Found ${sessions.length} sessions`)

    const formattedSessions = sessions.map(session => {
      const stats = session.stats as any
      const duration = session.endTime ? 
        Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 60000) : 
        Math.floor((new Date().getTime() - session.startTime.getTime()) / 60000)
      
      const winRate = session.totalGames > 0 ? 
        ((stats.wins || 0) / session.totalGames) * 100 : 0
      
      return {
        id: session.id,
        date: session.startTime.toLocaleDateString(),
        startTime: session.startTime.toLocaleTimeString(),
        endTime: session.endTime?.toLocaleTimeString() || 'Active',
        hands: session.totalGames,
        totalBet: session.totalBet,
        totalWin: session.totalWin,
        result: session.netProfit,
        duration: duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`,
        winRate: parseFloat(winRate.toFixed(1)),
        stats: {
          wins: stats.wins || 0,
          losses: stats.losses || 0,
          pushes: stats.pushes || 0,
          blackjacks: stats.blackjacks || 0,
          busts: stats.busts || 0,
          totalHands: stats.totalHands || 0
        }
      }
    })

    // Calculate overall statistics
    const overallStats = {
      totalHands: formattedGames.length,
      totalBet: formattedGames.reduce((sum, game) => sum + game.betAmount, 0),
      totalWin: formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK')
        .reduce((sum, game) => sum + (game.winAmount || 0), 0),
      netProfit: formattedGames.reduce((sum, game) => sum + (game.netProfit || 0), 0),
      winRate: formattedGames.length > 0 ? 
        (formattedGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').length / formattedGames.length) * 100 : 0,
      blackjacks: formattedGames.filter(g => g.isBlackjack).length,
      busts: formattedGames.filter(g => g.isBust).length
    }

    console.log('✅ History API success')

    const responseData = { 
      games: formattedGames,
      sessions: formattedSessions,
      overallStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
    
    // Cache the response in Redis (2 minutes TTL)
    if (isRedisConnected()) {
      await cacheSet(cacheKey, responseData, CACHE_TTL.HISTORY)
      console.log('✅ History cached in Redis')
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('❌ Error fetching game history:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch game history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}