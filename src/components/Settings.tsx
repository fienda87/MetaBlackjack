'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Volume2, 
  VolumeX,
  Monitor,
  Smartphone,
  HelpCircle,
  Save,
  RotateCcw,
  Play,
  Pause,
  Music,
  Volume1,
  Headphones
} from 'lucide-react'
import { audioManager, AudioSettings } from '@/lib/audio-manager'
import { useSettingsStore, CardDealingSpeed } from '@/store/settingsStore'

export default function GameSettings() {
  const {
    cardDealingSpeed,
    setCardDealingSpeed,
    resetToDefaults
  } = useSettingsStore()

  const [audioSettings, setAudioSettings] = useState<AudioSettings>(audioManager.getSettings())
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [activeTab, setActiveTab] = useState('game')

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(audioManager.isBackgroundMusicPlaying())
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const tabs = [
    { id: 'game', label: 'Game', icon: Settings },
    { id: 'audio', label: 'Audio', icon: Volume2 }
  ]

  const updateAudioSetting = (key: keyof AudioSettings, value: any) => {
    const newSettings = { ...audioSettings, [key]: value }
    setAudioSettings(newSettings)
    audioManager.updateSettings(newSettings)
  }

  const toggleMusic = () => {
    if (isPlaying) {
      audioManager.pauseBackgroundMusic()
    } else {
      audioManager.playBackgroundMusic()
    }
  }

  const formatVolume = (value: number[]) => {
    return `${Math.round((value[0] ?? 0) * 100)}%`
  }

  const getSpeedLabel = (speed: CardDealingSpeed): string => {
    switch (speed) {
      case 'slow': return 'Slow (1 second)'
      case 'normal': return 'Normal (0.5 second)'
      case 'fast': return 'Fast (0.2 second)'
      default: return 'Normal (0.5 second)'
    }
  }

  const saveSettings = async () => {
    try {
      // Settings are automatically persisted via Zustand persist middleware
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const resetSettings = () => {
    resetToDefaults()
  }

  const renderGameSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-green-400 mb-4">Game Preferences</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-green-300 text-sm font-medium mb-2 block">
              Card Dealing Speed
            </label>
            <div className="space-y-2">
              {(['slow', 'normal', 'fast'] as CardDealingSpeed[]).map((speed) => (
                <Button
                  key={speed}
                  variant={cardDealingSpeed === speed ? "default" : "outline"}
                  className={`w-full justify-start ${
                    cardDealingSpeed === speed 
                      ? 'bg-green-600 text-black hover:bg-green-500' 
                      : 'border-green-600 text-green-400 hover:bg-green-900/20'
                  }`}
                  onClick={() => setCardDealingSpeed(speed)}
                >
                  {getSpeedLabel(speed)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAudioSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Audio Preferences
          <Badge variant="outline" className="ml-2 text-green-400 border-green-600">
            {isPlaying ? 'Playing' : 'Paused'}
          </Badge>
        </h3>
        
        {/* Quick Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Music Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">Background Music</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={audioSettings.musicEnabled}
                  onCheckedChange={(checked) => updateAudioSetting('musicEnabled', checked)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMusic}
                  disabled={!audioSettings.musicEnabled}
                  className="border-green-600 text-green-400 hover:bg-green-900/20"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Music Volume</span>
                <span className="text-xs text-green-400">{formatVolume([audioSettings.musicVolume])}</span>
              </div>
              <Slider
                value={[audioSettings.musicVolume]}
                onValueChange={(value) => updateAudioSetting('musicVolume', value[0])}
                max={1}
                min={0}
                step={0.1}
                disabled={!audioSettings.musicEnabled}
                className="w-full"
              />
            </div>
          </div>

          {/* Sound Effects Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">Sound Effects</span>
              </div>
              <Switch
                checked={audioSettings.sfxEnabled}
                onCheckedChange={(checked) => updateAudioSetting('sfxEnabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">SFX Volume</span>
                <span className="text-xs text-green-400">{formatVolume([audioSettings.sfxVolume])}</span>
              </div>
              <Slider
                value={[audioSettings.sfxVolume]}
                onValueChange={(value) => updateAudioSetting('sfxVolume', value[0])}
                max={1}
                min={0}
                step={0.1}
                disabled={!audioSettings.sfxEnabled}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Master Volume */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {audioSettings.masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-green-400" />
              ) : audioSettings.masterVolume > 0.5 ? (
                <Volume2 className="w-4 h-4 text-green-400" />
              ) : (
                <Volume1 className="w-4 h-4 text-green-400" />
              )}
              <span className="text-green-400 font-medium">Master Volume</span>
            </div>
            <span className="text-xs text-green-400">{formatVolume([audioSettings.masterVolume])}</span>
          </div>
          <Slider
            value={[audioSettings.masterVolume]}
            onValueChange={(value) => updateAudioSetting('masterVolume', value[0])}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
        </div>

  

  

        {/* Audio Tips */}
        <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Audio Tips
          </h4>
          <ul className="text-yellow-300 text-sm space-y-1">
            <li>• Disable sound effects for faster gameplay</li>
            <li>• Keep notifications enabled to track your balance</li>
            <li>• Background music can be customized in the VIP theme</li>
            <li>• Use the test buttons to verify audio is working properly</li>
          </ul>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'game': return renderGameSettings()
      case 'audio': return renderAudioSettings()
      default: return renderGameSettings()
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-black border-green-900/30 sticky top-24">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      className={`w-full justify-start gap-2 rounded-none ${
                        activeTab === tab.id 
                          ? 'bg-green-600 text-black hover:bg-green-500' 
                          : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </Button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Card className="bg-black border-green-900/30">
            <CardContent className="p-6">
              {renderContent()}
              
              {/* Action Buttons */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-green-900/30">
                <Button
                  className="flex-1 bg-green-600 text-black hover:bg-green-500 font-semibold"
                  onClick={saveSettings}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-900/20"
                  onClick={resetSettings}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}