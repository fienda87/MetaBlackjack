// Fast game action endpoint - optimized version
// Response time target: < 100ms for most actions

import { NextRequest, NextResponse } from 'next/server'
import { fetchGameData, updateUserBalance, finalizeGame } from '@/lib/game-optimization'
import { GameEngine } from '@/domain/usecases/GameEngine'
import { calculateGameResult } from '@/lib/game-logic'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { corsMiddleware, getSecurityHeaders } from '@/lib/cors'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // CORS and rate limiting (fast checks)
    const cors = corsMiddleware(request)
    if (cors instanceof NextResponse) return cors
    if (!cors.isAllowedOrigin) {
      return NextResponse.json(
        { error: 'CORS policy violation' },
        { status: 403, headers: cors.headers }
      )
    }

    const rateLimit = await rateLimitMiddleware(request, 'game')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { ...cors.headers, ...rateLimit.headers } }
      )
    }

    // Skip auth in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Parse body
    const { gameId, action, userId } = await request.json()
    
    if (!gameId || !action || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: cors.headers }
      )
    }

    // Validate action
    const validActions = ['hit', 'stand', 'double_down']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400, headers: cors.headers }
      )
    }

    // OPTIMIZED: Fetch all data in parallel (single database round-trip)
    const { game, user, session } = await fetchGameData(gameId, userId)
    
    if (!game || !user) {
      return NextResponse.json(
        { error: 'Game or user not found' },
        { status: 404, headers: cors.headers }
      )
    }

    if (game.playerId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403, headers: cors.headers }
      )
    }

    if (game.state !== 'PLAYING') {
      return NextResponse.json(
        { error: 'Game not in PLAYING state' },
        { status: 400, headers: cors.headers }
      )
    }

    // Extract game data
    let playerCards = game.playerHand.cards || []
    let dealerCards = game.dealerHand.cards || []
    let deck = game.deck || []
    let finalGameState = game.state
    let result: string | null = null
    let netProfit = 0

    // Process action (in-memory, fast)
    switch (action) {
      case 'hit':
        const newCard = deck.pop()
        if (!newCard) {
          return NextResponse.json(
            { error: 'No cards left' },
            { status: 400, headers: cors.headers }
          )
        }
        playerCards.push(newCard)
        break

      case 'stand':
        // Dealer plays
        let dealerHand = GameEngine.calculateHandValue(dealerCards)
        while (dealerHand.value < 17 && deck.length > 0) {
          const card = deck.pop()
          if (!card) break
          dealerCards.push(card)
          dealerHand = GameEngine.calculateHandValue(dealerCards)
        }
        break

      case 'double_down':
        if (playerCards.length !== 2) {
          return NextResponse.json(
            { error: 'Can only double down with 2 cards' },
            { status: 400, headers: cors.headers }
          )
        }
        if (user.balance < game.currentBet) {
          return NextResponse.json(
            { error: 'Insufficient balance' },
            { status: 400, headers: cors.headers }
          )
        }
        const doubleCard = deck.pop()
        if (!doubleCard) {
          return NextResponse.json(
            { error: 'No cards left' },
            { status: 400, headers: cors.headers }
          )
        }
        playerCards.push(doubleCard)
        game.currentBet = game.currentBet * 2
        break
    }

    // Calculate hands
    const newPlayerHand = GameEngine.calculateHandValue(playerCards)
    const newDealerHand = GameEngine.calculateHandValue(dealerCards)

    // Check game end
    const playerBust = newPlayerHand.isBust
    
    if (playerBust) {
      finalGameState = 'ENDED'
      result = 'LOSE'
      netProfit = -game.currentBet
    } else if (action === 'stand' || (action === 'double_down' && !newPlayerHand.isBust)) {
      finalGameState = 'ENDED'
      const gameResult = calculateGameResult(
        newPlayerHand,
        newDealerHand,
        game.currentBet,
        game.insuranceBet || 0,
        newDealerHand.isBlackjack,
        false
      )
      result = gameResult.result.toUpperCase()
      netProfit = gameResult.winAmount - game.currentBet
    }

    // Prepare update data
    const gameUpdateData = {
      playerHand: newPlayerHand,
      dealerHand: newDealerHand,
      deck,
      currentBet: game.currentBet,
      state: finalGameState,
      result,
      netProfit,
      endedAt: finalGameState === 'ENDED' ? new Date() : null
    }

    const newBalance = user.balance + netProfit
    
    // OPTIMIZED: Single transaction for all updates
    if (finalGameState === 'ENDED') {
      await finalizeGame(gameId, userId, gameUpdateData, {
        userId,
        type: result === 'WIN' || result === 'BLACKJACK' ? 'GAME_WIN' : 'GAME_LOSS',
        amount: Math.abs(netProfit),
        description: `Game ${result?.toLowerCase()} - Blackjack`,
        balanceBefore: user.balance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        metadata: { gameId, action }
      })
      
      await updateUserBalance(userId, newBalance)
    } else {
      // Just update game (no transaction needed)
      await finalizeGame(gameId, userId, gameUpdateData, null as any)
    }

    const processingTime = Date.now() - startTime

    // Return response
    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        playerId: game.playerId,
        betAmount: game.betAmount,
        currentBet: game.currentBet,
        state: finalGameState,
        playerHand: newPlayerHand,
        dealerHand: {
          cards: finalGameState === 'ENDED' ? newDealerHand.cards : [dealerCards[0]],
          value: finalGameState === 'ENDED' ? newDealerHand.value : GameEngine.calculateHandValue([dealerCards[0]]).value,
          isBust: newDealerHand.isBust,
          isBlackjack: newDealerHand.isBlackjack
        },
        result,
        netProfit,
        createdAt: game.createdAt
      },
      userBalance: newBalance,
      timestamp: new Date().toISOString(),
      _debug: {
        processingTime: `${processingTime}ms`
      }
    }, {
      headers: {
        ...cors.headers,
        ...getSecurityHeaders(),
        ...rateLimit.headers,
        'X-Processing-Time': `${processingTime}ms`
      }
    })

  } catch (error) {
    console.error('Fast game action error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: getSecurityHeaders() }
    )
  }
}
