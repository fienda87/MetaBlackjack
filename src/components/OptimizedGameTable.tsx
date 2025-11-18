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
  Plus, 
  Minus, 
  Play, 
  RotateCcw,
  Coins
} from 'lucide-react'
import { RootState, AppDispatch } from '@/application/store'
import { startNewGame, makeGameAction, resetGame } from '@/application/store/gameSlice'
import { createCardDisplay, createHiddenCard } from '@/lib/ui-helpers'
import GameResultModal from '@/components/GameResultModal'

// Memoized card component
const MemoizedCard = memo(({ card, size }: { card: any; size: 'small' | 'medium' | 'large' }) => {
  return createCardDisplay(card, size)
})
MemoizedCard.displayName = 'MemoizedCard'

// Memoized betting controls
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
  const quickBetAmounts = useMemo(() => [0.01, 0.025, 0.05, 0.1], [])
  
  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <Label className="text-green-400">Bet Amount (GBC)</Label>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBetChange(Math.max(0.01, betAmount - 0.01))}
            className="border-green-600 text-green-400 hover:bg-green-900/20"
            disabled={isLoading}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-green-400 font-bold text-xl w-20 text-center">{betAmount.toFixed(3)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBetChange(Math.min(balance, betAmount + 0.01))}
            className="border-green-600 text-green-400 hover:bg-green-900/20"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="text-center">
        <Label className="text-green-400">Quick Bet</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {quickBetAmounts.map(amount => (
            <Button
              key={amount}
              variant={betAmount === amount ? "default" : "outline"}
              size="sm"
              className={betAmount === amount 
                ? "bg-green-600 text-black" 
                : "border-green-600 text-green-400 hover:bg-green-900/20"
              }
              onClick={() => onBetChange(Math.min(balance, amount))}
              disabled={amount > balance || isLoading}
            >
              {amount} GBC
            </Button>
          ))}
          <Button
            variant={betAmount === balance ? "default" : "outline"}
            size="sm"
            className={betAmount === balance 
              ? "bg-green-600 text-black" 
              : "border-green-600 text-green-400 hover:bg-green-900/20"
            }
            onClick={() => onBetChange(balance)}
            disabled={isLoading}
          >
            All In
          </Button>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          onClick={onDeal}
          className="bg-green-600 text-black hover:bg-green-500 font-bold px-8"
          disabled={isLoading || betAmount > balance || betAmount <= 0}
        >
          <Play className="w-5 h-5 mr-2" />
          Deal Cards
        </Button>
      </div>
    </div>
  )
})
BettingControls.displayName = 'BettingControls'

// Memoized playing controls
const PlayingControls = memo(({ 
  onHit, 
  onStand, 
  onDoubleDown, 
  canDoubleDown, 
  isLoading 
}: {
  onHit: () => void
  onStand: () => void
  onDoubleDown: () => void
  canDoubleDown: boolean
  isLoading: boolean
}) => {
  return (
    <div className="flex gap-4 justify-center">
      <Button
        onClick={onHit}
        className="bg-blue-600 text-white hover:bg-blue-500 font-bold"
        disabled={isLoading}
      >
        Hit
      </Button>
      <Button
        onClick={onStand}
        className="bg-red-600 text-white hover:bg-red-500 font-bold"
        disabled={isLoading}
      >
        Stand
      </Button>
      {canDoubleDown && (
        <Button
          onClick={onDoubleDown}
          className="bg-yellow-600 text-black hover:bg-yellow-500 font-bold"
          disabled={isLoading}
        >
          Double Down
        </Button>
      )}
    </div>
  )
})
PlayingControls.displayName = 'PlayingControls'

// Main component
const OptimizedGameTable: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { currentGame, balance, isLoading, error } = useSelector((state: RootState) => state.game)
  const { user } = useSelector((state: RootState) => state.wallet)
  
  const [betAmount, setBetAmount] = useState(0.01)
  const [showResultModal, setShowResultModal] = useState(false)

  // Update bet amount when balance changes
  useEffect(() => {
    if (betAmount > balance) {
      setBetAmount(Math.min(balance, 0.01))
    }
  }, [balance, betAmount])

  // Check if game ended and show result modal
  useEffect(() => {
    if (currentGame && currentGame.state === 'ENDED' && currentGame.result) {
      setShowResultModal(true)
    }
  }, [currentGame])

  // Memoized calculations
  const canDoubleDown = useMemo(() => {
    return currentGame?.state === 'PLAYING' && 
           currentGame.playerHand.cards.length === 2 && 
           currentGame.currentBet <= balance
  }, [currentGame, balance])

  // Optimized event handlers
  const handleBetChange = useCallback((amount: number) => {
    setBetAmount(amount)
  }, [])

  const handleDeal = useCallback(() => {
    if (user && betAmount > 0) {
      dispatch(startNewGame({ userId: user.id, betAmount }))
    }
  }, [user, betAmount, dispatch])

  const handleHit = useCallback(() => {
    if (currentGame && user) {
      dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'hit', 
        userId: user.id 
      }))
    }
  }, [currentGame, user, dispatch])

  const handleStand = useCallback(() => {
    if (currentGame && user) {
      dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'stand', 
        userId: user.id 
      }))
    }
  }, [currentGame, user, dispatch])

  const handleDoubleDown = useCallback(() => {
    if (currentGame && user) {
      dispatch(makeGameAction({ 
        gameId: currentGame.id, 
        action: 'double_down', 
        userId: user.id 
      }))
    }
  }, [currentGame, user, dispatch])

  const handlePlayAgain = useCallback(() => {
    setShowResultModal(false)
    setBetAmount(0.01)
    // Clear the current game to show betting controls again
    dispatch(resetGame())
  }, [dispatch])

  // Memoized dealer cards
  const dealerCards = useMemo(() => {
    if (!currentGame) return []
    return currentGame.dealerHand.cards.map((card, index) => (
      <div 
        key={index} 
        className="transform transition-all duration-300 ease-in-out"
        style={{
          animationDelay: `${index * 150}ms`,
          animation: 'slideIn 0.3s ease-out forwards'
        }}
      >
        {index === 1 && currentGame.state !== 'ENDED' 
          ? createHiddenCard('medium') 
          : <MemoizedCard card={card} size="medium" />
        }
      </div>
    ))
  }, [currentGame])

  // Memoized player cards
  const playerCards = useMemo(() => {
    if (!currentGame) return []
    return currentGame.playerHand.cards.map((card, index) => (
      <div 
        key={index} 
        className="transform transition-all duration-300 ease-in-out"
        style={{
          animationDelay: `${index * 150}ms`,
          animation: 'slideIn 0.3s ease-out forwards'
        }}
      >
        <MemoizedCard card={card} size="medium" />
      </div>
    ))
  }, [currentGame])

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-black border-green-900/30">
          <CardContent className="p-8 text-center">
            <p className="text-green-400">Please connect your wallet to play</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Game Stats */}
      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xs text-green-600">Player</p>
                <p className="text-sm font-bold text-green-400">{user.username || 'Anonymous'}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-400 border-green-600">
              <Coins className="w-4 h-4 mr-1" />
              {balance.toFixed(4)} GBC
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Game Table */}
      <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-900/30">
        <CardContent className="p-8">
          {/* Dealer Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold text-green-400">Dealer</h3>
              {currentGame && currentGame.state === 'ENDED' && (
                <Badge variant={currentGame.dealerHand.isBust ? "destructive" : "default"} className="bg-green-600 text-black">
                  Value: {currentGame.dealerHand.value}
                  {currentGame.dealerHand.isBust && ' (Bust)'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 min-h-[100px]">
              {dealerCards}
            </div>
          </div>

          {/* Message */}
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-green-400">
              {currentGame ? (
                currentGame.state === 'PLAYING' ? 'Your Turn' :
                currentGame.state === 'ENDED' ? `Game ${currentGame.result}` :
                'Place Your Bet'
              ) : 'Ready to Play'}
            </p>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Player Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold text-green-400">Player</h3>
              {currentGame && currentGame.playerHand.cards.length > 0 && (
                <Badge variant={currentGame.playerHand.isBust ? "destructive" : "default"} className="bg-green-600 text-black">
                  Value: {currentGame.playerHand.value}
                  {currentGame.playerHand.isBust && ' (Bust)'}
                  {currentGame.playerHand.isBlackjack && ' (Blackjack!)'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 min-h-[100px]">
              {playerCards}
            </div>
          </div>

          {/* Game Controls */}
          <div className="flex flex-col items-center space-y-4">
            {!currentGame && (
              <BettingControls
                betAmount={betAmount}
                onBetChange={handleBetChange}
                onDeal={handleDeal}
                balance={balance}
                isLoading={isLoading}
              />
            )}

            {currentGame && currentGame.state === 'BETTING' && (
              <BettingControls
                betAmount={betAmount}
                onBetChange={handleBetChange}
                onDeal={handleDeal}
                balance={balance}
                isLoading={isLoading}
              />
            )}

            {currentGame && (currentGame.state === 'PLAYING' || currentGame.state === 'DEALER') && (
              <PlayingControls
                onHit={handleHit}
                onStand={handleStand}
                onDoubleDown={handleDoubleDown}
                canDoubleDown={canDoubleDown}
                isLoading={isLoading}
              />
            )}

            {/* Current Bet Display */}
            {currentGame && currentGame.currentBet > 0 && (
              <div className="text-center">
                <Badge variant="outline" className="text-green-400 border-green-600">
                  Current Bet: {currentGame.currentBet.toFixed(3)} GBC
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game Result Modal */}
      {showResultModal && currentGame && (() => {
        // Convert GameResult to modal result format
        const resultStr = String(currentGame.result || 'PUSH').toLowerCase()
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

export default OptimizedGameTable