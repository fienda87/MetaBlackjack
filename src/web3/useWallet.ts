'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { config, switchToPolygonAmoy, CONTRACTS, GBC_TOKEN_ABI } from '@/web3/config'
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions'
import { formatEther, parseEther } from 'viem'
import { logger } from '@/lib/logger'

export interface WalletState {
  isConnected: boolean
  address: string | undefined
  balance: {
    matic: string
    gbc: string
  }
  isCorrectNetwork: boolean
  isLoading: boolean
  error: string | null
}

export function useWallet() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gbcBalance, setGbcBalance] = useState<string>('0')

  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: maticBalance } = useBalance({ address })
  const chainId = useChainId()

  // Check if we're on the correct network (Polygon Amoy)
  const isCorrectNetwork = chainId === 80002

  // Fetch GBC token balance
  const fetchGbcBalance = useCallback(async () => {
    if (!address || !isConnected || CONTRACTS.GBC_TOKEN === '0x0000000000000000000000000000000000000000') {
      setGbcBalance('0')
      return
    }

    try {
      const balance = await readContract(config, {
        address: CONTRACTS.GBC_TOKEN as `0x${string}`,
        abi: GBC_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address]
      })

      setGbcBalance(formatEther(balance as bigint))
    } catch (err) {
      logger.error('Failed to fetch GBC balance', err)
      setGbcBalance('0')
    }
  }, [address, isConnected])

  // Connect wallet
  const connectWallet = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // First switch to Polygon Amoy
      const networkSwitched = await switchToPolygonAmoy()
      if (!networkSwitched) {
        throw new Error('Failed to switch to Polygon Amoy testnet. Please add it manually in MetaMask.')
      }

      // Then connect wallet
      await connect({ connector: metaMask() })
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    disconnect()
    setGbcBalance('0')
    setError(null)
  }

  // Deposit MATIC to play (convert to in-game GBC)
  const depositMatic = async (amount: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would send MATIC to a contract that mints GBC
      // For now, we'll just show the transaction
      logger.info(`Depositing ${amount} MATIC to convert to GBC`)
      
      // TODO: Implement actual deposit contract
      // This would:
      // 1. Send MATIC to deposit contract
      // 2. Contract mints equivalent GBC to player
      // 3. Update database with transaction

      return true
    } catch (err: any) {
      setError(err.message || 'Failed to deposit MATIC')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Withdraw GBC to MATIC
  const withdrawGbc = async (amount: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would:
      // 1. Burn GBC tokens
      // 2. Send equivalent MATIC back to player
      logger.info(`Withdrawing ${amount} GBC to convert to MATIC`)
      
      // TODO: Implement actual withdraw contract

      return true
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw GBC')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Sync on-chain GBC with in-game balance
  const syncBalance = async () => {
    await fetchGbcBalance()
  }

  // Auto-refresh GBC balance when connected
  useEffect(() => {
    if (isConnected && address && isCorrectNetwork) {
      fetchGbcBalance()
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchGbcBalance, 30000)
      return () => clearInterval(interval)
    }
    
    return undefined
  }, [isConnected, address, isCorrectNetwork, fetchGbcBalance])

  const walletState: WalletState = {
    isConnected,
    address,
    balance: {
      matic: maticBalance ? parseFloat(maticBalance.formatted).toFixed(4) : '0',
      gbc: parseFloat(gbcBalance).toFixed(2)
    },
    isCorrectNetwork,
    isLoading,
    error
  }

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    depositMatic,
    withdrawGbc,
    syncBalance,
    clearError: () => setError(null)
  }
}
