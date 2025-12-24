'use client'

import React, { useState, useEffect } from 'react'
import { Volume2, VolumeX, Music, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAudio } from '@/hooks/useAudio'

export default function AudioControls() {
  const audio = useAudio()
  const [settings, setSettings] = useState(audio.getSettings())
  const [isOpen, setIsOpen] = useState(false)

  // Update local state when settings change
  useEffect(() => {
    const interval = setInterval(() => {
      setSettings(audio.getSettings())
    }, 1000)
    return () => clearInterval(interval)
  }, [audio])

  const handleMasterVolumeChange = (value: number[]) => {
    const newVolume = value[0] ?? 50
    audio.updateSettings({ masterVolume: newVolume })
    setSettings({ ...settings, masterVolume: newVolume })
  }

  const handleMusicVolumeChange = (value: number[]) => {
    const newVolume = value[0] ?? 50
    audio.updateSettings({ musicVolume: newVolume })
    setSettings({ ...settings, musicVolume: newVolume })
  }

  const handleSfxVolumeChange = (value: number[]) => {
    const newVolume = value[0] ?? 50
    audio.updateSettings({ sfxVolume: newVolume })
    setSettings({ ...settings, sfxVolume: newVolume })
  }

  const handleMusicToggle = (checked: boolean) => {
    audio.updateSettings({ musicEnabled: checked })
    setSettings({ ...settings, musicEnabled: checked })
  }

  const handleSfxToggle = (checked: boolean) => {
    audio.updateSettings({ sfxEnabled: checked })
    setSettings({ ...settings, sfxEnabled: checked })
  }

  const handleTestSound = () => {
    audio.playButtonSound()
    setTimeout(() => audio.playCardDealSound(), 200)
  }

  const isMuted = settings.masterVolume === 0

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-gray-900/90 backdrop-blur-sm border-green-600 hover:bg-gray-800 hover:border-green-500 transition-all shadow-lg"
            title="Audio Settings"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-red-400" />
            ) : (
              <Volume2 className="h-5 w-5 text-green-400" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 bg-gray-900 border-green-600 text-white"
          align="end"
          side="top"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-700">
              <h3 className="font-semibold text-green-400">Audio Settings</h3>
              <Volume2 className="h-4 w-4 text-green-400" />
            </div>

            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300">Master Volume</Label>
                <span className="text-xs text-gray-400">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <Slider
                value={[settings.masterVolume]}
                onValueChange={handleMasterVolumeChange}
                max={1}
                step={0.05}
                className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-600"
              />
            </div>

            {/* Music Controls */}
            <div className="space-y-2 p-3 rounded-lg bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-blue-400" />
                  <Label className="text-sm text-gray-300">Background Music</Label>
                </div>
                <Switch
                  checked={settings.musicEnabled}
                  onCheckedChange={handleMusicToggle}
                />
              </div>
              {settings.musicEnabled && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Volume</span>
                    <span className="text-xs text-gray-400">{Math.round(settings.musicVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[settings.musicVolume]}
                    onValueChange={handleMusicVolumeChange}
                    max={1}
                    step={0.05}
                    className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-600"
                  />
                </div>
              )}
            </div>

            {/* SFX Controls */}
            <div className="space-y-2 p-3 rounded-lg bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music2 className="h-4 w-4 text-yellow-400" />
                  <Label className="text-sm text-gray-300">Sound Effects</Label>
                </div>
                <Switch
                  checked={settings.sfxEnabled}
                  onCheckedChange={handleSfxToggle}
                />
              </div>
              {settings.sfxEnabled && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Volume</span>
                    <span className="text-xs text-gray-400">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[settings.sfxVolume]}
                    onValueChange={handleSfxVolumeChange}
                    max={1}
                    step={0.05}
                    className="[&_[role=slider]]:bg-yellow-500 [&_[role=slider]]:border-yellow-600"
                  />
                </div>
              )}
            </div>

            {/* Test Button */}
            <Button
              onClick={handleTestSound}
              variant="outline"
              size="sm"
              className="w-full border-green-600 hover:bg-green-600/20 hover:border-green-500"
            >
              Test Sound Effects
            </Button>

            {/* Music Status */}
            {settings.musicEnabled && (
              <div className="text-xs text-center text-gray-500 pt-2 border-t border-gray-700">
                {audio.isMusicPlaying() ? '♪ Music Playing' : '♪ Music Enabled'}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
