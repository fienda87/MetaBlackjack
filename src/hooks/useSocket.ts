'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

export const useSocket = (playerId: string, initialBalance: number) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [lastUpdate, setLastUpdate] = useState<BalanceUpdate | null>(null);
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    // Connect to Socket.IO server with proper URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
      autoConnect: true
    });
    
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO Connected to server');
      setConnected(true);
      
      // Initialize player session
      socketInstance.emit('player:init', { playerId, initialBalance });
    });

    socketInstance.on('disconnect', () => {
      console.log('⚠️ Socket.IO Disconnected from server');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO Connection Error:', error.message);
    });

    // Listen for balance updates
    socketInstance.on('balance:updated', (data: BalanceUpdate) => {
      setBalance(data.newBalance);
      setLastUpdate(data);
    });

    // Listen for balance errors
    socketInstance.on('balance:error', (data: any) => {
      console.error('Balance error:', data);
    });

    // Listen for current balance
    socketInstance.on('balance:current', (data: any) => {
      setBalance(data.balance);
    });

    // Listen for game save confirmation
    socketInstance.on('game:saved', (data: any) => {
      console.log('Game saved:', data);
    });

    // Listen for game restore
    socketInstance.on('game:restored', (gameState: GameState) => {
      setSavedGame(gameState);
    });

    // Listen for restore failure
    socketInstance.on('game:restore-failed', (data: any) => {
      console.log('Game restore failed:', data.message);
    });

    // Listen for validation results
    socketInstance.on('game:validated', (data: any) => {
      setValidationResult(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [playerId, initialBalance]);

  // Update balance
  const updateBalance = (amount: number, type: 'win' | 'lose' | 'bet' | 'refund') => {
    if (socket) {
      socket.emit('balance:update', {
        playerId,
        amount,
        type,
        timestamp: Date.now()
      });
    }
  };

  // Get current balance
  const getCurrentBalance = () => {
    if (socket) {
      socket.emit('balance:get', { playerId });
    }
  };

  // Save game state
  const saveGameState = (gameState: GameState) => {
    if (socket) {
      socket.emit('game:save', gameState);
    }
  };

  // Restore game state
  const restoreGameState = () => {
    if (socket) {
      socket.emit('game:restore', { playerId });
    }
  };

  // Validate game result
  const validateGame = (data: {
    playerHand: string[];
    dealerHand: string[];
    result: 'win' | 'lose' | 'push';
    bet: number;
  }) => {
    if (socket) {
      socket.emit('game:validate', {
        playerId,
        ...data
      });
    }
  };

  // Real-time game action (NEW - FAST!)
  const performGameAction = (
    gameId: string,
    action: 'hit' | 'stand' | 'double_down' | 'split' | 'insurance' | 'surrender',
    payload?: any
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log(`[CLIENT] performGameAction called:`, { gameId, action, playerId, connected });
      
      if (!socket) {
        console.error('[CLIENT] Socket instance is null');
        reject(new Error('Socket not initialized'));
        return;
      }
      
      if (!connected) {
        console.error('[CLIENT] Socket not connected');
        reject(new Error('Socket not connected'));
        return;
      }

      // Set timeout
      const timeout = setTimeout(() => {
        console.error('[CLIENT] Game action timeout after 10s');
        reject(new Error('Action timeout'));
      }, 10000);

      // Listen for response
      const handleUpdate = (data: any) => {
        console.log('[CLIENT] Received game:updated', data);
        clearTimeout(timeout);
        socket.off('game:updated', handleUpdate);
        socket.off('game:error', handleError);
        resolve(data);
      };

      const handleError = (error: any) => {
        console.error('[CLIENT] Received game:error', error);
        clearTimeout(timeout);
        socket.off('game:updated', handleUpdate);
        socket.off('game:error', handleError);
        
        // Create proper Error object with details
        const errorObj = new Error(
          error?.error || error?.message || 'Game action failed'
        );
        (errorObj as any).details = error;
        reject(errorObj);
      };

      socket.once('game:updated', handleUpdate);
      socket.once('game:error', handleError);

      // Emit action
      console.log('[CLIENT] Emitting game:action to server');
      socket.emit('game:action', {
        gameId,
        action,
        userId: playerId,
        payload
      });
    });
  };

  return {
    socket,
    connected,
    balance,
    lastUpdate,
    savedGame,
    validationResult,
    updateBalance,
    getCurrentBalance,
    saveGameState,
    restoreGameState,
    validateGame,
    performGameAction // NEW - Use this for game actions!
  };
};