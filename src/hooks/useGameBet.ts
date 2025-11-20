'use client'

import { useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { useGBCBurn } from '@/hooks/useGBCTransfer'
import { useToast } from '@/hooks/use-toast'

type BetType = 'fiat' | 'gbc'

type GameBetState = {
  betType: BetType
  betAmount: number
  isBurning: boolean
  isBurningConfirmed: boolean
  burnError: string | null
}

/**
 * Hook to manage GBC token betting (burn tokens on bet placement)
 */
export function useGameBet() {
  const { address, isConnected } = useAccount()
  const { burn, isPending: isBurning } = useGBCBurn()
  const { toast } = useToast()

  const [state, setState] = useState<GameBetState>({
    betType: 'fiat',
    betAmount: 0,
    isBurning: false,
    isBurningConfirmed: false,
    burnError: null,
  })

  /**
   * Place a GBC bet by burning tokens
   */
  const placeBet = useCallback(
    async (gbcAmount: string): Promise<boolean> => {
      // Validate connection
      if (!isConnected || !address) {
        toast({
          title: 'Wallet Not Connected',
          description: 'Please connect your wallet to bet with GBC',
          variant: 'destructive',
        })
        return false
      }

      // Validate amount
      const parsedAmount = parseFloat(gbcAmount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast({
          title: 'Invalid Bet Amount',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        })
        return false
      }

      setState(prev => ({
        ...prev,
        isBurning: true,
        burnError: null,
      }))

      try {
        toast({
          title: 'Burning GBC Tokens...',
          description: `Placing bet of ${parsedAmount} GBC`,
        })

        // Burn tokens (convert to Wei: multiply by 10^18)
        await burn(gbcAmount)

        setState(prev => ({
          ...prev,
          isBurning: false,
          isBurningConfirmed: true,
          betAmount: parsedAmount,
          betType: 'gbc',
        }))

        toast({
          title: 'Bet Confirmed! 🎯',
          description: `${parsedAmount} GBC tokens burned. Game starting...`,
        })

        return true
      } catch (error: any) {
        const errorMessage =
          error?.message ||
          error?.reason ||
          'Failed to burn tokens. Please try again.'

        setState(prev => ({
          ...prev,
          isBurning: false,
          burnError: errorMessage,
        }))

        toast({
          title: 'Bet Failed',
          description: errorMessage,
          variant: 'destructive',
        })

        return false
      }
    },
    [isConnected, address, burn, toast]
  )

  /**
   * Reset bet state for new game
   */
  const resetBet = useCallback(() => {
    setState({
      betType: 'fiat',
      betAmount: 0,
      isBurning: false,
      isBurningConfirmed: false,
      burnError: null,
    })
  }, [])

  /**
   * Switch bet type between fiat and GBC
   */
  const switchBetType = useCallback((type: BetType) => {
    setState(prev => ({
      ...prev,
      betType: type,
    }))
  }, [])

  return {
    // State
    betType: state.betType,
    betAmount: state.betAmount,
    isBurning: state.isBurning || isBurning,
    isBurningConfirmed: state.isBurningConfirmed,
    burnError: state.burnError,

    // Actions
    placeBet,
    resetBet,
    switchBetType,

    // Connection status
    isConnected,
    address,
  }
}

export default useGameBet
