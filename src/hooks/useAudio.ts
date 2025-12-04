'use client'

import { useEffect } from 'react'
import React from 'react'
import { audioManager } from '@/lib/audio-manager'

export function useAudio() {
  // Initialize audio on first mount
  useEffect(() => {
    // Start background music when component mounts (optional)
    // audioManager.playBackgroundMusic()
    
    return () => {
      // Cleanup when component unmounts
      // audioManager.stopBackgroundMusic()
    }
  }, [])

  return {
    // Sound effects
    playButtonSound: () => audioManager.playButtonSound(),
    playCardDealSound: () => audioManager.playCardDealSound(),
    playWinSound: () => audioManager.playWinSound(),
    playLoseSound: () => audioManager.playLoseSound(),
    playBlackjackSound: () => audioManager.playBlackjackSound(),
    playPushSound: () => audioManager.playPushSound(),
    playBustSound: () => audioManager.playBustSound(),
    
    // Background music
    playBackgroundMusic: () => audioManager.playBackgroundMusic(),
    stopBackgroundMusic: () => audioManager.stopBackgroundMusic(),
    pauseBackgroundMusic: () => audioManager.pauseBackgroundMusic(),
    resumeBackgroundMusic: () => audioManager.resumeBackgroundMusic(),
    
    // Settings
    getSettings: () => audioManager.getSettings(),
    updateSettings: (settings: any) => audioManager.updateSettings(settings),
    
    // Utility
    isMusicPlaying: () => audioManager.isBackgroundMusicPlaying(),
    testAudioFiles: () => audioManager.testAudioFiles(),
  }
}

// Higher-order component for adding sound effects to buttons
export function withSound<T extends React.ComponentType<any>>(
  Component: T,
  soundType: 'button' | 'chip' = 'button'
) {
  return function WithSoundComponent(props: React.ComponentProps<T>) {
    const { playButtonSound } = useAudio()
    
    const handleClick = (e: React.MouseEvent) => {
      // Play sound before original handler
      if (soundType === 'button') {
        playButtonSound()
      }
      
      // Call original onClick if exists
      const originalOnClick = props.onClick
      if (originalOnClick) {
        originalOnClick(e)
      }
    }
    
    return React.createElement(Component, { ...props, onClick: handleClick })
  }
}