'use client'

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Play, 
  RotateCcw,
  Coins,
  TrendingUp,
  TrendingDown,
  Minimize2,
  AlertCircle
} from 'lucide-react'
import { RootState, AppDispatch } from '@/application/store'
import { startNewGame, makeGameAction, resetGame } from '@/application/store/gameSlice'
import { createCardDisplay, createHiddenCard } from '@/lib/ui-helpers'
import GameResultModal from '@/components/GameResultModal'
import { useBalanceSync } from '@/hooks/useBalanceSync'
import { useGameStats } from '@/hooks/useGameStats'
import CardDeck from '@/components/CardDeck'
import { CardDealingAnimation } from '@/lib/card-dealing'
import { useSettingsStore } from '@/store/settingsStore'
import { shouldSurrender } from '@/lib/game-logic'
import { useSocket } from '@/hooks/useSocket'
import { OptimisticGameState, requestQueue } from '@/lib/optimistic-updates'

// Memoized card component with smaller size and dynamic animation delay
const MemoizedCard = memo(({ card, size, isRevealing, index, isDealer }: { 
  card: any; 
  size: 'small' | 'medium' | 'large'
  isRevealing?: boolean
  index?: number
  isDealer?: boolean
}) => {
  const [showCard, setShowCard] = useState(!isRevealing)
  const { cardDealingSpeed } = useSettingsStore()
  
  // Get delay based on current speed setting
  const getDelay = () => {
    switch (cardDealingSpeed) {
      case 'slow': return 1000
      case 'normal': return 500
      case 'fast': return 200
      default: return 500
    }
  }
  
  useEffect(() => {
    if (isRevealing && index !== undefined && isDealer) {
      // Use dynamic delay based on speed setting
      const baseDelay = getDelay()
      const timer = setTimeout(() => {
        setShowCard(true)
      }, baseDelay + (index * baseDelay * 0.8)) // Progressive delay
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isRevealing, index, isDealer, cardDealingSpeed])
  
  return (
    <div 
      className={`transform transition-all duration-500 ease-in-out ${
        showCard ? 'scale-100 rotate-0 opacity-100' : 'scale-95 rotate-3 opacity-0'
      }`}
      style={{
        animationDelay: `${index ? index * getDelay() * 0.3 : 0}ms`,
        animation: showCard ? 'slideIn 0.5s ease-out forwards' : 'none'
      }}
    >
      {!showCard ? (
        createHiddenCard(size)
      ) : (
        createCardDisplay(card, size)
      )}
    </div>
  )
})
MemoizedCard.displayName = 'MemoizedCard'

// Quick bet buttons component with fixed amounts
const QuickBetButtons = memo(({ 
  onQuickBet, 
  balance, 
  currentBet, 
  disabled 
}: {
  onQuickBet: (amount: number) => void
  balance: number
  currentBet: number
  disabled: boolean
}) => {
  const fixedAmounts = [25, 50, 100, 500]
  
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {fixedAmounts.map(amount => {
        const isDisabled = disabled || amount > balance || amount <= 0
        
        return (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            className={`border-green-600 text-green-400 hover:bg-green-900/20 ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => onQuickBet(amount)}
            disabled={isDisabled}
          >
            {amount} GBC
          </Button>
        )
      })}
      <Button
        variant="outline"
        size="sm"
        className={`border-green-600 text-green-400 hover:bg-green-900/20 ${
          disabled || balance <= 0 ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => onQuickBet(balance)}
        disabled={disabled || balance <= 0}
      >
        All In
      </Button>
    </div>
  )
})
QuickBetButtons.displayName = 'QuickBetButtons'

// W/L/P Indicators component
const GameIndicators = memo(({ 
  wins, 
  losses, 
  pushes, 
  blackjacks 
}: {
  wins: number
  losses: number
  pushes: number
  blackjacks: number
}) => {
  return (
    <div className="flex gap-4 justify-center">
      <div className="text-center">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-green-400 font-bold">W: {wins}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center gap-1">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <span className="text-red-400 font-bold">L: {losses}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center gap-1">
          <Minimize2 className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold">P: {pushes}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400 font-bold">BJ: {blackjacks}</span>
        </div>
      </div>
    </div>
  )
})
GameIndicators.displayName = 'GameIndicators'

// Betting controls component with improved layout
const BettingControls = memo(({ 
  betAmount, 
  onBetChange, 
  onDeal, 
  balance, 
  isLoading 
}: {
  betAmount: number
  onBetChange: (amount: number) => void
  onDeal: () => void
  balance: number
  isLoading: boolean
}) => {
  const [inputValue, setInputValue] = useState(betAmount.toString())
  const [error, setError] = useState('')
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  
  // Handle input change with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    // Only allow numbers
    const numValue = parseInt(value, 10)
    
    if (value === '') {
      setInputValue('')
      setError('')
      setShowErrorPopup(false)
      return
    }
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number')
      setShowErrorPopup(true)
      return
    }
    
    if (numValue < 1) {
      setError('Minimum bet is 1 GBC')
      setShowErrorPopup(true)
      setInputValue(value)
      return
    }
    
    if (numValue > balance) {
      setError(`Insufficient balance. You have ${balance} GBC`)
      setShowErrorPopup(true)
      setInputValue(value)
      return
    }
    
    setError('')
    setShowErrorPopup(false)
    setInputValue(value)
    onBetChange(numValue)
  }
  
  // Handle quick bet
  const handleQuickBet = useCallback((amount: number) => {
    if (amount <= balance) {
      onBetChange(amount)
      setInputValue(amount.toString())
      setError('')
      setShowErrorPopup(false)
    }
  }, [balance, onBetChange])
  
  return (
    <>
      <div className="space-y-4">
        <div className="text-center">
          <Label className="text-green-400 text-sm">Bet Amount (GBC)</Label>
          <div className="flex justify-center mt-2">
            <div className="relative">
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter amount"
                className="w-32 text-center bg-black border-green-600 text-green-400"
                disabled={isLoading}
                min="1"
                max={balance}
              />
            </div>
          </div>
        </div>

        <QuickBetButtons
          onQuickBet={handleQuickBet}
          balance={balance}
          currentBet={betAmount}
          disabled={isLoading}
        />

        <div className="flex justify-center">
          <Button
            onClick={onDeal}
            className="bg-green-600 text-black hover:bg-green-500 font-bold px-8"
            disabled={isLoading || betAmount > balance || betAmount < 1 || !!error}
          >
            <Play className="w-4 h-4 mr-2" />
            Deal Cards
          </Button>
        </div>
      </div>

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border-2 border-red-500 rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-red-400 font-bold text-lg">Invalid Bet Amount</h3>
            </div>
            <p className="text-red-300 mb-6">{error}</p>
            <Button
              onClick={() => setShowErrorPopup(false)}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  )
})
BettingControls.displayName = 'BettingControls'

// Playing controls component
const PlayingControls = memo(({ 
  onHit, 
  onStand, 
  onDoubleDown, 
  onInsurance, 
  onSplit, 
  onSurrender,
  canDoubleDown, 
  canInsurance, 
  canSplit, 
  canSurrender,
  isLoading 
}: {
  onHit: () => void
  onStand: () => void
  onDoubleDown: () => void
  onInsurance: () => void
  onSplit: () => void
  onSurrender: () => void
  canDoubleDown: boolean
  canInsurance: boolean
  canSplit: boolean
  canSurrender: boolean
  isLoading: boolean
}) => {
  return (
    <div className="space-y-3">
      {/* Primary actions */}
      <div className="flex gap-2 justify-center flex-wrap">
        <Button
          onClick={onHit}
          className="bg-blue-600 text-white hover:bg-blue-500 font-bold px-4 py-2 text-sm"
          disabled={isLoading}
        >
          Hit
        </Button>
        <Button
          onClick={onStand}
          className="bg-red-600 text-white hover:bg-red-500 font-bold px-4 py-2 text-sm"
          disabled={isLoading}
        >
          Stand
        </Button>
        {canDoubleDown && (
          <Button
            onClick={onDoubleDown}
            className="bg-yellow-600 text-black hover:bg-yellow-500 font-bold px-4 py-2 text-sm"
            disabled={isLoading}
          >
            Double
          </Button>
        )}
      </div>
      
      {/* Secondary actions */}
      {(canInsurance || canSplit || canSurrender) && (
        <div className="flex gap-2 justify-center flex-wrap">
          {canInsurance && (
            <Button
              onClick={onInsurance}
              className="bg-purple-600 text-white hover:bg-purple-500 font-bold px-3 py-1 text-xs"
              disabled={isLoading}
            >
              Insurance
            </Button>
          )}
          {canSplit && (
            <Button
              onClick={onSplit}
              className="bg-orange-600 text-white hover:bg-orange-500 font-bold px-3 py-1 text-xs"
              disabled={isLoading}
            >
              Split
            </Button>
          )}
          {canSurrender && (
            <Button
              onClick={onSurrender}
              className="bg-gray-600 text-white hover:bg-gray-500 font-bold px-3 py-1 text-xs"
              disabled={isLoading}
            >
              Surrender
            </Button>
          )}
        </div>
      )}
    </div>
  )
})
PlayingControls.displayName = 'PlayingControls'

// Deal confirmation dialog
const DealConfirmationDialog = memo(({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  betAmount, 
  balance 
}: {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  betAmount: number
  balance: number
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="bg-black border-green-900/30 text-green-400">
        <DialogHeader>
          <DialogTitle className="text-green-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Confirm Bet
          </DialogTitle>
          <DialogDescription className="text-green-300">
            Are you sure you want to place this bet?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Bet Amount:</span>
            <span className="font-bold">{betAmount} GBC</span>
          </div>
          <div className="flex justify-between">
            <span>Your Balance:</span>
            <span className="font-bold">{balance} GBC</span>
          </div>
          <div className="flex justify-between">
            <span>Balance After Bet:</span>
            <span className="font-bold">{balance - betAmount} GBC</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-green-600 text-green-400 hover:bg-green-900/20"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-green-600 text-black hover:bg-green-500 font-bold"
          >
            Confirm Deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
DealConfirmationDialog.displayName = 'DealConfirmationDialog'

// Main component
const GameTable: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { currentGame, balance, isLoading, error } = useSelector((state: RootState) => state.game)
  const { user } = useSelector((state: RootState) => state.wallet)
  
  // Sync balance between game and wallet
  useBalanceSync()
  
  // Get game stats from history
  const gameStats = useGameStats()
  
  // WebSocket integration for real-time features
  const socket = useSocket(user?.id || 'guest', user?.balance || 1000)
  
  // Unified balance calculation - prioritize user balance from wallet
  const currentBalance = useMemo(() => {
    const walletBalance = user?.balance
    const gameBalance = balance
    
    // Use wallet balance if available, otherwise use game balance
    const finalBalance = walletBalance ?? gameBalance
    
    console.log('💰 Balance calculation:', {
      walletBalance,
      gameBalance,
      username: user?.username,
      final: finalBalance
    })
    
    return finalBalance
  }, [user?.balance, balance]) // Remove username from dependency to prevent logging loops

  // Sync balance with WebSocket
  useEffect(() => {
    if (socket.connected && user && socket.balance !== user.balance) {
      // Update local balance if WebSocket balance differs
      console.log('🔄 Balance sync from WebSocket:', {
        local: user.balance,
        remote: socket.balance
      })
    }
  }, [socket.balance, user?.balance, socket.connected])
  
  // Save game state to server when game changes
  useEffect(() => {
    if (socket.connected && currentGame && user) {
      // Convert Card objects to strings for socket transmission
      const cardToString = (card: any) => `${card.rank}${card.suit[0].toUpperCase()}`
      
      const gameState = {
        id: currentGame.id,
        playerId: user.id,
        deck: (currentGame.deck || []).map(cardToString),
        playerHand: (currentGame.playerHand?.cards || []).map(cardToString),
        dealerHand: (currentGame.dealerHand?.cards || []).map(cardToString),
        playerScore: currentGame.playerHand?.value || 0,
        dealerScore: currentGame.dealerHand?.value || 0,
        bet: currentGame.currentBet || 0,
        balance: currentBalance,
        gameStatus: (currentGame.state === 'BETTING' ? 'betting' : 
                   currentGame.state === 'PLAYING' ? 'playing' : 'finished') as 'betting' | 'playing' | 'finished',
        timestamp: Date.now()
      }
      
      socket.saveGameState(gameState)
    }
  }, [currentGame, socket.connected, user, currentBalance])
  
  // Validate game results with server
  useEffect(() => {
    if (socket.connected && currentGame && currentGame.state === 'ENDED' && 
        currentGame.result && user) {
      
      // Convert Card objects to strings for socket transmission
      const cardToString = (card: any) => `${card.rank}${card.suit[0].toUpperCase()}`
      
      // Map result to socket format
      const resultMap: Record<string, 'win' | 'lose' | 'push'> = {
        'WIN': 'win',
        'LOSE': 'lose',
        'PUSH': 'push',
        'BLACKJACK': 'win',
        'BONUS_WIN': 'win',
        'SURRENDER': 'lose'
      }
      const result = currentGame.result ? (resultMap[String(currentGame.result)] || 'push') : 'push'
      
      // Only validate if game actually ended with a result
      if (currentGame.result) {
        socket.validateGame({
          playerHand: (currentGame.playerHand?.cards || []).map(cardToString),
          dealerHand: (currentGame.dealerHand?.cards || []).map(cardToString),
          result,
          bet: currentGame.currentBet || 0
        })
      }
    }
  }, [currentGame?.state, currentGame?.result, socket.connected, user, currentGame?.currentBet])
  
  const [betAmount, setBetAmount] = useState(1)
  const [showResultModal, setShowResultModal] = useState(false)
  const [showDealConfirmation, setShowDealConfirmation] = useState(false)
  const [isRevealingDealerCards, setIsRevealingDealerCards] = useState(false)
  const [isDealingCards, setIsDealingCards] = useState(false)
  const [dealtPlayerCards, setDealtPlayerCards] = useState<any[]>([])
  const [dealtDealerCards, setDealtDealerCards] = useState<any[]>([])
  
  // Get settings for card dealing speed
  const { cardDealingSpeed } = useSettingsStore()

  // Update bet amount when balance changes
  useEffect(() => {
    if (betAmount > currentBalance) {
      const newAmount = Math.min(currentBalance, 1)
      setBetAmount(newAmount)
    }
  }, [currentBalance, betAmount])

  // Check if game ended and show result modal with delay
  useEffect(() => {
    if (currentGame && currentGame.state === 'ENDED' && currentGame.result) {
      // Start revealing dealer cards
      setIsRevealingDealerCards(true)
      
      // Update balance based on game result via WebSocket
      const netProfit = currentGame.netProfit ?? 0
      if (netProfit !== 0) {
        if (netProfit > 0) {
          socket.updateBalance(netProfit, 'win')
        } else {
          socket.updateBalance(Math.abs(netProfit), 'lose')
        }
      }
      
      // Show result modal after all cards are revealed
      const totalRevealTime = 600 + (currentGame.dealerHand.cards.length * 400) + 800 // Start delay + card reveals + buffer
      setTimeout(() => {
        setShowResultModal(true)
        setIsRevealingDealerCards(false)
      }, totalRevealTime)
    }
  }, [currentGame, socket])

  // Memoized calculations
  const canDoubleDown = useMemo(() => {
    return currentGame?.state === 'PLAYING' && 
           currentGame.playerHand.cards.length === 2 && 
           currentGame.currentBet <= currentBalance
  }, [currentGame, currentBalance])

  const canInsurance = useMemo(() => {
    return currentGame?.state === 'PLAYING' && 
           currentGame.dealerHand?.cards?.length === 2 &&
           currentGame.dealerHand?.cards?.[0]?.rank === 'A' &&
           !currentGame.hasInsurance &&
           currentBalance >= Math.floor(currentGame.currentBet / 2)
  }, [currentGame, currentBalance])

  const canSplit = useMemo(() => {
    return currentGame?.state === 'PLAYING' && 
           currentGame.playerHand?.cards?.length === 2 &&
           currentGame.playerHand?.cards?.[0]?.rank === currentGame.playerHand?.cards?.[1]?.rank &&
           !currentGame.hasSplit &&
           currentBalance >= currentGame.currentBet
  }, [currentGame, currentBalance])

  const canSurrender = useMemo(() => {
    if (!currentGame || currentGame.state !== 'PLAYING') return false
    if (currentGame.playerHand.cards.length !== 2) return false
    if (currentGame.hasSplit || currentGame.hasSurrendered) return false
    if (!currentGame.dealerHand.cards[0]) return false
    
    // Convert to compatible Hand type by ensuring all required properties
    const compatibleHand = {
      ...currentGame.playerHand,
      isSplittable: currentGame.playerHand.isSplittable ?? false,
      canSurrender: currentGame.playerHand.canSurrender ?? false,
      hasSplit: currentGame.playerHand.hasSplit ?? false
    }
    
    return shouldSurrender(compatibleHand, currentGame.dealerHand.cards[0])
  }, [currentGame])

  // Optimized event handlers
  const handleBetChange = useCallback((amount: number) => {
    setBetAmount(amount)
  }, [])

  const handleDeal = useCallback(() => {
    setShowDealConfirmation(true)
  }, [])

  const handleConfirmDeal = useCallback(async () => {
    if (user && betAmount >= 1 && betAmount <= currentBalance) {
      setIsDealingCards(true)
      setDealtPlayerCards([])
      setDealtDealerCards([])
      
      // Update balance via WebSocket (bet deduction)
      socket.updateBalance(-betAmount, 'bet')
      
      // Start the game first
      const resultAction = startNewGame({ userId: user.id, betAmount })
      dispatch(resultAction)
      
      setShowDealConfirmation(false)
      
      // Note: In a real implementation, we would wait for the game response
      // then animate the cards being dealt. For now, we'll simulate it.
      setTimeout(() => {
        setIsDealingCards(false)
      }, 2000) // Reset dealing state after animation
    }
  }, [user, betAmount, currentBalance, dispatch])

  const handleCancelDeal = useCallback(() => {
    setShowDealConfirmation(false)
  }, [])

  const handleHit = useCallback(async () => {
    if (!currentGame || !user) return

    const requestKey = `game-action-${currentGame.id}-hit`
    
    // Prevent duplicate requests using queue
    await requestQueue.execute(requestKey, async () => {
      return dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'hit', 
        userId: user.id 
      }))
    })
  }, [currentGame, user, dispatch])

  const handleStand = useCallback(async () => {
    if (!currentGame || !user) return

    const requestKey = `game-action-${currentGame.id}-stand`
    
    // Prevent duplicate requests using queue
    await requestQueue.execute(requestKey, async () => {
      return dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'stand', 
        userId: user.id 
      }))
    })
  }, [currentGame, user, dispatch])

  const handleDoubleDown = useCallback(async () => {
    if (!currentGame || !user) return

    const requestKey = `game-action-${currentGame.id}-double`
    
    // Prevent duplicate requests using queue
    await requestQueue.execute(requestKey, async () => {
      return dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'double_down', 
        userId: user.id 
      }))
    })
  }, [currentGame, user, dispatch])

  const handleInsurance = useCallback(() => {
    if (currentGame && user) {
      dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'insurance', 
        userId: user.id 
      }))
    }
  }, [currentGame, user, dispatch])

  const handleSplit = useCallback(() => {
    if (currentGame && user) {
      dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'split', 
        userId: user.id 
      }))
    }
  }, [currentGame, user, dispatch])

  const handleSurrender = useCallback(() => {
    if (currentGame && user) {
      dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'surrender', 
        userId: user.id 
      }))
    }
  }, [currentGame, user, dispatch])

  const handlePlayAgain = useCallback(() => {
    setShowResultModal(false)
    setBetAmount(1)
    dispatch(resetGame())
  }, [dispatch])

  // Memoized dealer cards with reveal animation
  const dealerCards = useMemo(() => {
    if (!currentGame) return []
    return currentGame.dealerHand.cards.map((card, index) => (
      <MemoizedCard 
        key={index} 
        card={card} 
        size="small"
        isRevealing={isRevealingDealerCards}
        index={index}
        isDealer={true}
      />
    ))
  }, [currentGame, isRevealingDealerCards])

  // Memoized player cards with dealing animation
  const playerCards = useMemo(() => {
    if (!currentGame) return []
    
    // If dealing, show animated cards
    if (isDealingCards) {
      return dealtPlayerCards.map((card, index) => (
        <div 
          key={index} 
          className="transform transition-all duration-300 ease-in-out"
          style={{
            animationDelay: `${index * 150}ms`,
            animation: 'slideIn 0.3s ease-out forwards'
          }}
        >
          <MemoizedCard card={card} size="small" />
        </div>
      ))
    }
    
    // Show actual game cards
    return currentGame.playerHand.cards.map((card, index) => (
      <div 
        key={index} 
        className="transform transition-all duration-300 ease-in-out"
        style={{
          animationDelay: `${index * 150}ms`,
          animation: 'slideIn 0.3s ease-out forwards'
        }}
      >
        <MemoizedCard card={card} size="small" />
      </div>
    ))
  }, [currentGame, isDealingCards, dealtPlayerCards])

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-black border-green-900/30">
          <CardContent className="p-4 text-center">
            <p className="text-green-400">Please connect your wallet to play</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Game Stats - Compact */}
      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xs text-green-600">Player</p>
                <p className="text-sm font-bold text-green-400">{user.username || 'Anonymous'}</p>
              </div>
            </div>
            <GameIndicators 
              wins={gameStats.wins}
              losses={gameStats.losses}
              pushes={gameStats.pushes}
              blackjacks={gameStats.blackjacks}
            />
            <Badge variant="outline" className="text-green-400 border-green-600">
              <Coins className="w-4 h-4 mr-1" />
              {currentBalance.toLocaleString()} GBC
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Game Table - Compact */}
      <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-900/30 relative">
        <CardContent className="p-4">
          {/* Card Deck in Corner - Only show when game is active */}
          {currentGame && currentGame.state !== 'BETTING' && (
            <div className="absolute top-4 right-4">
              <CardDeck />
            </div>
          )}
          
          {/* Dealer Section */}
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="text-base font-semibold text-green-400">Dealer</h3>
              {currentGame && currentGame.state === 'ENDED' && (
                <Badge variant={currentGame.dealerHand.isBust ? "destructive" : "default"} className="bg-green-600 text-black text-xs">
                  Value: {currentGame.dealerHand.value}
                  {currentGame.dealerHand.isBust && ' (Bust)'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 min-h-[80px]">
              {dealerCards}
            </div>
          </div>

          {/* Message */}
          <div className="text-center py-2">
            <p className="text-xl font-bold text-green-400">
              {currentGame ? (
                currentGame.state === 'PLAYING' ? 'Your Turn' :
                currentGame.state === 'ENDED' ? `Game ${currentGame.result}` :
                'Place Your Bet'
              ) : 'Ready to Play'}
            </p>
            {error && (
              <p className="text-red-400 text-sm mt-1">{error}</p>
            )}
          </div>

          {/* Player Section */}
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="text-base font-semibold text-green-400">Player</h3>
              {currentGame && currentGame.playerHand.cards.length > 0 && (
                <Badge variant={currentGame.playerHand.isBust ? "destructive" : "default"} className="bg-green-600 text-black text-xs">
                  Value: {currentGame.playerHand.value}
                  {currentGame.playerHand.isBust && ' (Bust)'}
                  {currentGame.playerHand.isBlackjack && ' (Blackjack!)'}
                  {currentGame.playerHand.value === 21 && !currentGame.playerHand.isBlackjack && ' (21)'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 min-h-[80px]">
              {playerCards}
            </div>
          </div>

          {/* Game Controls */}
          <div className="flex flex-col items-center space-y-3">
            {!currentGame && (
              <BettingControls
                betAmount={betAmount}
                onBetChange={handleBetChange}
                onDeal={handleDeal}
                balance={currentBalance}
                isLoading={isLoading}
              />
            )}

            {currentGame && currentGame.state === 'BETTING' && (
              <BettingControls
                betAmount={betAmount}
                onBetChange={handleBetChange}
                onDeal={handleDeal}
                balance={currentBalance}
                isLoading={isLoading}
              />
            )}

            {currentGame && (currentGame.state === 'PLAYING' || currentGame.state === 'DEALER') && (
              <PlayingControls
                onHit={handleHit}
                onStand={handleStand}
                onDoubleDown={handleDoubleDown}
                onInsurance={handleInsurance}
                onSplit={handleSplit}
                onSurrender={handleSurrender}
                canDoubleDown={canDoubleDown}
                canInsurance={canInsurance}
                canSplit={canSplit}
                canSurrender={canSurrender}
                isLoading={isLoading}
              />
            )}

            {/* Current Bet Display */}
            {currentGame && currentGame.currentBet > 0 && (
              <div className="text-center">
                <Badge variant="outline" className="text-green-400 border-green-600">
                  Current Bet: {currentGame.currentBet.toLocaleString()} GBC
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deal Confirmation Dialog */}
      <DealConfirmationDialog
        isOpen={showDealConfirmation}
        onConfirm={handleConfirmDeal}
        onCancel={handleCancelDeal}
        betAmount={betAmount}
        balance={currentBalance}
      />

      {/* Game Result Modal */}
      {showResultModal && currentGame && currentGame.state === 'ENDED' && currentGame.result && (() => {
        // Convert GameResult to modal result format - only show if game actually ended with result
        const resultStr = String(currentGame.result).toLowerCase()
        const modalResult = (['win', 'lose', 'push', 'blackjack', 'bonus_win'].includes(resultStr) 
          ? resultStr 
          : 'push') as 'win' | 'lose' | 'push' | 'blackjack' | 'bonus_win'
        
        return (
          <GameResultModal
            isOpen={showResultModal}
            result={modalResult}
            playerHand={currentGame.playerHand}
            dealerHand={currentGame.dealerHand}
            betAmount={currentGame.currentBet}
            winAmount={(currentGame.netProfit ?? 0) > 0 ? currentGame.currentBet + (currentGame.netProfit ?? 0) : 0}
            onPlayAgain={handlePlayAgain}
          />
        )
      })()}
    </div>
  )
}

export default GameTable