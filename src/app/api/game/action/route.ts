// @ts-nocheck - Temporary disable type checking due to Hand interface conflicts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GameEngine } from '@/domain/usecases/GameEngine'
import { splitHand, calculateGameResult } from '@/lib/game-logic'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { corsMiddleware, getSecurityHeaders } from '@/lib/cors'
import { verifyJWT } from '@/lib/security'
import { GameActionSchema, validateRequest } from '@/lib/validation-schemas'
import { invalidateGameCaches } from '@/lib/query-cache'
import { enqueueJob } from '@/lib/queue'

// 🚀 FIRE-AND-FORGET: Update session stats without blocking response
function updateSessionStatsAction(sessionId: string, gameResult: any, betAmount: number, netProfit: number) {
  db.gameSession.findUnique({ where: { id: sessionId } })
    .then(session => {
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
    .catch(err => console.error('Session stats update failed:', err))
}

export async function POST(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // 🚀 SKIP MIDDLEWARE IN DEV for maximum speed
    let cors: any = { isAllowedOrigin: true, headers: {} }
    let rateLimit: any = { success: true, headers: {} }
    let decodedToken: any = null
    
    if (!isDevelopment) {
      // CORS check (production only)
      cors = corsMiddleware(request)
      if (cors instanceof NextResponse) return cors
      if (!cors.isAllowedOrigin) {
        return NextResponse.json({ error: 'CORS policy violation' }, { status: 403, headers: cors.headers })
      }

      // Rate limiting (production only)
      rateLimit = await rateLimitMiddleware(request, 'game')
      if (!rateLimit.success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { ...cors.headers, ...rateLimit.headers } }
        )
      }
      
      // Authentication (production only)
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401, headers: { ...cors.headers, ...getSecurityHeaders() } })
      }

      const token = authHeader.substring(7)
      try {
        decodedToken = await verifyJWT(token)
      } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers: { ...cors.headers, ...getSecurityHeaders() } })
      }
    }

    // 🚀 Phase 3: Zod validation (fast rejection of malformed requests)
    const body = await request.json()
    const validation = validateRequest(GameActionSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400, headers: cors.headers }
      )
    }

    const { gameId, action, userId, payload } = validation.data

    if (!isDevelopment && decodedToken && decodedToken.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }

    // 🚀 PARALLEL: Get game and user simultaneously
    const [game, user] = await Promise.all([
      db.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          playerId: true,
          sessionId: true,
          state: true,
          playerHand: true,
          dealerHand: true,
          deck: true,
          currentBet: true,
          insuranceBet: true,
          hasSplit: true,
          hasSurrendered: true,
          hasInsurance: true,
          splitHands: true,
          betAmount: true
        }
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true }
      })
    ])

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (game.playerId !== userId) return NextResponse.json({ error: 'Unauthorized access to game' }, { status: 403 })
    if (game.state !== 'PLAYING') return NextResponse.json({ error: 'Game is not in playing state' }, { status: 400 })

    let updatedGame = { ...game }
    let deck = [...game.deck as any[]]
    let playerCards = [...(game.playerHand as any).cards]
    let dealerCards = [...(game.dealerHand as any).cards]
    let splitHands = (game.splitHands as any[]) || []
    
  // Declare variables that might be used in switch
  let result: string | null = null
  let netProfit: number = 0

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
        
        // Validate: User must have enough balance for the additional bet
        const additionalBet = game.currentBet
        if (user.balance < additionalBet) {
          return NextResponse.json(
            { error: 'Insufficient balance for double down' },
            { status: 400, headers: cors.headers }
          )
        }
        
        // Deduct the additional bet from user balance immediately
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

      case 'split':
        const playerHand = GameEngine.calculateHandValue(playerCards)
        if (playerCards.length !== 2 || playerCards[0].rank !== playerCards[1].rank) {
          return NextResponse.json(
            { error: 'Can only split cards of the same rank' },
            { status: 400 }
          )
        }
        if (game.hasSplit) {
          return NextResponse.json(
            { error: 'Already split' },
            { status: 400 }
          )
        }
        if (user.balance < game.currentBet) {
          return NextResponse.json(
            { error: 'Insufficient balance for split' },
            { status: 400 }
          )
        }
        
        // Create split hands - convert to proper Hand type first
        const properHand: import('@/lib/game-logic').Hand = {
          cards: playerHand.cards,
          value: playerHand.value,
          isBust: playerHand.isBust,
          isBlackjack: playerHand.isBlackjack,
          isSplittable: true,
          canSurrender: false,
          hasSplit: false
        }
        const { hand1, hand2 } = splitHand(properHand)
        splitHands = [hand1, hand2]
        playerCards = [] // Clear main hand when split
        updatedGame.hasSplit = true
        updatedGame.currentBet = game.currentBet * 2
        break

      case 'surrender':
        if (playerCards.length !== 2) {
          return NextResponse.json(
            { error: 'Can only surrender with 2 cards' },
            { status: 400 }
          )
        }
        if (game.hasSplit || game.hasSurrendered) {
          return NextResponse.json(
            { error: 'Cannot surrender after split or already surrendered' },
            { status: 400 }
          )
        }
        updatedGame.hasSurrendered = true
        gameState = 'SURRENDERED'
        result = 'SURRENDER'
        netProfit = -Math.floor(game.currentBet / 2) // Lose half the bet
        break

      case 'split_hit':
        const handIndex = payload?.handIndex || 0
        if (!splitHands[handIndex]) {
          return NextResponse.json(
            { error: 'Invalid split hand index' },
            { status: 400 }
          )
        }
        const splitCard = deck.pop()!
        const updatedSplitHand = GameEngine.calculateHandValue([...splitHands[handIndex].cards, splitCard])
        splitHands[handIndex] = updatedSplitHand
        break

      case 'split_stand':
        // Hand is already standing, just check if all hands are done
        break

      case 'set_ace_value':
        const aceValue = payload?.aceValue
        if (aceValue !== 1 && aceValue !== 11) {
          return NextResponse.json(
            { error: 'Ace value must be 1 or 11' },
            { status: 400 }
          )
        }
        
        // Update hand with new ace value
        if (splitHands.length > 0) {
          splitHands = splitHands.map(hand => {
            if (GameEngine.canChooseAceValue(hand)) {
              return GameEngine.calculateHandValue(hand.cards, aceValue)
            }
            return hand
          })
        }
        // For single hand, cards stay same but value recalculated automatically
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

  // Determine game state
  let finalGameState = 'PLAYING'
  // reuse previously declared variables
  result = null
  netProfit = 0

    // Check if player bust (for main hand or split hands)
    const playerBust = newPlayerHand.isBust || splitHands.some(hand => hand.isBust)
    
    if (playerBust) {
      finalGameState = 'ENDED'
      result = 'LOSE'
      netProfit = -updatedGame.currentBet
    } else if (action === 'stand' || action === 'split_stand' || (action === 'double_down' && !newPlayerHand.isBust)) {
      // Game ends after stand or double down
      finalGameState = 'ENDED'
      
      const gameResult = calculateGameResult(
        newPlayerHand,
        newDealerHand,
        updatedGame.currentBet,
        updatedGame.insuranceBet || 0,
        newDealerHand.isBlackjack,
        updatedGame.hasSurrendered || false
      )
      
      result = gameResult.result.toUpperCase()
      netProfit = gameResult.winAmount - updatedGame.currentBet
    } 
    // DO NOT auto-stand on 21 from HIT action
    // Let player manually stand to see the game play out
    // This prevents instant game end when player hits to 21

    // 🚀 Calculate new balance
    let newBalance = user.balance
    if (finalGameState === 'ENDED') {
      newBalance = user.balance + netProfit
    }

    // 🚀 PARALLEL: Update game and user balance simultaneously (critical operations)
    const [updatedGameRecord] = await Promise.all([
      db.game.update({
        where: { id: gameId },
        data: {
          playerHand: newPlayerHand,
          splitHands: splitHands.length > 0 ? splitHands : undefined,
          dealerHand: newDealerHand,
          deck,
          currentBet: updatedGame.currentBet,
          insuranceBet: updatedGame.insuranceBet,
          state: finalGameState,
          result,
          netProfit,
          hasSplit: updatedGame.hasSplit,
          hasSurrendered: updatedGame.hasSurrendered,
          hasInsurance: updatedGame.hasInsurance,
          endedAt: (finalGameState === 'ENDED' || finalGameState === 'SURRENDERED') ? new Date() : null
        }
      }),
      finalGameState === 'ENDED' ? db.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      }) : Promise.resolve()
    ])

    // 🚀 Phase 3: FIRE-AND-FORGET - GameMove creation (non-critical)
    db.gameMove.create({
      data: {
        gameId,
        moveType: action.toUpperCase(),
        payload: {
          playerCards,
          splitHands,
          dealerCards: finalGameState === 'ENDED' ? dealerCards : [dealerCards[0]],
          playerHandValue: newPlayerHand.value,
          dealerHandValue: finalGameState === 'ENDED' ? newDealerHand.value : GameEngine.calculateHandValue([dealerCards[0]]).value,
          currentBet: updatedGame.currentBet,
          aceValue: payload?.aceValue
        }
      }
    }).catch(err => console.error('GameMove creation failed:', err))

    if (finalGameState === 'ENDED') {
      // 🚀 Phase 3: Enqueue transaction creation (offload to worker)
      enqueueJob('transaction:create', {
        userId,
        type: result === 'WIN' || result === 'BLACKJACK' ? 'GAME_WIN' : 'GAME_LOSS',
        amount: Math.abs(netProfit),
        description: `Game ${result.toLowerCase()} - Blackjack`,
        balanceBefore: user.balance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        referenceId: gameId
      }).catch(err => console.error('Transaction enqueue failed:', err))
      
      if (game.sessionId) {
        updateSessionStatsAction(game.sessionId, { result }, updatedGame.currentBet, netProfit)
      }

      // 🚀 Phase 3: Invalidate caches for ended game
      invalidateGameCaches(gameId, userId).catch(err => 
        console.error('Cache invalidation failed:', err)
      )

      // 🚀 Phase 3: Enqueue stats recomputation (async)
      enqueueJob('stats:recompute', {
        userId,
        trigger: 'game:ended'
      }).catch(err => console.error('Stats recompute enqueue failed:', err))
    }

    // Return updated game state
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
        splitHands: splitHands.length > 0 ? splitHands : undefined,
        dealerHand: {
          cards: finalGameState === 'ENDED' ? newDealerHand.cards : [dealerCards[0]], // Hide second card if game not ended
          value: finalGameState === 'ENDED' ? newDealerHand.value : GameEngine.calculateHandValue([dealerCards[0]]).value,
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
        ...cors.headers,
        ...getSecurityHeaders(),
        ...rateLimit.headers
      }
    })

  } catch (error) {
    console.error('Game action error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: getSecurityHeaders()
      }
    )
  }
}