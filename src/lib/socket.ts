import { Server } from 'socket.io';
import { db } from './db';
import { GameEngine } from '@/domain/usecases/GameEngine';
import { calculateGameResult } from './game-logic';
import { cache, CacheKeys } from './cache';
import { 
  cacheGet, 
  cacheSet, 
  cacheDelete,
  checkRateLimit,
  isRedisConnected,
  CACHE_KEYS,
  CACHE_TTL
} from './redis';

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

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
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

    // Real-time game action handler (NEW - FAST!)
    socket.on('game:action', async (data: GameActionRequest) => {
      const startTime = Date.now();
      
      console.log(`[SOCKET] Received game:action`, { 
        gameId: data.gameId, 
        action: data.action, 
        userId: data.userId 
      });
      
      // Rate limiting check
      const rateLimit = await checkRateLimit(
        `game:${data.userId}`,
        30, // 30 requests
        60  // per minute
      );
      
      if (!rateLimit.allowed) {
        console.warn(`[SOCKET] Rate limit exceeded for user ${data.userId}`);
        socket.emit('game:error', {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)}s`,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt
        });
        return;
      }
      
      try {
        // Try Redis cache first (VERY FAST - <5ms if Redis available)
        let game: any = null;
        let user: any = null;
        
        if (isRedisConnected()) {
          game = await cacheGet(`${CACHE_KEYS.GAME}${data.gameId}`);
          user = await cacheGet(`${CACHE_KEYS.USER}${data.userId}`);
          console.log(`[SOCKET] Redis cache check:`, { 
            gameInCache: !!game, 
            userInCache: !!user 
          });
        }
        
        // Fallback to in-memory cache
        if (!game) {
          game = cache.get<any>(CacheKeys.game(data.gameId));
        }
        if (!user) {
          user = cache.get<any>(CacheKeys.user(data.userId));
        }
        
        console.log(`[SOCKET] Cache check (after fallback):`, { 
          gameInCache: !!game, 
          userInCache: !!user 
        });
        
        // Fallback to database if not cached
        if (!game || !user) {
          console.log(`[SOCKET] Cache miss, querying database...`);
          const [dbGame, dbUser] = await Promise.all([
            db.game.findUnique({ where: { id: data.gameId } }),
            db.user.findUnique({ where: { id: data.userId } })
          ]);
          game = dbGame;
          user = dbUser;
          
          console.log(`[SOCKET] Database query result:`, { 
            gameFound: !!game, 
            userFound: !!user,
            gameState: game?.state 
          });
          
          // Update cache (both in-memory and Redis)
          if (game) {
            cache.set(CacheKeys.game(data.gameId), game, 10000);
            if (isRedisConnected()) {
              await cacheSet(`${CACHE_KEYS.GAME}${data.gameId}`, game, CACHE_TTL.GAME);
            }
          }
          if (user) {
            cache.set(CacheKeys.user(data.userId), user, 30000);
            if (isRedisConnected()) {
              await cacheSet(`${CACHE_KEYS.USER}${data.userId}`, user, CACHE_TTL.USER);
            }
          }
        }
        
        if (!game || !user) {
          console.error(`[SOCKET] Game or user not found`);
          socket.emit('game:error', { 
            error: 'Game or user not found',
            gameId: data.gameId 
          });
          return;
        }
        
        // Validate
        if (game.playerId !== data.userId) {
          console.error(`[SOCKET] Unauthorized access attempt`);
          socket.emit('game:error', { error: 'Unauthorized' });
          return;
        }
        
        if (game.state !== 'PLAYING') {
          console.warn(`[SOCKET] Invalid game state:`, { 
            currentState: game.state, 
            action: data.action 
          });
          socket.emit('game:error', { 
            error: 'Game not in playing state',
            currentState: game.state
          });
          return;
        }
        
        // Process action (in-memory, fast)
        let playerCards = [...(game.playerHand as any).cards];
        let dealerCards = [...(game.dealerHand as any).cards];
        let deck = [...game.deck as any[]];
        let finalGameState = game.state;
        let result: string | null = null;
        let netProfit = 0;
        
        switch (data.action) {
          case 'hit':
            const newCard = deck.pop();
            if (!newCard) {
              socket.emit('game:error', { error: 'No cards left' });
              return;
            }
            playerCards.push(newCard);
            break;
            
          case 'stand':
            let dealerHand = GameEngine.calculateHandValue(dealerCards);
            while (dealerHand.value < 17 && deck.length > 0) {
              const card = deck.pop();
              if (!card) break;
              dealerCards.push(card);
              dealerHand = GameEngine.calculateHandValue(dealerCards);
            }
            break;
            
          case 'double_down':
            if (playerCards.length !== 2) {
              socket.emit('game:error', { error: 'Can only double down with 2 cards' });
              return;
            }
            if (user.balance < game.currentBet) {
              socket.emit('game:error', { error: 'Insufficient balance' });
              return;
            }
            
            // Deduct additional bet
            await db.user.update({
              where: { id: data.userId },
              data: { balance: user.balance - game.currentBet }
            });
            
            const doubleCard = deck.pop();
            if (!doubleCard) {
              socket.emit('game:error', { error: 'No cards left' });
              return;
            }
            playerCards.push(doubleCard);
            game.currentBet = game.currentBet * 2;
            
            // Auto stand after double down
            let ddDealerHand = GameEngine.calculateHandValue(dealerCards);
            while (ddDealerHand.value < 17 && deck.length > 0) {
              const card = deck.pop();
              if (!card) break;
              dealerCards.push(card);
              ddDealerHand = GameEngine.calculateHandValue(dealerCards);
            }
            break;
        }
        
        // Calculate new hands
        const newPlayerHand = GameEngine.calculateHandValue(playerCards);
        const newDealerHand = GameEngine.calculateHandValue(dealerCards);
        
        // Check if game ended
        const playerBust = newPlayerHand.isBust;
        
        if (playerBust) {
          finalGameState = 'ENDED';
          result = 'LOSE';
          netProfit = -game.currentBet;
        } else if (data.action === 'stand' || (data.action === 'double_down' && !newPlayerHand.isBust)) {
          finalGameState = 'ENDED';
          
          // Ensure isSplittable is defined for calculateGameResult
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
            game.currentBet,
            game.insuranceBet || 0,
            newDealerHand.isBlackjack,
            false
          );
          result = gameResult.result.toUpperCase();
          netProfit = gameResult.winAmount - game.currentBet;
        }
        
        // Convert Hand objects to JSON-serializable format
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
        
        // Update database in background (non-blocking)
        const updatePromise = db.game.update({
          where: { id: data.gameId },
          data: {
            playerHand: playerHandJson as any,
            dealerHand: dealerHandJson as any,
            deck: deck as any,
            currentBet: game.currentBet,
            state: finalGameState,
            result: result as any,
            netProfit,
            endedAt: finalGameState === 'ENDED' ? new Date() : null
          }
        });
        
        // Update balance if game ended
        if (finalGameState === 'ENDED') {
          const newBalance = user.balance + netProfit;
          await Promise.all([
            db.user.update({
              where: { id: data.userId },
              data: { balance: newBalance }
            }),
            db.transaction.create({
              data: {
                userId: data.userId,
                type: result === 'WIN' || result === 'BLACKJACK' ? 'GAME_WIN' : 'GAME_LOSS',
                amount: Math.abs(netProfit),
                description: `Game ${result?.toLowerCase()} - Blackjack`,
                balanceBefore: user.balance,
                balanceAfter: newBalance,
                status: 'COMPLETED',
                referenceId: data.gameId
              }
            })
          ]);
          
          // Invalidate caches (both Redis and in-memory)
          cache.delete(CacheKeys.user(data.userId));
          cache.delete(CacheKeys.game(data.gameId));
          
          if (isRedisConnected()) {
            await Promise.all([
              cacheDelete(`${CACHE_KEYS.USER}${data.userId}`),
              cacheDelete(`${CACHE_KEYS.GAME}${data.gameId}`),
              cacheDelete(`${CACHE_KEYS.BALANCE}${data.userId}`)
            ]);
            console.log(`[SOCKET] Redis cache invalidated for user ${data.userId}`);
          }
        }
        
        // Wait for DB update to complete
        await updatePromise;
        
        const processingTime = Date.now() - startTime;
        console.log(`[SOCKET] Game action ${data.action} processed in ${processingTime}ms`);
        
        // Send instant response via Socket.IO
        const response = {
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
          userBalance: user.balance + (finalGameState === 'ENDED' ? netProfit : 0),
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        };
        
        console.log(`[SOCKET] Emitting game:updated to client (${processingTime}ms)`);
        socket.emit('game:updated', response);
        
      } catch (error) {
        console.error('[SOCKET] Game action error:', error);
        socket.emit('game:error', {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
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