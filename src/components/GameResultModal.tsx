'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  TrendingDown, 
  RotateCcw,
  Target,
  Star
} from 'lucide-react'
import { useAudio } from '@/hooks/useAudio'
// Simple imports - KISS principle
import { createCardDisplay, createHiddenCard, formatGameResult, formatGBC, getResultColor, getResultBadgeClass } from '@/lib/ui-helpers'

interface GameResultModalProps {
  isOpen: boolean
  result: 'win' | 'lose' | 'push' | 'blackjack' | 'bonus_win'
  playerHand: { cards: any[], value: number, isBlackjack: boolean }
  dealerHand: { cards: any[], value: number, isBust: boolean }
  betAmount: number
  winAmount: number
  insuranceWin?: number
  bonusType?: string
  bonusMultiplier?: number
  basePayout?: number
  totalPayout?: number
  onPlayAgain: () => void
}

export default function GameResultModal({
  isOpen,
  result,
  playerHand,
  dealerHand,
  betAmount,
  winAmount,
  insuranceWin = 0,
  bonusType,
  bonusMultiplier,
  basePayout,
  totalPayout,
  onPlayAgain
}: GameResultModalProps) {
  const { playButtonSound } = useAudio()

  // Play sound effect when modal opens
  useEffect(() => {
    if (isOpen) {
      // Sound is already played in the game logic, but we can add additional effects here if needed
      console.log('[GameResultModal] Opened with data:', {
        playerCardCount: playerHand.cards?.length,
        dealerCardCount: dealerHand.cards?.length,
        playerCards: playerHand.cards,
        dealerCards: dealerHand.cards,
        result
      })
    }
  }, [isOpen, playerHand, dealerHand, result])

  if (!isOpen) return null

  const getResultConfig = () => {
    switch (result) {
      case 'bonus_win':
        return {
          icon: <Trophy className="w-12 h-12 text-purple-400" />,
          title: 'BONUS WIN!',
          subtitle: getBonusDescription(bonusType, bonusMultiplier),
          bgColor: 'bg-gradient-to-br from-purple-900/30 to-purple-800/20',
          borderColor: 'border-purple-600/50',
          titleColor: 'text-purple-400'
        }
      case 'blackjack':
        return {
          icon: <Trophy className="w-12 h-12 text-yellow-400" />,
          title: 'BLACKJACK!',
          subtitle: 'Perfect 2-card hand! (3:2 payout)',
          bgColor: 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20',
          borderColor: 'border-yellow-600/50',
          titleColor: 'text-yellow-400'
        }
      case 'win':
        return {
          icon: <Trophy className="w-12 h-12 text-green-400" />,
          title: 'YOU WIN!',
          subtitle: playerHand.value === 21 && !playerHand.isBlackjack ? '21 with multiple cards!' : 'Congratulations!',
          bgColor: 'bg-gradient-to-br from-green-900/30 to-green-800/20',
          borderColor: 'border-green-600/50',
          titleColor: 'text-green-400'
        }
      case 'lose':
        return {
          icon: <TrendingDown className="w-12 h-12 text-red-400" />,
          title: 'YOU LOSE',
          subtitle: 'Better luck next time',
          bgColor: 'bg-gradient-to-br from-red-900/30 to-red-800/20',
          borderColor: 'border-red-600/50',
          titleColor: 'text-red-400'
        }
      case 'push':
        return {
          icon: <Target className="w-12 h-12 text-yellow-400" />,
          title: 'PUSH',
          subtitle: 'It\'s a tie!',
          bgColor: 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20',
          borderColor: 'border-yellow-600/50',
          titleColor: 'text-yellow-400'
        }
      default:
        return {
          icon: <Target className="w-12 h-12 text-gray-400" />,
          title: 'GAME OVER',
          subtitle: '',
          bgColor: 'bg-gradient-to-br from-gray-900/30 to-gray-800/20',
          borderColor: 'border-gray-600/50',
          titleColor: 'text-gray-400'
        }
    }
  }

  const getBonusDescription = (type?: string, multiplier?: number): string => {
    if (!type || !multiplier) return ''
    
    switch (type) {
      case 'triple7':
        return `Triple 7s! (${multiplier - 1}:1 payout)`
      case 'perfectPair':
        return `Perfect Pair! (${multiplier - 1}:1 payout)`
      case 'flush':
        return `Flush Bonus! (+${((multiplier - 1) * 100).toFixed(0)}% payout)`
      case 'straight':
        return `Straight Bonus! (+${((multiplier - 1) * 100).toFixed(0)}% payout)`
      default:
        return `Special Bonus! (${multiplier - 1}:1 payout)`
    }
  }

  const config = getResultConfig()

  // Simple card display using shared utilities - DRY principle

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`${config.bgColor} ${config.borderColor} border-2 max-w-xs w-full mx-4 max-h-[80vh] overflow-y-auto`}>
        <CardContent className="p-3">
          {/* Result Header */}
          <div className="text-center mb-3">
            <div className="flex justify-center mb-1">
              {config.icon}
            </div>
            <h2 className={`text-xl font-bold ${config.titleColor} mb-1`}>
              {config.title}
            </h2>
            <p className="text-green-300 text-xs">{config.subtitle}</p>
          </div>

          {/* Hand Results */}
          <div className="space-y-2 mb-3">
            {/* Dealer Hand */}
            <div className="bg-black/30 rounded-lg p-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-green-400 font-semibold text-xs">Dealer</span>
                <Badge variant="outline" className="border-green-600 text-green-400 text-xs">
                  {dealerHand.value}
                  {dealerHand.isBust && ' (Bust)'}
                </Badge>
              </div>
              <div className="flex gap-0.5 justify-center">
                {dealerHand.cards.map((card, index) => (
                  <div key={index}>{createCardDisplay(card, 'small')}</div>
                ))}
              </div>
            </div>

            {/* Player Hand */}
            <div className="bg-black/30 rounded-lg p-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-green-400 font-semibold text-xs">Player</span>
                <Badge variant="outline" className="border-green-600 text-green-400 text-xs">
                  {playerHand.value}
                  {playerHand.isBlackjack && ' (Blackjack)'}
                  {playerHand.value === 21 && !playerHand.isBlackjack && ' (21)'}
                </Badge>
              </div>
              <div className="flex gap-0.5 justify-center">
                {playerHand.cards.map((card, index) => (
                  <div key={index}>{createCardDisplay(card, 'small')}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Betting Results */}
          <div className="bg-black/30 rounded-lg p-2 mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-green-300 text-xs">Bet Amount:</span>
              <span className="text-green-400 font-semibold text-sm">{formatGBC(betAmount)}</span>
            </div>
            
            {/* Bonus Details */}
            {result === 'bonus_win' && basePayout && totalPayout && (
              <div className="bg-purple-900/20 rounded p-1.5 mb-2 border border-purple-700/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-purple-300 text-xs">Base Payout:</span>
                  <span className="text-purple-400 font-semibold text-xs">{formatGBC(basePayout - betAmount)}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-purple-300 text-xs">Bonus Extra:</span>
                  <span className="text-purple-400 font-bold text-xs">+{formatGBC(totalPayout - basePayout)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 font-semibold text-xs">Total Win:</span>
                  <span className="text-purple-400 font-bold text-sm">{formatGBC(totalPayout - betAmount)}</span>
                </div>
              </div>
            )}
            
            {/* Win/Loss breakdown */}
            {result !== 'push' && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-green-300 text-xs">
                  {result === 'lose' ? 'Loss:' : result === 'blackjack' ? 'Blackjack Bonus (3:2):' : 'Win Bonus (1:1):'}
                </span>
                <span className={`font-bold text-sm ${result === 'lose' ? 'text-red-400' : 'text-green-400'}`}>
                  {result === 'lose' ? '-' : '+'}{formatGBC(result === 'lose' ? betAmount : winAmount - betAmount)}
                </span>
              </div>
            )}
            
            {insuranceWin > 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-blue-300 text-xs">Insurance Win (2:1):</span>
                <span className="text-blue-400 font-bold text-sm">
                  +{formatGBC(insuranceWin)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-1 border-t border-green-800/30">
              <span className="text-green-300 font-semibold text-xs">Total Return:</span>
              <span className={`font-bold text-lg ${getResultColor(result)}`}>
                {formatGBC((result === 'lose' ? 0 : result === 'push' ? betAmount : winAmount) + insuranceWin)}
              </span>
            </div>
            
            {/* Net Profit/Loss */}
            <div className="flex justify-between items-center mt-1 pt-1 border-t border-green-800/20">
              <span className="text-gray-400 text-xs">Net {result === 'lose' ? 'Loss' : 'Profit'}:</span>
              <span className={`font-bold text-sm ${result === 'lose' ? 'text-red-400' : result === 'push' ? 'text-yellow-400' : 'text-green-400'}`}>
                {result === 'lose' ? '-' : '+'}{formatGBC(
                  result === 'lose' ? betAmount : 
                  result === 'push' ? 0 : 
                  (winAmount - betAmount) + insuranceWin
                )}
              </span>
            </div>
          </div>

          {/* Special Achievement */}
          {(result === 'blackjack' || result === 'bonus_win') && (
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-xs">
                  {result === 'blackjack' ? 'Blackjack Bonus!' : 'Special Achievement!'}
                </span>
                <Star className="w-3 h-3 text-yellow-400" />
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            className="w-full bg-green-600 text-black hover:bg-green-500 font-bold py-1.5 text-xs"
            onClick={() => {
              playButtonSound()
              onPlayAgain()
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Play Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}