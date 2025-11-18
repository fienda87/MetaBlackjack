import React from 'react'
import { Card } from '@/domain/entities/Game'

export function createCardDisplay(card: Card, size: 'small' | 'medium' | 'large' = 'medium'): React.ReactElement {
  const sizeClasses = {
    small: 'w-12 h-16 text-xs',
    medium: 'w-16 h-20 text-sm',
    large: 'w-20 h-24 text-base'
  }

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }

  const suitColors = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-black',
    spades: 'text-black'
  }

  const displayValues: Record<string, string> = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K'
  }

  return (
    <div className={`${sizeClasses[size]} bg-white border-2 border-gray-800 rounded-lg flex flex-col items-center justify-center shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105`}>
      <div className={`font-bold ${suitColors[card.suit]}`}>
        {displayValues[card.rank]}
      </div>
      <div className={`text-2xl ${suitColors[card.suit]}`}>
        {suitSymbols[card.suit]}
      </div>
    </div>
  )
}

export function createHiddenCard(size: 'small' | 'medium' | 'large' = 'medium'): React.ReactElement {
  const sizeClasses = {
    small: 'w-12 h-16',
    medium: 'w-16 h-20',
    large: 'w-20 h-24'
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-gray-800 rounded-lg flex items-center justify-center shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105`}>
      <div className="text-white text-2xl font-bold">?</div>
    </div>
  )
}

// Additional helper functions for GameHistory and other components
export function formatGBC(amount: number): string {
  return `${amount.toLocaleString()} GBC`
}

export function getResultColor(result: string): string {
  switch (result.toLowerCase()) {
    case 'win':
    case 'blackjack':
      return 'text-green-400'
    case 'lose':
      return 'text-red-400'
    case 'push':
      return 'text-yellow-400'
    default:
      return 'text-gray-400'
  }
}

export function getResultBadgeClass(result: string): string {
  switch (result.toLowerCase()) {
    case 'win':
      return 'bg-green-600 text-black'
    case 'lose':
      return 'bg-red-600 text-white'
    case 'push':
      return 'bg-yellow-600 text-black'
    case 'blackjack':
      return 'bg-purple-600 text-white'
    default:
      return 'bg-gray-600 text-white'
  }
}

export function formatGameResult(result: string): string {
  switch (result.toLowerCase()) {
    case 'win':
      return 'Win'
    case 'lose':
      return 'Loss'
    case 'push':
      return 'Push'
    case 'blackjack':
      return 'Blackjack!'
    default:
      return result
  }
}