// @ts-nocheck - Temporary disable type checking 
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GameEngine } from '@/domain/usecases/GameEngine'
import { GameMove, Game, GameState } from '@/domain/entities/Game'

// Helper function to get or create active session
async function getOrCreateActiveSession(userId: string) {
  // Try to find an active session (less than 2 hours old and no end time)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  
  let activeSession = await db.gameSession.findFirst({
    where: {
      playerId: userId,
      endTime: null,
      startTime: {
        gte: twoHoursAgo
      }
    },
    orderBy: {
      startTime: 'desc'
    }
  })
  
  // If no active session, create a new one
  if (!activeSession) {
    activeSession = await db.gameSession.create({
      data: {
        playerId: userId,
        totalGames: 0,
        totalBet: 0,
        totalWin: 0,
        netProfit: 0,
        stats: {
          wins: 0,
          losses: 0,
          pushes: 0,
          blackjacks: 0,
          busts: 0,
          totalHands: 0
        }
      }
    })
  }
  
  return activeSession
}

// Helper function to update session stats
async function updateSessionStats(sessionId: string, gameResult: any, betAmount: number, netProfit: number) {
  const session = await db.gameSession.findUnique({
    where: { id: sessionId }
  })
  
  if (!session) return
  
  const stats = session.stats as any
  const result = gameResult.result?.toLowerCase() || 'push'
  
  // Update stats based on game result
  switch (result) {
    case 'win':
      stats.wins = (stats.wins || 0) + 1
      break
    case 'lose':
      stats.losses = (stats.losses || 0) + 1
      break
    case 'push':
      stats.pushes = (stats.pushes || 0) + 1
      break
    case 'blackjack':
      stats.blackjacks = (stats.blackjacks || 0) + 1
      stats.wins = (stats.wins || 0) + 1
      break
  }
  
  stats.totalHands = (stats.totalHands || 0) + 1
  
  await db.gameSession.update({
    where: { id: sessionId },
    data: {
      totalGames: session.totalGames + 1,
      totalBet: session.totalBet + betAmount,
      totalWin: netProfit > 0 ? session.totalWin + (betAmount + netProfit) : session.totalWin,
      netProfit: session.netProfit + netProfit,
      stats
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { userId, betAmount, moveType } = await request.json()

    // Validate input
    if (!userId || !betAmount || !moveType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, betAmount, moveType' },
        { status: 400 }
      )
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId }
    })

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

    // Debug log for blackjack detection
    console.log('🃏 Initial deal:', {
      playerCards: playerCards.map(c => `${c.rank}${c.suit[0].toUpperCase()}`),
      playerValue: playerHand.value,
      playerCardCount: playerHand.cards.length,
      isBlackjack: playerHand.isBlackjack,
      dealerCards: dealerCards.map(c => `${c.rank}${c.suit[0].toUpperCase()}`),
      dealerValue: fullDealerHand.value,
      dealerCardCount: fullDealerHand.cards.length,
      dealerIsBlackjack: fullDealerHand.isBlackjack
    })

    // Determine initial game stateP
    // Game should start in PLAYING state regardless of initial cards
    // Only end game immediately if BOTH have blackjack or dealer has blackjack
    let gameState: GameState = 'PLAYING'
    let result: any = null
    let netProfit = 0

    // Check for immediate game end conditions ONLY
    if (playerHand.isBlackjack && fullDealerHand.isBlackjack) {
      // Both have blackjack - instant push
      gameState = 'ENDED'
      result = 'PUSH'
      netProfit = 0
    } else if (fullDealerHand.isBlackjack && !playerHand.isBlackjack) {
      // Only dealer has blackjack - instant loss
      gameState = 'ENDED'
      result = 'LOSE'
      netProfit = -betAmount
    }
    // If only player has blackjack, let them play - they'll win when they stand
    // This gives them the option to see the game play out

    // Create or get active session for this user
    const activeSession = await getOrCreateActiveSession(userId)
    
    // Create game record
    const game = await db.game.create({
      data: {
        playerId: userId,
        sessionId: activeSession.id,
        betAmount,
        currentBet: betAmount,
        state: gameState,
        playerHand,
        dealerHand: fullDealerHand,
        deck,
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
        endedAt: gameState === 'ENDED' ? new Date() : null
      }
    })

    // Create initial move
    await db.gameMove.create({
      data: {
        gameId: game.id,
        moveType: 'DEAL',
        payload: {
          betAmount,
          playerCards,
          dealerCards: [dealerCards[0]], // Hide second card initially
          playerHandValue: playerHand.value,
          dealerHandValue: dealerHand.value
        }
      }
    })

    // Update user balance and create transaction
    let newBalance = user.balance
    if (gameState === 'ENDED') {
      newBalance = user.balance + netProfit
      
      await db.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      })

      // Create transaction
      await db.transaction.create({
        data: {
          userId,
          type: result === 'WIN' || result === 'BLACKJACK' ? 'GAME_WIN' : 'GAME_LOSS',
          amount: Math.abs(netProfit),
          description: `Game ${result.toLowerCase()} - Blackjack game`,
          balanceBefore: user.balance,
          balanceAfter: newBalance,
          status: 'COMPLETED',
          referenceId: game.id
        }
      })
      
      // Update session statistics
      await updateSessionStats(activeSession.id, { result }, betAmount, netProfit)
    } else {
      // Deduct bet amount
      newBalance = user.balance - betAmount
      await db.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      })

      // Create bet transaction
      await db.transaction.create({
        data: {
          userId,
          type: 'GAME_BET',
          amount: betAmount,
          description: 'Blackjack bet',
          balanceBefore: user.balance,
          balanceAfter: newBalance,
          status: 'COMPLETED',
          referenceId: game.id
        }
      })
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
      userBalance: newBalance,
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
  }
}