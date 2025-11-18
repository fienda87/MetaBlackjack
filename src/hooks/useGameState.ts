'use client'

import { useState, useEffect, useCallback } from 'react'

interface GameSettings {
  cardDealingSpeed: number
  soundEnabled: boolean
  musicEnabled: boolean
  notificationsEnabled: boolean
  showAnimations: boolean
  showTips: boolean
  confirmBets: boolean
}

export function useGameState() {
  const [balance, setBalance] = useState(1000)
  const [settings, setSettings] = useState<GameSettings>({
    cardDealingSpeed: 1,
    soundEnabled: true,
    musicEnabled: false,
    notificationsEnabled: true,
    showAnimations: true,
    showTips: true,
    confirmBets: true
  })
  const [loading, setLoading] = useState(true)

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/user')
      if (response.ok) {
        const data = await response.json()
        setBalance(data.user.balance)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }, [])

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }, [])

  // Update balance
  const updateBalance = useCallback(async (newBalance: number) => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance })
      })
      if (response.ok) {
        setBalance(newBalance)
      }
    } catch (error) {
      console.error('Error updating balance:', error)
    }
  }, [])

  // Save game result
  const saveGameResult = useCallback(async (gameData: {
    playerHand: any[]
    dealerHand: any[]
    playerValue: number
    dealerValue: number
    betAmount: number
    result: string
    winAmount: number
    isBlackjack: boolean
    isBust: boolean
  }) => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      })
      if (response.ok) {
        const data = await response.json()
        setBalance(data.newBalance)
        return data
      }
    } catch (error) {
      console.error('Error saving game result:', error)
    }
  }, [])

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<GameSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }, [])

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      await Promise.all([fetchUser(), fetchSettings()])
      setLoading(false)
    }
    initializeData()
  }, [fetchUser, fetchSettings])

  return {
    balance,
    settings,
    loading,
    updateBalance,
    saveGameResult,
    updateSettings,
    refetchUser: fetchUser
  }
}