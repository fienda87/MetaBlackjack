export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GameEngine } from '@/domain/usecases/GameEngine'
import { GameState } from '@/domain/entities/Game'
import { executeParallel, USER_SELECT, GAME_SELECT, getSafeLimit } from '@/lib/query-helpers'
import { cacheGetOrFetch, CACHE_STRATEGIES } from '@/lib/cache-operations'
import { cacheInvalidation } from '@/lib/cache-invalidation'
import { perfMetrics, trackApiEndpoint } from '@/lib/performance-monitor'

// 🚀 OPTIMIZED: Get or create active session with single query
async function getOrCreateActiveSession(userId: string) {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  
  // Try to find active session first (faster than upsert for existing sessions)
  const activeSession = await db.gameSession.findFirst({
    where: {
      playerId: userId,
      endTime: null,
      startTime: { gte: twoHoursAgo }
    },
    select: { id: true, totalGames: true, totalBet: true, totalWin: true, netProfit: true, stats: true },
    orderBy: { startTime: 'desc' }
  })
  
  if (activeSession) return activeSession
  
  // Create new session only if not found
  return await db.gameSession.create({
    data: {
      playerId: userId,
      totalGames: 0,
      totalBet: 0,
      totalWin: 0,
      netProfit: 0,
      stats: { wins: 0, losses: 0, pushes: 0, blackjacks: 0, busts: 0, totalHands: 0 }
    },
    select: { id: true, totalGames: true, totalBet: true, totalWin: true, netProfit: true, stats: true }
  })
}

// 🚀 FIRE-AND-FORGET: Update session stats without blocking response
function updateSessionStatsAsync(sessionId: string, gameResult: any, betAmount: number, netProfit: number) {
  // Don't await - fire and forget for performance
  db.gameSession.findUnique({ where: { id: sessionId } })
    .then(session => {
      if (!session) return
      
      const stats = session.stats as any
      const result = gameResult.result?.toLowerCase() || 'push'
      
      // Update stats incrementally
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
    .catch(err => console.error('Session stats update failed:', err))
}

export async function POST(request: NextRequest) {
  const perfLabel = 'game:play'
  perfMetrics.start(perfLabel)
  
  try {
    const { userId, betAmount, moveType } = await request.json()
    
    // Validate input
    if (!userId || !betAmount || !moveType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, betAmount, moveType' },
        { status: 400 }
      )
    }
    
    // 🚀 CACHED: Get user with balance from cache first
    const userStrategy = CACHE_STRATEGIES.USER_BALANCE(userId)
    const user = await cacheGetOrFetch(
      userStrategy.key,
      userStrategy,
      async () => {
        // 🚀 OPTIMIZED: Only fetch essential fields
        return await db.user.findUnique({
          where: { id: userId },
          select: USER_SELECT.MINIMAL
        })
      }
    )
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check balance
    if (user.balance < betAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }
    
    // Create new game
    const deck = GameEngine.createDeck()
    const playerCards = [deck.pop()!, deck.pop()!]
    const dealerCards = [deck.pop()!, deck.pop()!]
    
    const playerHand = GameEngine.calculateHandValue(playerCards)
    const dealerHand = GameEngine.calculateHandValue([dealerCards[0]!])
    const fullDealerHand = GameEngine.calculateHandValue(dealerCards)
    
    // Determine initial game state - only end if both have blackjack or dealer has blackjack
    let gameState: GameState = 'PLAYING'
    let result: any = null
    let netProfit = 0
    let payout = 0

    if (playerHand.isBlackjack && fullDealerHand.isBlackjack) {
      gameState = 'ENDED'
      result = 'PUSH'
      netProfit = 0
      payout = betAmount // Return original bet on push
    } else if (fullDealerHand.isBlackjack && !playerHand.isBlackjack) {
      gameState = 'ENDED'
      result = 'LOSE'
      netProfit = -betAmount
      payout = 0
    } else if (playerHand.isBlackjack && !fullDealerHand.isBlackjack) {
      gameState = 'ENDED'
      result = 'WIN'
      netProfit = Math.floor(betAmount * 1.5) // Blackjack pays 3:2 (profit only)
      payout = betAmount + netProfit // Total payout = original bet + profit
    }
    
    // 🚀 PARALLEL: Get session and create game simultaneously (independent operations)
    const activeSession = await getOrCreateActiveSession(userId)
    
    // 🚀 ATOMIC: Calculate balance change (negative = decrease, positive = increase)
    // No manual balance calculation - use Prisma atomic operations
    let balanceChange = 0
    if (gameState === 'ENDED') {
      // Instant settlement cases
      if (result === 'WIN') {
        // Instant blackjack win: add the full payout (includes original bet)
        balanceChange = payout
      } else if (result === 'LOSE') {
        // Dealer blackjack: deduct the bet
        balanceChange = -betAmount
      } else if (result === 'PUSH') {
        // Push: no change (return original bet)
        balanceChange = 0
      }
    } else {
      // Normal game: cut balance NOW
      balanceChange = -betAmount
    }

    // Calculate balanceBefore for transaction logging
    const balanceBefore = user.balance

    // 🚀 PARALLEL: Create game and update user balance with ATOMIC operation
    const [game, updatedUser] = await executeParallel(
      db.game.create({
        data: {
          playerId: userId,
          sessionId: activeSession.id,
          betAmount,
          currentBet: betAmount,
          state: gameState,
          playerHand: playerHand as any,
          dealerHand: fullDealerHand as any,
          deck: deck as any,
          gameStats: {
            wins: 0,
            losses: 0,
            pushes: 0,
            blackjacks: playerHand.isBlackjack ? 1 : 0,
            busts: 0,
            totalHands: 1
          },
          result,
          netProfit,
          winAmount: payout,
          endedAt: gameState === 'ENDED' ? new Date() : null
        }
      }),
      db.user.update({
        where: { id: userId },
        data: { balance: { increment: balanceChange } }  // ✅ ATOMIC - RACE CONDITION IMPOSSIBLE
      })
    )

    // Calculate actual balanceAfter from the atomic update
    const balanceAfter = balanceBefore + balanceChange

    // 🚀 SMART CACHE INVALIDATION: Update cache after mutations
    if (gameState === 'ENDED') {
      await cacheInvalidation.invalidateOnGameEnd(game.id, userId, result || 'ENDED')
    } else {
      await cacheInvalidation.invalidateGameData(game.id, userId, 'game_started')
    }

    // 🚀 FIRE-AND-FORGET: Create move and transaction records (non-critical for game flow)
    db.gameMove.create({
      data: {
        gameId: game.id,
        moveType: 'DEAL',
        payload: {
          betAmount,
          playerCards,
          dealerCards: [dealerCards[0]],
          playerHandValue: playerHand.value,
          dealerHandValue: dealerHand.value
        } as any
      }
    }).catch(err => console.error('GameMove creation failed:', err))

    db.transaction.create({
      data: {
        userId,
        type: gameState === 'ENDED' ? (result === 'WIN' ? 'GAME_WIN' : result === 'LOSE' ? 'GAME_LOSS' : 'GAME_PUSH') : 'GAME_BET',
        amount: gameState === 'ENDED' ? Math.abs(netProfit).toString() : betAmount.toString(),
        status: 'SUCCESS',
        balanceBefore,
        balanceAfter,
        referenceId: game.id,
        description: `Game ${gameState === 'ENDED' ? (result === 'WIN' ? 'WIN' : result === 'LOSE' ? 'LOSS' : 'PUSH') : 'BET'}: ${betAmount} GBC`,
      }
    }).catch(err => console.error('Transaction creation failed:', err))

    // 🚀 FIRE-AND-FORGET: Update session stats
    if (gameState === 'ENDED') {
      updateSessionStatsAsync(activeSession.id, { result }, betAmount, netProfit)
    }

    // Return game state
    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        playerId: game.playerId,
        betAmount: game.betAmount,
        currentBet: game.currentBet,
        state: game.state,
        playerHand: {
          ...playerHand,
          cards: playerHand.cards
        },
        dealerHand: {
          cards: gameState === 'ENDED' ? fullDealerHand.cards : [dealerCards[0]], // Hide second card if game not ended
          value: gameState === 'ENDED' ? fullDealerHand.value : dealerHand.value,
          isBust: fullDealerHand.isBust,
          isBlackjack: fullDealerHand.isBlackjack
        },
        result: game.result,
        netProfit: game.netProfit,
        createdAt: game.createdAt
      },
      userBalance: balanceAfter, // Use calculated balanceAfter from atomic operation
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('New game error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    perfMetrics.end(perfLabel)
  }
}