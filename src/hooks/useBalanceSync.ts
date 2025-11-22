import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/application/providers/store'
import { updateUserBalance } from '@/application/providers/store/walletSlice'
import { setLocalBalance } from '@/application/providers/store/gameSlice'

export const useBalanceSync = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { balance: gameBalance } = useSelector((state: RootState) => state.game)
  const { user } = useSelector((state: RootState) => state.wallet)
  
  // Use refs to prevent infinite loops
  const isSyncingFromWallet = useRef(false)
  const isSyncingFromGame = useRef(false)

  // Sync wallet balance to game balance (priority) - only when user changes or wallet balance changes
  useEffect(() => {
    if (user && user.balance !== undefined && user.balance !== null && !isNaN(user.balance)) {
      const walletBalance = Number(user.balance)
      const currentGameBalance = Number(gameBalance)
      
      // Only sync if we're not already syncing from game and balances are different
      if (!isSyncingFromGame.current && walletBalance !== currentGameBalance) {
        console.log('🔄 Syncing balance from wallet to game:', { 
          walletBalance, 
          gameBalance: currentGameBalance,
          username: user.username
        })
        
        isSyncingFromWallet.current = true
        dispatch(setLocalBalance(walletBalance))
        
        // Reset flag after dispatch
        setTimeout(() => {
          isSyncingFromWallet.current = false
        }, 100)
      }
    }
  }, [user?.balance, dispatch]) // Remove gameBalance from dependency to prevent loop

  // Sync game balance back to wallet when game updates balance (only after game actions)
  useEffect(() => {
    if (user && gameBalance !== undefined && gameBalance !== null && !isNaN(gameBalance)) {
      const gameBalanceNum = Number(gameBalance)
      const walletBalanceNum = Number(user.balance)
      
      // Only sync if we're not already syncing from wallet and balances are different
      if (!isSyncingFromWallet.current && gameBalanceNum !== walletBalanceNum) {
        console.log('🔄 Syncing balance from game to wallet:', { 
          gameBalance: gameBalanceNum, 
          userBalance: walletBalanceNum,
          username: user.username
        })
        
        isSyncingFromGame.current = true
        dispatch(updateUserBalance(gameBalanceNum))
        
        // Reset flag after dispatch
        setTimeout(() => {
          isSyncingFromGame.current = false
        }, 100)
      }
    }
  }, [gameBalance, dispatch]) // Remove user from dependency to prevent loop
}