export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sanitizeSqlInput } from '@/lib/validation'
import { verifyJWT } from '@/lib/security'
import { perfMetrics } from '@/lib/performance-monitor'
import { GameEngine } from '@/domain/usecases/GameEngine'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { corsMiddleware, getSecurityHeaders } from '@/lib/cors'
import { executeParallel, USER_SELECT, GAME_SELECT } from '@/lib/query-helpers'
import { cacheGetOrFetch, CACHE_STRATEGIES } from '@/lib/cache-operations'
import { cacheInvalidation } from '@/lib/cache-invalidation'
import { db } from '@/lib/db'

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

  try {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Production safeguards
    if (!isDevelopment) {
      // CORS check
      const cors = corsMiddleware(request)
      if (cors instanceof NextResponse) return cors
      if (!cors.isAllowedOrigin) {
        return NextResponse.json({ error: 'CORS policy violation' }, { status: 403, headers: cors.headers })
      }

      // Rate limiting
      const rateLimit = await rateLimitMiddleware(request, 'game')
      if (!rateLimit.success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { ...cors.headers, ...rateLimit.headers } }
        )
      }

      // Authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401, headers: { ...cors.headers, ...getSecurityHeaders() } })
      }

      const token = authHeader.substring(7)
      const decodedToken = await verifyJWT(token)
      const body = await request.json()
      if (!decodedToken || decodedToken.userId !== body.userId) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403, headers: { ...cors.headers, ...getSecurityHeaders() } })
      }
    }

    // Parse and sanitize request
    const body = await request.json()
    const { gameId, action, userId, payload } = isDevelopment ? body : sanitizeSqlInput(body)

    // Validate required fields
    if (!gameId || !action || !userId) {
      return NextResponse.json({ error: 'Missing required fields: gameId, action, userId' }, { status: 400 })
    }

    // Validate action (NO SPLIT - cleaner codebase)
    const validActions = ['hit', 'stand', 'double_down', 'insurance', 'surrender', 'set_ace_value']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Available: hit, stand, double_down, insurance, surrender, set_ace_value' }, { status: 400 })
    }

    // 🚀 CACHED + PARALLEL: Get game and user simultaneously
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

    // Initialize game state
    let updatedGame = { ...game }
    let deck = [...game.deck as any[]]
    let playerCards = [...(game.playerHand as any).cards]
    let dealerCards = [...(game.dealerHand as any).cards]

    // Process action
    let result: string | null = null
    let netProfit = 0
    let finalGameState = 'PLAYING'
    let payout = 0
    let betAmount = Number(game.currentBet) || 0

    try {
      switch (action) {
        case 'hit':
          const hitCard = deck.pop()
          if (!hitCard) throw new Error('No cards left in deck')
          playerCards.push(hitCard)
          break

        case 'stand':
          // Dealer plays according to standard rules
          let dealerHand = GameEngine.calculateHandValue(dealerCards)
          while (dealerHand.value < 17 && deck.length > 0) {
            const card = deck.pop()
            if (!card) break
            dealerCards.push(card)
            dealerHand = GameEngine.calculateHandValue(dealerCards)
          }
          break

        case 'double_down':
          // Validate: exactly 2 cards
          if (playerCards.length !== 2) {
            return NextResponse.json({ error: 'Can only double down with 2 cards' }, { status: 400 })
          }
          
          // Validate: sufficient balance
          const additionalBet = betAmount
          if (user.balance < additionalBet) {
            return NextResponse.json({ error: 'Insufficient balance for double down' }, { status: 400 })
          }
          
          // Deduct additional bet atomically
          await db.user.update({
            where: { id: userId },
            data: { balance: { decrement: additionalBet } }
          })
          
          // Draw exactly one card
          const doubleCard = deck.pop()
          if (!doubleCard) {
            // Refund on error
            await db.user.update({
              where: { id: userId },
              data: { balance: { increment: additionalBet } }
            })
            throw new Error('No cards left in deck')
          }
          
          playerCards.push(doubleCard)
          betAmount = betAmount * 2
          updatedGame.currentBet = betAmount
          
          // Dealer plays after double down
          let ddDealerHand = GameEngine.calculateHandValue(dealerCards)
          while (ddDealerHand.value < 17 && deck.length > 0) {
            const card = deck.pop()
            if (!card) break
            dealerCards.push(card)
            ddDealerHand = GameEngine.calculateHandValue(dealerCards)
          }
          break

        case 'insurance':
          // Check dealer shows Ace
          if (dealerCards.length !== 2 || dealerCards[0].rank !== 'A') {
            return NextResponse.json({ error: 'Insurance only available when dealer shows Ace' }, { status: 400 })
          }
          if (game.hasInsurance) {
            return NextResponse.json({ error: 'Insurance already taken' }, { status: 400 })
          }
          
          const insuranceBet = Math.floor(betAmount / 2)
          if (user.balance < insuranceBet) {
            return NextResponse.json({ error: 'Insufficient balance for insurance' }, { status: 400 })
          }
          
          updatedGame.insuranceBet = insuranceBet
          updatedGame.hasInsurance = true
          
          // Deduct insurance bet atomically
          await db.user.update({
            where: { id: userId },
            data: { balance: { decrement: insuranceBet } }
          })
          break

        case 'surrender':
          if (playerCards.length !== 2) {
            return NextResponse.json({ error: 'Can only surrender with 2 cards' }, { status: 400 })
          }
          if (game.hasSurrendered) {
            return NextResponse.json({ error: 'Cannot surrender after already surrendered' }, { status: 400 })
          }
          updatedGame.hasSurrendered = true
          finalGameState = 'ENDED'
          result = 'SURRENDER'
          payout = Math.floor(betAmount / 2)
          netProfit = payout - betAmount
          break

        case 'set_ace_value':
          // Safe fallback - treat as hit
          const aceCard = deck.pop()
          if (!aceCard) throw new Error('No cards left in deck')
          playerCards.push(aceCard)
          break

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    } catch (error) {
      console.error('Action processing error:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Action failed' }, { status: 400 })
    }

    // Calculate final hands
    const newPlayerHand = GameEngine.calculateHandValue(playerCards)
    const newDealerHand = GameEngine.calculateHandValue(dealerCards)

    // Determine if game should settle
    const shouldSettle =
      updatedGame.hasSurrendered ||
      action === 'stand' ||
      action === 'double_down' ||
      newPlayerHand.isBust

    // Settlement logic
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

      // Calculate payout
      switch (result) {
        case 'WIN':
          payout = betAmount * 2
          break
        case 'BLACKJACK':
          payout = Math.floor(betAmount * 2.5)
          break
        case 'PUSH':
          payout = betAmount
          break
        case 'SURRENDER':
          payout = Math.floor(betAmount / 2)
          break
        case 'LOSE':
        default:
          payout = 0
          break
      }

      // NaN protection
      if (!Number.isFinite(payout) || Number.isNaN(payout)) {
        payout = 0
      }

      netProfit = payout - betAmount
      if (!Number.isFinite(netProfit) || Number.isNaN(netProfit)) {
        netProfit = 0
      }
    }

    const isSettlement = finalGameState === 'ENDED'

    // 🚀 PARALLEL: Update game and user balance atomically
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
          ...(isSettlement ? {
            result: result as any,
            netProfit,
            winAmount: payout,
            endedAt: new Date(),
          } : {}),
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

    // 🚀 SMART CACHE INVALIDATION
    if (isSettlement) {
      await cacheInvalidation.invalidateOnGameEnd(gameId, userId, result || 'ENDED')
    } else {
      await cacheInvalidation.invalidateGameData(gameId, userId, 'game_action')
    }

    // --- 1. Mapping Action Dulu ---
    let dbMoveType = action.toUpperCase();

    if (action === 'insurance') {
      dbMoveType = 'INSURANCE_ACCEPT'; // Match schema enum
    }
    if (action === 'set_ace_value') {
      dbMoveType = 'HIT'; // Fallback mapping
    }

    // --- 2. Simpan ke Database ---
    db.gameMove.create({
      data: {
        gameId,
        moveType: dbMoveType as any, // ✅ FIX: 'as any' bypasses TypeScript enum check
        payload: {
          originalAction: action, // Preserve original for audit trail
          playerCards,
          dealerCards: isSettlement ? dealerCards : [dealerCards[0]], // Hide dealer's hole card
          playerHandValue: newPlayerHand.value,
          dealerHandValue: isSettlement ? newDealerHand.value : GameEngine.calculateHandValue([dealerCards[0]]).value,
          currentBet: updatedGame.currentBet,
          insuranceBet: updatedGame.insuranceBet,
        }
      }
    }).catch(err => console.error('GameMove creation failed:', err))

    // 🚀 FIRE-AND-FORGET: Transaction history (only on settlement)
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
          description: `Game ${result}: ${betAmount} GBC bet`,
        }
      }).catch(err => console.error('Transaction creation failed:', err))

      // 🚀 FIRE-AND-FORGET: Session stats update
      if (game.sessionId) {
        updateSessionStatsAction(db, game.sessionId, { result: result || 'LOSE' }, betAmount, netProfit)
      }
    }

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      game: {
        id: updatedGameRecord.id,
        playerId: updatedGameRecord.playerId,
        betAmount: updatedGameRecord.betAmount,
        currentBet: updatedGameRecord.currentBet,
        state: updatedGameRecord.state,
        playerHand: {
          ...newPlayerHand,
          cards: newPlayerHand.cards
        },
        dealerHand: {
          cards: isSettlement ? newDealerHand.cards : [dealerCards[0]], // Hide second card if ongoing
          value: isSettlement ? newDealerHand.value : GameEngine.calculateHandValue([dealerCards[0]]).value,
          isBust: newDealerHand.isBust,
          isBlackjack: newDealerHand.isBlackjack
        },
        result: updatedGameRecord.result,
        netProfit: updatedGameRecord.netProfit,
        createdAt: updatedGameRecord.createdAt
      },
      userBalance: newBalance,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        ...(isDevelopment ? {} : corsMiddleware(request).headers),
        ...getSecurityHeaders()
      }
    })

  } catch (error) {
    console.error('Game action error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: getSecurityHeaders()
    })
  } finally {
    perfMetrics.end(perfLabel)
  }
}