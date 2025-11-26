import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  walletAddress: string
  username?: string
  balance: number
  createdAt: string
}

interface WalletState {
  isConnected: boolean
  isConnecting: boolean
  user: User | null
  error: string | null
  mockWallets: Array<{
    address: string
    username: string
    balance: number
  }>
}

const initialState: WalletState = {
  isConnected: false,
  isConnecting: false,
  user: null,
  error: null,
  mockWallets: []
}

// Fetch user by wallet address (get or create)
export const fetchUserByWallet = createAsyncThunk(
  'wallet/fetchByWallet',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/user/wallet?address=${walletAddress}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch user')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Connect wallet (mock for development)
export const connectWallet = createAsyncThunk(
  'wallet/connect',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress,
          signature: 'mock_signature' // Mock signature for development
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to connect wallet')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Get mock wallets
export const getMockWallets = createAsyncThunk(
  'wallet/getMockWallets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/wallet')
      
      if (!response.ok) {
        throw new Error('Failed to fetch mock wallets')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Disconnect wallet
export const disconnectWallet = createAsyncThunk(
  'wallet/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      // In a real app, you might want to call an API to clean up
      // For now, just return success
      return { success: true }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Update user information
export const updateUser = createAsyncThunk(
  'wallet/updateUser',
  async ({ userId, username }: { userId: string; username: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }
      
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    
    updateUserBalance: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.balance = action.payload
      }
    },
    
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isConnected = true
      state.error = null
    },
    
    clearUser: (state) => {
      state.user = null
      state.isConnected = false
      state.error = null
    }
  },
  
  extraReducers: (builder) => {
    // Fetch user by wallet
    builder
      .addCase(fetchUserByWallet.pending, (state) => {
        state.isConnecting = true
        state.error = null
      })
      .addCase(fetchUserByWallet.fulfilled, (state, action) => {
        state.isConnecting = false
        state.isConnected = true
        state.user = action.payload.user
        state.error = null
        console.log('✅ User loaded from wallet:', {
          address: action.payload.user.walletAddress,
          username: action.payload.user.username,
          balance: action.payload.user.balance
        })
      })
      .addCase(fetchUserByWallet.rejected, (state, action) => {
        state.isConnecting = false
        state.error = action.payload as string
      })
    
    // Get mock wallets
    builder
      .addCase(getMockWallets.fulfilled, (state, action) => {
        state.mockWallets = action.payload.mockWallets
      })
    
    // Connect wallet
    builder
      .addCase(connectWallet.pending, (state) => {
        state.isConnecting = true
        state.error = null
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.isConnecting = false
        state.isConnected = true
        state.user = action.payload.user
        state.error = null
        console.log('✅ Wallet connected:', {
          username: action.payload.user.username,
          balance: action.payload.user.balance
        })
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.isConnecting = false
        state.error = action.payload as string
      })
    
    // Disconnect wallet
    builder
      .addCase(disconnectWallet.fulfilled, (state) => {
        state.isConnected = false
        state.user = null
        state.error = null
      })
    
    // Update user
    builder
      .addCase(updateUser.pending, (state) => {
        state.error = null
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (state.user) {
          state.user.username = action.payload.user.username
        }
        state.error = null
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export const { clearError, updateUserBalance, setUser, clearUser } = walletSlice.actions
export default walletSlice.reducer