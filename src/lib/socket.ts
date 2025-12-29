import { Server } from 'socket.io';
import { db } from './db';
import { GameEngine } from '@/domain/usecases/GameEngine';
import { logger } from '@/lib/logger';
import { calculateGameResult } from './game-logic';
import { checkRateLimit } from './redis';

interface GameState {
  id: string;
  playerId: string;
  deck: string[];
  playerHand: string[];
  dealerHand: string[];
  playerScore: number;
  dealerScore: number;
  bet: number;
  balance: number;
  gameStatus: 'betting' | 'playing' | 'finished';
  timestamp: number;
}

interface GameActionRequest {
  gameId: string;
  action: 'hit' | 'stand' | 'double_down' | 'split' | 'insurance';
  userId: string;
  payload?: any;
}

interface BalanceUpdate {
  playerId: string;
  oldBalance: number;
  newBalance: number;
  amount: number;
  type: 'win' | 'lose' | 'bet' | 'refund';
  timestamp: number;
}

export const setupSocket = (io: Server) => {
  // Store active games and player states
  const activeGames = new Map<string, GameState>();
  const playerBalances = new Map<string, number>();

  // Connection error handling
  io.engine.on('connection_error', (err) => {
    logger.error('Connection error', { code: err.code, message: err.message });
  });

  io.on('connection', (socket) => {
    logger.info('Player connected', socket.id);
    
    // Heartbeat monitoring
    let heartbeatInterval: NodeJS.Timeout;
    
    socket.on('heartbeat', () => {
      socket.emit('heartbeat-ack');
    });
    
    // Auto-cleanup check
    heartbeatInterval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
    
    // Initialize player session
    socket.on('player:init', (data: { playerId: string; initialBalance: number }) => {
      playerBalances.set(data.playerId, data.initialBalance);
      
      socket.emit('session:initialized', {
        playerId: data.playerId,
        balance: data.initialBalance,
        timestamp: Date.now()
      });
    });

    // Save game state to server
    socket.on('game:save', (gameState: GameState) => {
      activeGames.set(gameState.playerId, {
        ...gameState,
        timestamp: Date.now()
      });
      
      socket.emit('game:saved', { 
        success: true, 
        timestamp: Date.now() 
      });
    });

    // Restore game state
    socket.on('game:restore', (data: { playerId: string }) => {
      const savedGame = activeGames.get(data.playerId);
      if (savedGame) {
        socket.emit('game:restored', savedGame);
      } else {
        socket.emit('game:restore-failed', { 
          message: 'No saved game found' 
        });
      }
    });

    // Update player balance
    socket.on('balance:update', (data: BalanceUpdate) => {
      const currentBalance = playerBalances.get(data.playerId) || 0;
      const newBalance = currentBalance + data.amount;
      
      // Validate balance update
      if (newBalance >= 0) {
        playerBalances.set(data.playerId, newBalance);
        
        socket.emit('balance:updated', {
          playerId: data.playerId,
          oldBalance: currentBalance,
          newBalance: newBalance,
          amount: data.amount,
          type: data.type,
          timestamp: Date.now()
        });
      } else {
        socket.emit('balance:error', {
          message: 'Insufficient balance',
          currentBalance,
          attemptedAmount: data.amount
        });
      }
    });

    // Validate game result
    socket.on('game:validate', (data: { 
      playerId: string; 
      playerHand: string[]; 
      dealerHand: string[];
      result: 'win' | 'lose' | 'push';
      bet: number;
    }) => {
      // Basic validation logic
      const playerScore = calculateScore(data.playerHand);
      const dealerScore = calculateScore(data.dealerHand);
      
      let isValid = true;
      let expectedResult: 'win' | 'lose' | 'push' = 'push';
      
      if (playerScore > 21) {
        expectedResult = 'lose';
      } else if (dealerScore > 21) {
        expectedResult = 'win';
      } else if (playerScore > dealerScore) {
        expectedResult = 'win';
      } else if (dealerScore > playerScore) {
        expectedResult = 'lose';
      }
      
      isValid = expectedResult === data.result;
      
      socket.emit('game:validated', {
        isValid,
        expectedResult,
        playerScore,
        dealerScore,
        timestamp: Date.now()
      });
    });

    // Get current balance
    socket.on('balance:get', (data: { playerId: string }) => {
      const balance = playerBalances.get(data.playerId) || 0;
      socket.emit('balance:current', {
        playerId: data.playerId,
        balance,
        timestamp: Date.now()
      });
    });

    socket.on('game:action', async (data: GameActionRequest) => {
      const startTime = Date.now();

      try {
        const isDev = process.env.NODE_ENV === 'development';
        if (!isDev) {
          const rateLimit = await checkRateLimit(`game:${data.userId}`, 30, 60);
          if (!rateLimit.allowed) {
            socket.emit('game:error', { error: 'Too many requests' });
            return;
          }
        }

        const [game, user] = await Promise.all([
          db.game.findUnique({
            where: { id: data.gameId },
            select: {
              id: true,
              playerId: true,
              state: true,
              playerHand: true,
              dealerHand: true,
              deck: true,
              currentBet: true,
              betAmount: true,
              insuranceBet: true,
              createdAt: true
            }
          }),
          db.user.findUnique({
            where: { id: data.userId },
            select: { id: true, balance: true }
          })
        ]);

        if (!game || !user) {
          socket.emit('game:error', { error: 'Game or user not found' });
          return;
        }
        if (game.playerId !== data.userId) {
          socket.emit('game:error', { error: 'Unauthorized' });
          return;
        }
        if (game.state !== 'PLAYING') {
          socket.emit('game:error', { error: 'Game not in playing state' });
          return;
        }

        let playerCards = [...(game.playerHand as any).cards];
        let dealerCards = [...(game.dealerHand as any).cards];
        let deck = [...(game.deck as any[])];
        let finalGameState: 'PLAYING' | 'ENDED' = game.state;
        let result: string | null = null;

        // Total payout (stake + profit) that should be added back to balance.
        // User balance is already ex-bet (bet deducted at game start).
        let payout = 0;
        // Net profit is stored for stats/records only (can be negative on losses).
        let netProfit = 0;

        let currentBet = game.currentBet;

        switch (data.action) {
          case 'hit': {
            const newCard = deck.pop();
            if (!newCard) {
              socket.emit('game:error', { error: 'No cards left' });
              return;
            }
            playerCards.push(newCard);
            break;
          }

          case 'stand': {
            let dealerHand = GameEngine.calculateHandValue(dealerCards);
            while (dealerHand.value < 17 && deck.length > 0) {
              const card = deck.pop();
              if (!card) break;
              dealerCards.push(card);
              dealerHand = GameEngine.calculateHandValue(dealerCards);
            }
            break;
          }

          case 'double_down': {
            if (playerCards.length !== 2) {
              socket.emit('game:error', { error: 'Can only double down with 2 cards' });
              return;
            }
            if (user.balance < currentBet) {
              socket.emit('game:error', { error: 'Insufficient balance' });
              return;
            }

            await db.user.update({
              where: { id: data.userId },
              data: { balance: user.balance - currentBet }
            });

            // Keep the in-memory balance aligned with DB (balance is ex-bet).
            user.balance -= currentBet;

            const doubleCard = deck.pop();
            if (!doubleCard) {
              socket.emit('game:error', { error: 'No cards left' });
              return;
            }
            playerCards.push(doubleCard);
            currentBet = currentBet * 2;

            let ddDealerHand = GameEngine.calculateHandValue(dealerCards);
            while (ddDealerHand.value < 17 && deck.length > 0) {
              const card = deck.pop();
              if (!card) break;
              dealerCards.push(card);
              ddDealerHand = GameEngine.calculateHandValue(dealerCards);
            }
            break;
          }

        }

        const newPlayerHand = GameEngine.calculateHandValue(playerCards);
        const newDealerHand = GameEngine.calculateHandValue(dealerCards);

        const playerBust = newPlayerHand.isBust;

        if (playerBust) {
          finalGameState = 'ENDED';
          result = 'LOSE';

          // Lose = no payout returned (bet already deducted at game start)
          payout = 0;
          netProfit = -currentBet;
        } else if (data.action === 'stand' || (data.action === 'double_down' && !newPlayerHand.isBust)) {
          finalGameState = 'ENDED';

          const playerHandForCalc = {
            ...newPlayerHand,
            isSplittable: newPlayerHand.isSplittable ?? false
          };

          const dealerHandForCalc = {
            ...newDealerHand,
            isSplittable: newDealerHand.isSplittable ?? false
          };

          const gameResult = calculateGameResult(
            playerHandForCalc as any,
            dealerHandForCalc as any,
            currentBet,
            game.insuranceBet || 0,
            newDealerHand.isBlackjack,
            false
          );

          result = gameResult.result.toUpperCase();

          // calculateGameResult.winAmount is TOTAL payout (stake + profit)
          payout = gameResult.winAmount;
          netProfit = gameResult.winAmount - currentBet;
        }

        const playerHandJson = {
          cards: newPlayerHand.cards,
          value: newPlayerHand.value,
          isBust: newPlayerHand.isBust,
          isBlackjack: newPlayerHand.isBlackjack,
          isSplittable: newPlayerHand.isSplittable ?? false
        };

        const dealerHandJson = {
          cards: newDealerHand.cards,
          value: newDealerHand.value,
          isBust: newDealerHand.isBust,
          isBlackjack: newDealerHand.isBlackjack,
          isSplittable: false
        };

        const newBalance = finalGameState === 'ENDED' ? user.balance + payout : user.balance;

        await Promise.all([
          db.game.update({
            where: { id: data.gameId },
            data: {
              playerHand: playerHandJson as any,
              dealerHand: dealerHandJson as any,
              deck: deck as any,
              currentBet,
              state: finalGameState as any,
              result: result as any,
              netProfit,
              winAmount: finalGameState === 'ENDED' ? payout : undefined,
              endedAt: finalGameState === 'ENDED' ? new Date() : null
            }
          }),
          finalGameState === 'ENDED'
            ? db.user.update({
                where: { id: data.userId },
                data: { balance: newBalance }
              })
            : Promise.resolve()
        ]);

        if (finalGameState === 'ENDED') {
          db.transaction
            .create({
              data: {
                userId: data.userId,
                type: result === 'WIN' || result === 'BLACKJACK' ? 'GAME_WIN' : 'GAME_LOSS',
                amount: Math.abs(netProfit).toString(),
                description: `Game ${result?.toLowerCase()} - Blackjack`,
                balanceBefore: user.balance,
                balanceAfter: newBalance,
                status: 'SUCCESS',
                referenceId: data.gameId
              }
            })
            .catch((err) => logger.error('[SOCKET] Transaction creation failed', err));
        }

        socket.emit('game:updated', {
          success: true,
          game: {
            id: game.id,
            playerId: game.playerId,
            betAmount: game.betAmount,
            currentBet,
            state: finalGameState,
            playerHand: newPlayerHand,
            dealerHand: {
              cards: finalGameState === 'ENDED' ? newDealerHand.cards : [dealerCards[0]],
              value:
                finalGameState === 'ENDED'
                  ? newDealerHand.value
                  : GameEngine.calculateHandValue([dealerCards[0]]).value,
              isBust: newDealerHand.isBust,
              isBlackjack: newDealerHand.isBlackjack
            },
            result,
            netProfit,
            createdAt: game.createdAt,
            userBalance: newBalance,
            processingTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        });
      } catch (error) {
        logger.error('Game Action Error:', error);
        socket.emit('game:error', {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      clearInterval(heartbeatInterval);
      logger.info('Player disconnected', socket.id);
      // Keep game state in memory for potential reconnection
    });
  });
};

// Helper function to calculate blackjack score
function calculateScore(hand: string[]): number {
  let score = 0;
  let aces = 0;
  
  for (const card of hand) {
    const value = card.split('-')[0];
    if (!value) continue; // Skip invalid cards
    if (value === 'A') {
      aces++;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(value)) {
      score += 10;
    } else {
      score += parseInt(value);
    }
  }
  
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  return score;
}

/**
 * Emit blockchain balance update to client
 * Called after deposit/withdraw/faucet transactions confirmed
 */
export function emitBalanceUpdate(
  io: Server,
  walletAddress: string,
  type: 'deposit' | 'withdraw' | 'faucet',
  amount: string,
  txHash: string
) {
  // Emit to all connected clients with this wallet address
  io.emit('blockchain:balance-updated', {
    walletAddress,
    type,
    amount,
    txHash,
    timestamp: Date.now()
  })
  
  logger.info('Emitted balance update', { walletAddress, type, amount })
}

/**
 * Emit game balance update (off-chain)
 * Called after deposit adds to game balance or withdraw reduces it
 */
export function emitGameBalanceUpdate(
  io: Server,
  walletAddress: string,
  newGameBalance: string
) {
  io.emit('game:balance-updated', {
    walletAddress,
    gameBalance: newGameBalance,
    timestamp: Date.now()
  })
  
  logger.info('Emitted game balance update', { walletAddress, newGameBalance })
}