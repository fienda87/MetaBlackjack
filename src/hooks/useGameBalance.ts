'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@/web3/useWallet'
import { toast } from './use-toast'

interface GameBalanceData {
  walletAddress: string
  gameBalance: string
  lastUpdated: string
}

// Cache configuration
const CACHE_DURATION = 10000 // 10 seconds
const DEBOUNCE_DELAY = 1000 // 1 second

// In-memory cache for game balance
const balanceCache = new Map<string, { balance: string; timestamp: number }>()

/**
 * Unified hook untuk manage dual balance system:
 * 1. On-chain Balance (Wallet) - GBC tokens di blockchain
 * 2. Off-chain Balance (Game) - GBC balance di database untuk betting
 * 
 * Flow:
 * - Deposit: On-chain → Off-chain (Game balance)
 * - Play: Off-chain balance untuk betting
 * - Withdraw: Off-chain → On-chain (Wallet)
 */
export function useGameBalance() {
  const { address, balance: walletBalance, syncBalance, isConnected, isCorrectNetwork } = useWallet()
  
  // Off-chain game balance (from database)
  const [gameBalance, setGameBalance] = useState<string>('0')
  const [isLoadingGameBalance, setIsLoadingGameBalance] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Fetch off-chain game balance dari database (with caching)
   */
  const fetchGameBalanceInternal = useCallback(async (bypassCache = false) => {
    if (!address || !isConnected) {
      setGameBalance('0')
      return
    }

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = balanceCache.get(address)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('💾 Using cached game balance:', cached.balance)
        setGameBalance(cached.balance)
        return
      }
    }

    setIsLoadingGameBalance(true)
    try {
      const response = await fetch(`/api/user/balance?address=${address}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch game balance')
      }

      const data: any = await response.json()
      
      // Extract game balance from response
      const balanceValue = data.gameBalance || data.balance || '0'
      
      console.log('📊 API Response:', {
        gameBalance: data.gameBalance,
        balance: data.balance,
        extracted: balanceValue,
        exists: data.exists
      })
      
      // Update cache
      balanceCache.set(address, {
        balance: balanceValue,
        timestamp: Date.now()
      })
      
      setGameBalance(balanceValue)
      setLastUpdated(new Date(data.lastUpdated))
      console.log('✅ Game balance fetched:', balanceValue)
    } catch (error) {
      console.error('Error fetching game balance:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch game balance',
        variant: 'destructive',
      })
      setGameBalance('0')
    } finally {
      setIsLoadingGameBalance(false)
    }
  }, [address, isConnected])

  /**
   * Debounced fetch game balance
   */
  const fetchGameBalance = useCallback((bypassCache = false) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchGameBalanceInternal(bypassCache)
    }, DEBOUNCE_DELAY)
  }, [fetchGameBalanceInternal])

  /**
   * Fetch immediately without debounce (for critical updates)
   */
  const fetchGameBalanceImmediate = useCallback(() => {
    fetchGameBalanceInternal(true) // Bypass cache for immediate updates
  }, [fetchGameBalanceInternal])

  /**
   * Sync both balances (on-chain + off-chain)
   * Use immediate fetch for critical updates (deposits/withdrawals)
   */
  const syncBothBalances = useCallback(async () => {
    await syncBalance() // On-chain wallet balance
    fetchGameBalanceImmediate() // Off-chain game balance (immediate, bypass cache)
  }, [syncBalance, fetchGameBalanceImmediate])

  /**
   * Auto-fetch game balance ketika address berubah
   */
  useEffect(() => {
    if (address && isConnected) {
      fetchGameBalanceInternal(false) // Use cache on initial load
    }
  }, [address, isConnected, fetchGameBalanceInternal])
  
  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  /**
   * Parse balance string to number untuk display
   */
  const parseBalance = (balance: string): number => {
    return parseFloat(balance) || 0
  }

  return {
    // On-chain balance (wallet)
    walletBalance, // GBC tokens di wallet user
    onChainGBC: parseBalance(walletBalance.gbc),
    onChainMATIC: parseBalance(walletBalance.matic),
    
    // Off-chain balance (game/database)
    gameBalance, // String format dari database
    offChainGBC: parseBalance(gameBalance),
    
    // Loading states
    isLoadingGameBalance,
    
    // Sync functions
    fetchGameBalance, // Refresh off-chain balance (debounced)
    fetchGameBalanceImmediate, // Immediate fetch (bypass cache & debounce)
    syncWalletBalance: syncBalance, // Refresh on-chain balance
    syncBothBalances, // Refresh both at once (uses immediate)
    
    // Meta
    lastUpdated,
    isConnected,
    isCorrectNetwork,
    address,
  }
}
