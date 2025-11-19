import { Howl, Howler } from 'howler'

export interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  musicEnabled: boolean
  sfxEnabled: boolean
}

// Real audio manager with Howler.js
class AudioManager {
  private settings: AudioSettings = {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    musicEnabled: false, // Start disabled
    sfxEnabled: true
  }

  private sounds: Map<string, Howl> = new Map()
  private backgroundMusic: Howl | null = null
  private isInitialized = false

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

  // Initialize audio system
  private async initialize() {
    if (this.isInitialized || typeof window === 'undefined') return
    
    try {
      // Set global volume
      Howler.volume(this.settings.masterVolume)

      // Preload all sound effects
      const sfxFiles = [
        'button-click', 'card-deal', 'card-flip', 'chip-place',
        'win', 'lose', 'blackjack', 'push', 'bust'
      ]

      sfxFiles.forEach(name => {
        this.sounds.set(name, new Howl({
          src: [`/audio/sfx/${name}.mp3`],
          volume: this.settings.sfxVolume,
          preload: true
        }))
      })

      // Preload background music
      this.backgroundMusic = new Howl({
        src: ['/audio/music/background-music.mp3'],
        volume: this.settings.musicVolume,
        loop: true,
        preload: true
      })

      this.isInitialized = true
      console.log('[Audio] System initialized successfully')
    } catch (error) {
      console.warn('[Audio] Failed to initialize:', error)
    }
  }

  // Sound Effects Methods
  playSound(soundName: string) {
    if (!this.settings.sfxEnabled) return
    
    if (!this.isInitialized) {
      this.initialize()
    }

    const sound = this.sounds.get(soundName)
    if (sound) {
      sound.volume(this.settings.sfxVolume * this.settings.masterVolume)
      sound.play()
    } else {
      console.warn(`[Audio] Sound not found: ${soundName}`)
    }
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

  // Background Music Methods
  playBackgroundMusic() {
    if (!this.settings.musicEnabled) return
    
    if (!this.isInitialized) {
      this.initialize()
    }

    if (this.backgroundMusic && !this.backgroundMusic.playing()) {
      this.backgroundMusic.volume(this.settings.musicVolume * this.settings.masterVolume)
      this.backgroundMusic.play()
      console.log('[Audio] Background music started')
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
      console.log('[Audio] Background music stopped')
    }
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic && this.backgroundMusic.playing()) {
      this.backgroundMusic.pause()
      console.log('[Audio] Background music paused')
    }
  }

  resumeBackgroundMusic() {
    if (this.settings.musicEnabled && this.backgroundMusic && !this.backgroundMusic.playing()) {
      this.backgroundMusic.play()
      console.log('[Audio] Background music resumed')
    }
  }

  // Settings Methods
  updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()

    // Update global volume
    if (newSettings.masterVolume !== undefined) {
      Howler.volume(this.settings.masterVolume)
    }

    // Update music volume
    if ((newSettings.musicVolume !== undefined || newSettings.masterVolume !== undefined) && this.backgroundMusic) {
      this.backgroundMusic.volume(this.settings.musicVolume * this.settings.masterVolume)
    }

    // Update SFX volume
    if (newSettings.sfxVolume !== undefined || newSettings.masterVolume !== undefined) {
      this.sounds.forEach(sound => {
        sound.volume(this.settings.sfxVolume * this.settings.masterVolume)
      })
    }

    // Handle music enable/disable
    if (newSettings.musicEnabled !== undefined) {
      if (newSettings.musicEnabled) {
        this.playBackgroundMusic()
      } else {
        this.stopBackgroundMusic()
      }
    }

    console.log('[Audio] Settings updated:', this.settings)
  }

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  // Utility Methods
  isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusic?.playing() || false
  }

  getBackgroundMusicPosition(): number {
    return this.backgroundMusic?.seek() as number || 0
  }

  setBackgroundMusicPosition(position: number) {
    if (this.backgroundMusic) {
      this.backgroundMusic.seek(position)
    }
  }

  // Force initialization (call on user interaction)
  forceInitialize() {
    this.initialize()
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