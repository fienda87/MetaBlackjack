import { createSelector } from 'reselect'
import { RootState } from '../index'

const selectWalletState = (state: RootState) => state.wallet

export const selectIsConnected = createSelector(
  [selectWalletState],
  (walletState) => walletState.isConnected
)

export const selectIsConnecting = createSelector(
  [selectWalletState],
  (walletState) => walletState.isConnecting
)

export const selectUser = createSelector(
  [selectWalletState],
  (walletState) => walletState.user
)

export const selectWalletError = createSelector(
  [selectWalletState],
  (walletState) => walletState.error
)

export const selectUserId = createSelector(
  [selectUser],
  (user) => user?.id || null
)

export const selectWalletAddress = createSelector(
  [selectUser],
  (user) => user?.walletAddress || null
)

export const selectUsername = createSelector(
  [selectUser],
  (user) => user?.username || 'Player'
)

export const selectUserBalance = createSelector(
  [selectUser],
  (user) => user?.balance || 0
)

export const selectMockWallets = createSelector(
  [selectWalletState],
  (walletState) => walletState.mockWallets
)

export const selectUserInfo = createSelector(
  [selectUser],
  (user) => {
    if (!user) return null
    return {
      id: user.id,
      address: user.walletAddress,
      username: user.username || 'Player',
      balance: user.balance
    }
  }
)

export const selectConnectionStatus = createSelector(
  [selectIsConnected, selectIsConnecting, selectWalletError],
  (isConnected, isConnecting, error) => ({
    isConnected,
    isConnecting,
    hasError: !!error
  })
)
