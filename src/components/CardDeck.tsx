'use client'

import React from 'react'

interface CardDeckProps {
  className?: string
}

export default function CardDeck({ className = '' }: CardDeckProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Card deck stack with entrance animation */}
      <div className="relative w-12 h-16 sm:w-14 sm:h-20 animate-in slide-in-from-right-2 fade-in duration-500">
        {/* Multiple cards to create deck effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 shadow-lg" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 shadow-lg" 
             style={{ transform: 'translate(-1px, -1px)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 shadow-lg" 
             style={{ transform: 'translate(-2px, -2px)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 shadow-lg" 
             style={{ transform: 'translate(-3px, -3px)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 shadow-lg" 
             style={{ transform: 'translate(-4px, -4px)' }} />
        
        {/* Top card with pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg border-2 border-blue-600 shadow-xl flex items-center justify-center">
          <div className="text-blue-300 text-xs sm:text-sm font-bold opacity-50">
            ♠♥♣♦
          </div>
        </div>
      </div>
      
      {/* Deck label */}
      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-green-400 opacity-70 whitespace-nowrap animate-in fade-in duration-700 delay-200">
        Deck
      </div>
    </div>
  )
}