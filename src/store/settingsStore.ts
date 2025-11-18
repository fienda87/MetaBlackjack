'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CardDealingSpeed = 'slow' | 'normal' | 'fast'

interface GameSettings {
  cardDealingSpeed: CardDealingSpeed
}

interface SettingsStore extends GameSettings {
  // Actions
  setCardDealingSpeed: (speed: CardDealingSpeed) => void
  resetToDefaults: () => void
}

const defaultSettings: GameSettings = {
  cardDealingSpeed: 'normal',
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setCardDealingSpeed: (speed) => set({ cardDealingSpeed: speed }),
      
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'blackjack-settings',
    }
  )
)

// Helper function to get delay in milliseconds based on speed
export const getCardDealingDelay = (speed: CardDealingSpeed): number => {
  switch (speed) {
    case 'slow':
      return 1000 // 1 second
    case 'normal':
      return 500  // 0.5 second
    case 'fast':
      return 200  // 0.2 second
    default:
      return 500
  }
}