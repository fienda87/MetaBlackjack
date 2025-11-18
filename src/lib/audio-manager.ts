export interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  musicEnabled: boolean
  sfxEnabled: boolean
}

// Mock audio manager for development - no external dependencies
class AudioManager {
  private settings: AudioSettings = {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    musicEnabled: true,
    sfxEnabled: true
  }

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioSettings')
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) }
      }
    }
  }

  private saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioSettings', JSON.stringify(this.settings))
    }
  }

  // Sound Effects Methods - No-op for now
  playSound(soundName: string) {
    console.log(`[Audio] Playing sound: ${soundName}`)
  }

  playButtonSound() {
    this.playSound('button-click')
  }

  playCardDealSound() {
    this.playSound('card-deal')
  }

  playCardFlipSound() {
    this.playSound('card-flip')
  }

  playChipPlaceSound() {
    this.playSound('chip-place')
  }

  playWinSound() {
    this.playSound('win')
  }

  playLoseSound() {
    this.playSound('lose')
  }

  playBlackjackSound() {
    this.playSound('blackjack')
  }

  playPushSound() {
    this.playSound('push')
  }

  playBustSound() {
    this.playSound('bust')
  }

  // Background Music Methods - No-op for now
  playBackgroundMusic() {
    console.log('[Audio] Playing background music')
  }

  stopBackgroundMusic() {
    console.log('[Audio] Stopping background music')
  }

  pauseBackgroundMusic() {
    console.log('[Audio] Pausing background music')
  }

  resumeBackgroundMusic() {
    console.log('[Audio] Resuming background music')
  }

  // Settings Methods
  updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
    console.log('[Audio] Settings updated:', this.settings)
  }

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  // Utility Methods
  isBackgroundMusicPlaying(): boolean {
    return false
  }

  getBackgroundMusicPosition(): number {
    return 0
  }

  setBackgroundMusicPosition(position: number) {
    // No-op
  }

  // Test method to check if audio files exist
  async testAudioFiles() {
    const results: { [key: string]: boolean } = {}
    
    const soundFiles = [
      'button-click', 'card-deal', 'card-flip', 'chip-place', 
      'win', 'lose', 'blackjack', 'push', 'bust'
    ]

    for (const name of soundFiles) {
      try {
        const response = await fetch(`/audio/sfx/${name}.mp3`, { method: 'HEAD' })
        results[name] = response.ok
      } catch {
        results[name] = false
      }
    }

    try {
      const response = await fetch('/audio/music/background-music.mp3', { method: 'HEAD' })
      results['background-music'] = response.ok
    } catch {
      results['background-music'] = false
    }

    return results
  }
}

// Create singleton instance
export const audioManager = new AudioManager()

// Export types and utilities
export type { AudioManager }
export default audioManager