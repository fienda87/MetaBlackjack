export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
// Static imports for critical path (must be available immediately)
import { sanitizeSqlInput } from '@/lib/validation'
import { verifyJWT } from '@/lib/security'
import { perfMetrics } from '@/lib/performance-monitor'

// Dynamic imports for heavy dependencies (loaded on demand)
const getGameLogic = async () => {
  return {
    GameEngine: (await import('@/domain/usecases/GameEngine')).GameEngine,
  }
}

const getRateLimit = async () => {
  const rateLimitModule = await import('@/lib/rate-limit')
  return rateLimitModule.rateLimitMiddleware
}

const getCors = async () => {
  const corsModule = await import('@/lib/cors')
  return {
    corsMiddleware: corsModule.corsMiddleware,
    getSecurityHeaders: corsModule.getSecurityHeaders,
  }
}

const getQueryHelpers = async () => {
  const queryHelpersModule = await import('@/lib/query-helpers')
  return {
    executeParallel: queryHelpersModule.executeParallel,
    USER_SELECT: queryHelpersModule.USER_SELECT,
    GAME_SELECT: queryHelpersModule.GAME_SELECT,
    getSafeLimit: queryHelpersModule.getSafeLimit,
  }
}

const getCacheOperations = async () => {
  const cacheOperationsModule = await import('@/lib/cache-operations')
  return {
    cacheGetOrFetch: cacheOperationsModule.cacheGetOrFetch,
    CACHE_STRATEGIES: cacheOperationsModule.CACHE_STRATEGIES,
  }
}

const getCacheInvalidation = async () => {
  const cacheInvalidationModule = await import('@/lib/cache-invalidation')
  return cacheInvalidationModule.cacheInvalidation
}

const getDb = async () => {
  const dbModule = await import('@/lib/db')
  return dbModule.db
}

// 🚀 FIRE-AND-FORGET: Update session stats without blocking response
function updateSessionStatsAction(db: any, sessionId: string, gameResult: any, betAmount: number, netProfit: number) {
  db.gameSession.findUnique({ where: { id: sessionId } })
    .then((session: any) => {
      if (!session) return

      const stats = session.stats as any
      const result = gameResult.result?.toLowerCase() || 'push'

      if (result === 'win') stats.wins = (stats.wins || 0) + 1
      else if (result === 'lose') stats.losses = (stats.losses || 0) + 1
      else if (result === 'push') stats.pushes = (stats.pushes || 0) + 1
      else if (result === 'blackjack') {
        stats.blackjacks = (stats.blackjacks || 0) + 1
        stats.wins = (stats.wins || 0) + 1
      }

      stats.totalHands = (stats.totalHands || 0) + 1

      return db.gameSession.update({
        where: { id: sessionId },
        data: {
          totalGames: session.totalGames + 1,
          totalBet: session.totalBet + betAmount,
          totalWin: netProfit > 0 ? session.totalWin + (betAmount + netProfit) : session.totalWin,
          netProfit: session.netProfit + netProfit,
          stats
        }
      })
    })
    .catch((err: any) => console.error('Session stats update failed:', err))
}

export async function POST(request: NextRequest) {
  const perfLabel = 'game:action'
  perfMetrics.start(perfLabel)

  // 🚀 SKIP MIDDLEWARE IN DEV for maximum speed
  let cors: any = { isAllowedOrigin: true, headers: {} }
  let rateLimit: any = { success: true, headers: {} }
  let decodedToken: any = null
  let getSecurityHeadersFn: any = () => ({})

  try {
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (!isDevelopment) {
      // Load dependencies dynamically only when needed
      const [corsMod, rateLimitMod, { getSecurityHeaders }] = await Promise.all([
        getCors(),
        getRateLimit(),
        import('@/lib/cors')
      ])
      getSecurityHeadersFn = getSecurityHeaders

      // CORS check (production only)
      cors = corsMod.corsMiddleware(request)
      if (cors instanceof NextResponse) return cors
      if (!cors.isAllowedOrigin) {
        return NextResponse.json({ error: 'CORS policy violation' }, { status: 403, headers: cors.headers })
      }

      // Rate limiting (production only)
      rateLimit = await rateLimitMod(request, 'game')
      if (!rateLimit.success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { ...cors.headers, ...rateLimit.headers } }
        )
      }

      // Authentication (production only)
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401, headers: { ...cors.headers, ...getSecurityHeadersFn() } })
      }

      const token = authHeader.substring(7)
      try {
        decodedToken = await verifyJWT(token)
      } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers: { ...cors.headers, ...getSecurityHeadersFn() } })
      }
    }

    // Load dependencies dynamically for game logic
    const [
      { GameEngine },
      { executeParallel, USER_SELECT, GAME_SELECT },
      { cacheGetOrFetch, CACHE_STRATEGIES },
      cacheInvalidMod,
      db
    ] = await Promise.all([
      getGameLogic(),
      getQueryHelpers(),
      getCacheOperations(),
      getCacheInvalidation(),
      getDb()
    ])

    const cacheInvalidation = cacheInvalidMod

    // 🚀 Parse request (no sanitization in dev for speed)
    const body = await request.json()
    const { gameId, action, userId, payload } = isDevelopment ? body : sanitizeSqlInput(body)

    // 🚀 Fast validation
    if (!gameId || !action || !userId) {
      return NextResponse.json({ error: 'Missing required fields: gameId, action, userId' }, { status: 400 })
    }

    if (!isDevelopment && decodedToken && decodedToken.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }

    const validActions = ['hit', 'stand', 'double_down', 'insurance', 'surrender']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // 🚀 CACHED + PARALLEL: Get game and user simultaneously with caching
    const [game, user] = await executeParallel(
      cacheGetOrFetch(
        CACHE_STRATEGIES.GAME_STATE(gameId).key,
        CACHE_STRATEGIES.GAME_STATE(gameId),
        async () => {
          return await db.game.findUnique({
            where: { id: gameId },
            select: GAME_SELECT.ACTION
          })
        }
      ),
      cacheGetOrFetch(
        CACHE_STRATEGIES.USER_BALANCE(userId).key,
        CACHE_STRATEGIES.USER_BALANCE(userId),
        async () => {
          return await db.user.findUnique({
            where: { id: userId },
            select: USER_SELECT.MINIMAL
          })
        }
      )
    )

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (game.playerId !== userId) return NextResponse.json({ error: 'Unauthorized access to game' }, { status: 403 })
    if (game.state !== 'PLAYING') return NextResponse.json({ error: 'Game is not in playing state' }, { status: 400 })

    let updatedGame = { ...game }
    let deck = [...game.deck as any[]]
    let playerCards = [...(game.playerHand as any).cards]
    let dealerCards = [...(game.dealerHand as any).cards]

    // Declare variables that might be used in switch
    let result: string | null = null
    let netProfit: number = 0
    let finalGameState = 'PLAYING'
    let payout = 0

    // Process action
    switch (action) {
      case 'hit':
        const newCard = deck.pop()
        if (!newCard) {
          return NextResponse.json(
            { error: 'No cards left in deck' },
            { status: 400, headers: cors.headers }
          )
        }
        playerCards.push(newCard)
        break

      case 'stand':
        // Smart dealer plays against player hand
        let dealerHand = GameEngine.calculateHandValue(dealerCards)
        const playerValue = GameEngine.calculateHandValue(playerCards).value

        // Smart dealer logic - try to beat player without busting
        while (dealerHand.value < 17 && deck.length > 0) {
          const card = deck.pop()
          if (!card) break // No more cards in deck
          dealerCards.push(card)
          dealerHand = GameEngine.calculateHandValue(dealerCards)
        }

        // If dealer has less than player and player <= 21, try to get closer
        if (dealerHand.value < playerValue && playerValue <= 21 && dealerHand.value >= 17 && deck.length > 0) {
          // Consider hitting on 17 if player is much higher
          if (dealerHand.value === 17 && playerValue >= 20) {
            // Risky move - 30% chance to hit on 17 against player's 20+
            if (Math.random() < 0.3) {
              const card = deck.pop()
              if (card) {
                dealerCards.push(card)
                dealerHand = GameEngine.calculateHandValue(dealerCards)
              }
            }
          }
          // Consider hitting on 18 if player has 19-21
          else if (dealerHand.value === 18 && playerValue >= 19 && deck.length > 0) {
            // Very risky move - 15% chance to hit on 18 against player's 19+
            if (Math.random() < 0.15) {
              const card = deck.pop()
              if (card) {
                dealerCards.push(card)
                dealerHand = GameEngine.calculateHandValue(dealerCards)
              }
            }
          }
        }
        break

      case 'double_down':
        // Validate: Can only double down with exactly 2 cards
        if (playerCards.length !== 2) {
          return NextResponse.json(
            { error: 'Can only double down with 2 cards' },
            { status: 400 }
          )
        }

        // Validate: User must have enough balance for additional bet
        const additionalBet = game.currentBet
        if (user.balance < additionalBet) {
          return NextResponse.json(
            { error: 'Insufficient balance for double down' },
            { status: 400, headers: cors.headers }
          )
        }

        // Deduct additional bet from user balance immediately
        await db.user.update({
          where: { id: userId },
          data: { balance: user.balance - additionalBet }
        })

        // Update user object for later calculations
        user.balance = user.balance - additionalBet

        // Draw one card
        const doubleCard = deck.pop()
        if (!doubleCard) {
          // Refund if no cards available
          await db.user.update({
            where: { id: userId },
            data: { balance: user.balance + additionalBet }
          })
          return NextResponse.json(
            { error: 'No cards left in deck' },
            { status: 400, headers: cors.headers }
          )
        }

        playerCards.push(doubleCard)
        updatedGame.currentBet = game.currentBet * 2

        // After double down, player cannot take more actions
        // Automatically trigger dealer play (like STAND)
        let ddDealerHand = GameEngine.calculateHandValue(dealerCards)

        while (ddDealerHand.value < 17 && deck.length > 0) {
          const card = deck.pop()
          if (!card) break
          dealerCards.push(card)
          ddDealerHand = GameEngine.calculateHandValue(dealerCards)
        }
        break

      case 'insurance':
        // Check if dealer shows Ace
        if (dealerCards.length !== 2 || dealerCards[0].rank !== 'A') {
          return NextResponse.json(
            { error: 'Insurance only available when dealer shows Ace' },
            { status: 400 }
          )
        }
        if (game.hasInsurance) {
          return NextResponse.json(
            { error: 'Insurance already taken' },
            { status: 400 }
          )
        }
        const insuranceBet = Math.floor(game.currentBet / 2)
        if (user.balance < insuranceBet) {
          return NextResponse.json(
            { error: 'Insufficient balance for insurance' },
            { status: 400 }
          )
        }
        updatedGame.insuranceBet = insuranceBet
        updatedGame.hasInsurance = true
        break

      case 'surrender':
        if (playerCards.length !== 2) {
          return NextResponse.json(
            { error: 'Can only surrender with 2 cards' },
            { status: 400 }
          )
        }
        if (game.hasSurrendered) {
          return NextResponse.json(
            { error: 'Already surrendered' },
            { status: 400 }
          )
        }
        updatedGame.hasSurrendered = true
        finalGameState = 'SURRENDERED'
        result = 'SURRENDER'
        payout = Math.floor(game.currentBet / 2)
        netProfit = payout - game.currentBet
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Calculate new hands
    const newPlayerHand = GameEngine.calculateHandValue(playerCards)
    const newDealerHand = GameEngine.calculateHandValue(dealerCards)

    const currentBet = Number.isFinite(Number(updatedGame.currentBet)) ? Number(updatedGame.currentBet) : 0

    const shouldSettle =
      updatedGame.hasSurrendered ||
      action === 'stand' ||
      action === 'double_down' ||
      newPlayerHand.isBust

    if (shouldSettle) {
      finalGameState = 'ENDED'

      if (updatedGame.hasSurrendered) {
        result = 'SURRENDER'
      } else if (newPlayerHand.isBust) {
        result = 'LOSE'
      } else if (newDealerHand.isBust) {
        result = 'WIN'
      } else if (newPlayerHand.isBlackjack && !newDealerHand.isBlackjack) {
        result = 'BLACKJACK'
      } else if (newDealerHand.isBlackjack && !newPlayerHand.isBlackjack) {
        result = 'LOSE'
      } else if (newPlayerHand.value > newDealerHand.value) {
        result = 'WIN'
      } else if (newPlayerHand.value < newDealerHand.value) {
        result = 'LOSE'
      } else {
        result = 'PUSH'
      }
    }

    const isSettlement = finalGameState === 'ENDED'

    if (isSettlement) {
      switch (result) {
        case 'WIN':
          payout = currentBet * 2
          break
        case 'BLACKJACK':
          payout = Math.floor(currentBet * 2.5)
          break
        case 'PUSH':
          payout = currentBet
          break
        case 'SURRENDER':
          payout = Math.floor(currentBet / 2)
          break
        case 'LOSE':
        default:
          payout = 0
          break
      }

      if (!Number.isFinite(payout) || Number.isNaN(payout)) {
        payout = 0
      }

      netProfit = payout - currentBet
      if (!Number.isFinite(netProfit) || Number.isNaN(netProfit)) {
        netProfit = 0
      }
    } else {
      netProfit = 0
    }

    // 🚀 PARALLEL: Update game and user balance simultaneously (critical operations)
    const [updatedGameRecord, updatedUser] = await executeParallel(
      db.game.update({
        where: { id: gameId },
        data: {
          playerHand: newPlayerHand as any,
          dealerHand: newDealerHand as any,
          deck: deck as any,
          currentBet: updatedGame.currentBet,
          insuranceBet: updatedGame.insuranceBet,
          state: finalGameState as any,
          hasSurrendered: updatedGame.hasSurrendered,
          hasInsurance: updatedGame.hasInsurance,
          ...(isSettlement
            ? {
                result: result as any,
                netProfit,
                winAmount: payout,
                endedAt: new Date(),
              }
            : {}),
        },
      }),
      isSettlement
        ? db.user.update({
            where: { id: userId },
            data: { balance: { increment: payout } },
            select: { balance: true },
          })
        : Promise.resolve(null)
    )

    const newBalance = isSettlement && updatedUser ? updatedUser.balance : user.balance
    const balanceBefore = user.balance

    // 🚀 SMART CACHE INVALIDATION: Update cache after mutations
    if (isSettlement) {
      await cacheInvalidation.invalidateOnGameEnd(gameId, userId, result || 'ENDED')
    } else {
      await cacheInvalidation.invalidateGameData(gameId, userId, 'game_action')
    }

    // 🚀 FIRE-AND-FORGET: Non-critical records (move, transaction, session stats)
    db.gameMove.create({
      data: {
        gameId,
        moveType: action.toUpperCase(),
        payload: {
          playerCards,
          dealerCards: isSettlement ? dealerCards : [dealerCards[0]],
          playerHandValue: newPlayerHand.value,
          dealerHandValue: isSettlement ? newDealerHand.value : GameEngine.calculateHandValue([dealerCards[0]]).value,
          currentBet: updatedGame.currentBet,
          aceValue: payload?.aceValue
        }
      }
    }).catch(err => console.error('GameMove creation failed:', err))

    if (isSettlement) {
      db.transaction.create({
        data: {
          userId,
          type: result === 'WIN' || result === 'BLACKJACK' ? 'GAME_WIN' : 'GAME_LOSS',
          amount: Math.abs(netProfit).toString(),
          status: 'SUCCESS',
          balanceBefore,
          balanceAfter: newBalance,
          referenceId: gameId,
          description: `Game ${result}: ${updatedGame.currentBet} GBC bet`,
        }
      }).catch(err => console.error('Transaction creation failed:', err))

      if (game.sessionId) {
        updateSessionStatsAction(db, game.sessionId, { result: result || 'LOSE' }, updatedGame.currentBet, netProfit)
      }
    }

    perfMetrics.end(perfLabel)

    return NextResponse.json({
      game: updatedGameRecord,
      userBalance: newBalance,
      result,
      payout,
      netProfit
    })
  }
}
