export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GameEngine } from '@/domain/usecases/GameEngine'
import { perfMetrics } from '@/lib/performance-monitor'
import { cacheInvalidation } from '@/lib/cache-invalidation'

export async function POST(request: NextRequest) {
  const perfLabel = 'game:play'
  perfMetrics.start(perfLabel)
  
  try {
    const { userId, betAmount } = await request.json()
    
    if (!userId || !betAmount) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");
      if (user.balance < betAmount) throw new Error("Insufficient balance");

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: betAmount } }
      });
      
      const existingGame = await tx.game.findFirst({
        where: { playerId: userId, state: "PLAYING" }
      });

      if (existingGame) {
        throw new Error("GAME_ALREADY_ACTIVE");
      }

      const lastGame = await tx.game.findFirst({
        where: { playerId: userId },
        orderBy: { createdAt: 'desc' }
      });

      if (lastGame) {
        const diff = Date.now() - new Date(lastGame.createdAt).getTime();
        if (diff < 3000) {
           throw new Error("TOO_FAST");
        }
      }

      const deck = GameEngine.createDeck()
      const playerCards = [deck.pop()!, deck.pop()!]
      const dealerCards = [deck.pop()!, deck.pop()!]
      
      const playerHand = GameEngine.calculateHandValue(playerCards)
      const fullDealerHand = GameEngine.calculateHandValue(dealerCards)
      const dealerVisibleHand = GameEngine.calculateHandValue([dealerCards[0]!])

      let gameState = 'PLAYING'
      let result = null
      let payout = 0
      let netProfit = 0

      if (playerHand.isBlackjack && fullDealerHand.isBlackjack) {
        gameState = 'ENDED'
        result = 'PUSH'
        payout = betAmount
        netProfit = 0
      } else if (fullDealerHand.isBlackjack && !playerHand.isBlackjack) {
        gameState = 'ENDED'
        result = 'LOSE'
        payout = 0 
        netProfit = -betAmount
      } else if (playerHand.isBlackjack && !fullDealerHand.isBlackjack) {
        gameState = 'ENDED'
        result = 'WIN'
        netProfit = Math.floor(betAmount * 1.5) 
        payout = betAmount + netProfit 
      }

      if (gameState === 'ENDED' && payout > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: payout } }
        });
      }

      let session = await tx.gameSession.findFirst({
         where: { playerId: userId, endTime: null },
         orderBy: { startTime: 'desc' }
      });
      
      if (!session) {
         session = await tx.gameSession.create({
             data: { 
                 playerId: userId, 
                 totalGames: 0, 
                 totalBet: 0, 
                 totalWin: 0, 
                 netProfit: 0, 
                 stats: {} 
             }
         });
      }

      const newGame = await tx.game.create({
        data: {
          playerId: userId,
          sessionId: session.id,
          betAmount,
          currentBet: betAmount,
          state: gameState as any,
          result: result as any,
          netProfit,
          winAmount: payout,
          playerHand: { ...playerHand, cards: playerCards } as any,
          dealerHand: { ...fullDealerHand, cards: dealerCards } as any,
          deck: deck as any,
          gameStats: { 
              totalHands: 1, 
              blackjacks: playerHand.isBlackjack ? 1 : 0 
          },
          endedAt: gameState === 'ENDED' ? new Date() : null
        }
      });

      await tx.gameSession.update({
          where: { id: session.id },
          data: {
              totalGames: { increment: 1 },
              totalBet: { increment: betAmount }
          }
      });

      const finalUser = await tx.user.findUnique({ where: { id: userId } });
      
      return {
        game: newGame,
        userBalance: finalUser?.balance || 0,
        dealerVisibleHand
      };

    }, {
      maxWait: 5000,
      timeout: 10000
    });

    if (result.game.state === 'ENDED') {
        await cacheInvalidation.invalidateOnGameEnd(result.game.id, userId, result.game.result || 'ENDED')
    } else {
        await cacheInvalidation.invalidateGameData(result.game.id, userId, 'game_started')
    }

    const gameResponse = {
        ...result.game,
        dealerHand: result.game.state === 'ENDED' 
            ? result.game.dealerHand 
            : { 
                cards: [ (result.game.dealerHand as any).cards[0] ],
                value: result.dealerVisibleHand.value,
                isBust: false, 
                isBlackjack: false 
              }
    };

    return NextResponse.json({
      success: true,
      game: gameResponse,
      userBalance: result.userBalance,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    if (error.message === "GAME_ALREADY_ACTIVE") {
        return NextResponse.json({ 
            success: false, 
            message: "Selesaikan game yang sedang berjalan dulu!" 
        }, { status: 409 });
    }

    if (error.message === "TOO_FAST") {
        return NextResponse.json({ 
            success: false, 
            message: "Terlalu cepat! Tunggu sebentar." 
        }, { status: 429 });
    }

    if (error.message === "Insufficient balance") {
        return NextResponse.json({ error: 'Saldo tidak cukup' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  } finally {
    perfMetrics.end(perfLabel)
  }
}
