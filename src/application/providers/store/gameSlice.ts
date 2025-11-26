import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Game, GameResult, GameMove } from '../../../domain/entities/Game'
import { GameEngine } from '../../../domain/usecases/GameEngine'

interface GameState {
  currentGame: Game | null
  gameHistory: GameResult[]
  isLoading: boolean
  error: string | null
  balance: number
}

const initialState: GameState = {
  currentGame: null,
  gameHistory: [],
  isLoading: false,
  error: null,
  balance: 0, // Will be updated from wallet balance
}

// Start new game with database integration
export const startNewGame = createAsyncThunk(
  'game/startNewGame',
  async ({ userId, betAmount }: { userId: string; betAmount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/game/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          betAmount,
          moveType: 'deal'
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start new game')
      }
      
      const data = await response.json()
      return {
        game: data.game,
        userBalance: data.userBalance
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Make game action (hit, stand, double_down)
export const makeGameAction = createAsyncThunk(
  'game/makeGameAction',
  async ({ gameId, action, userId }: { gameId: string; action: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          action,
          userId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Invalid action')
      }
      
      const data = await response.json()
      return {
        game: data.game,
        userBalance: data.userBalance
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Get game history from database
export const getGameHistory = createAsyncThunk(
  'game/getGameHistory',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/history?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch game history')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    
    setLocalBalance: (state, action: PayloadAction<number>) => {
      console.log('🎮 Game balance set:', { from: state.balance, to: action.payload })
      state.balance = action.payload
    },
    
    addToHistory: (state, action: PayloadAction<GameResult>) => {
      state.gameHistory.unshift(action.payload)
      // Keep only last 100 games
      if (state.gameHistory.length > 100) {
        state.gameHistory = state.gameHistory.slice(0, 100)
      }
    },
    
    resetGame: (state) => {
      state.currentGame = null
      state.error = null
    },
    
    // NEW: Handle WebSocket actions loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    
    // NEW: Update game from WebSocket response (handles delta updates)
    updateFromSocket: (state, action: PayloadAction<any>) => {
      state.isLoading = false
      
      // Handle delta updates (Phase 4 optimization)
      if (action.payload?.delta && state.currentGame) {
        console.log('[REDUX] Applying delta update:', action.payload.delta)
        
        // Merge delta with current game state
        const delta = action.payload.delta
        
        if (delta.state) {
          state.currentGame.state = delta.state
        }
        
        if (delta.playerHand) {
          state.currentGame.playerHand = {
            ...state.currentGame.playerHand,
            ...delta.playerHand
          } as any
        }
        
        if (delta.dealerHand) {
          state.currentGame.dealerHand = {
            ...state.currentGame.dealerHand,
            ...delta.dealerHand
          } as any
        }
        
        if (delta.result) {
          state.currentGame.result = delta.result
        }
        
        if (delta.netProfit !== undefined) {
          state.currentGame.netProfit = delta.netProfit
        }
        
        // Update balance if provided
        if (action.payload.newBalance !== undefined) {
          state.balance = action.payload.newBalance
        }
        
        return
      }
      
      // Handle full game update (legacy/fallback)
      if (action.payload?.game) {
        console.log('[REDUX] Updating game from WebSocket:', {
          playerHandCards: action.payload.game.playerHand?.cards?.length,
          dealerHandCards: action.payload.game.dealerHand?.cards?.length,
          gameState: action.payload.game.state,
          playerCards: action.payload.game.playerHand?.cards,
          dealerCards: action.payload.game.dealerHand?.cards
        })
        state.currentGame = action.payload.game
      }
      if (action.payload?.userBalance !== undefined) {
        state.balance = action.payload.userBalance
      }
    }
  },
  
  extraReducers: (builder) => {
    // Start new game
    builder
      .addCase(startNewGame.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(startNewGame.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentGame = action.payload.game
        state.balance = action.payload.userBalance
      })
      .addCase(startNewGame.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Make game action
    builder
      .addCase(makeGameAction.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(makeGameAction.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentGame = action.payload.game
        state.balance = action.payload.userBalance
        
        // Add to history if game ended
        if (action.payload.game.state === 'ended' && action.payload.game.result) {
          const gameResult: GameResult = {
            result: action.payload.game.result.toLowerCase() as any,
            winAmount: action.payload.game.netProfit > 0 ? action.payload.game.currentBet + action.payload.game.netProfit : 0,
            netProfit: action.payload.game.netProfit,
            timestamp: new Date().toISOString()
          }
          state.gameHistory.unshift(gameResult)
          if (state.gameHistory.length > 100) {
            state.gameHistory = state.gameHistory.slice(0, 100)
          }
        }
      })
      .addCase(makeGameAction.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
    
    // Get game history
    builder
      .addCase(getGameHistory.fulfilled, (state, action) => {
        state.gameHistory = action.payload.games || []
      })
      .addCase(getGameHistory.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export const { clearError, setLocalBalance, addToHistory, resetGame, setLoading, updateFromSocket } = gameSlice.actions
export default gameSlice.reducer