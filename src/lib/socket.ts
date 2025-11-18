import { Server } from 'socket.io';

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