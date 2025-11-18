# Audio System Documentation

## 🎵 **Audio System Setup**

### **Folder Structure**
```
public/audio/
├── music/
│   └── background-music.mp3    # Background music loop
└── sfx/
    ├── button-click.mp3        # Button click sounds
    ├── card-deal.mp3           # Card dealing sounds
    ├── card-flip.mp3           # Card flip/reveal sounds
    ├── chip-place.mp3          # Chip placing sounds
    ├── win.mp3                 # Win sound effect
    ├── lose.mp3                # Lose sound effect
    ├── blackjack.mp3           # Blackjack special sound
    ├── push.mp3                # Push/tie sound
    └── bust.mp3                # Bust sound effect
```

## 🎮 **Integrated Sound Effects**

### **1. Button Sounds**
- **All buttons**: `button-click.mp3`
- **Deal button**: `button-click.mp3` + `chip-place.mp3`
- **Hit/Stand/Double**: `button-click.mp3`
- **Play Again**: `button-click.mp3`

### **2. Card Sounds**
- **Initial deal**: 4x `card-deal.mp3` (staggered)
- **Hit card**: `card-deal.mp3` (delayed)
- **Double down**: `chip-place.mp3` + `card-deal.mp3`
- **Dealer reveal**: `card-flip.mp3`
- **Dealer draw**: `card-deal.mp3` (staggered)

### **3. Game Result Sounds**
- **Win**: `win.mp3`
- **Lose**: `lose.mp3`
- **Push**: `push.mp3`
- **Blackjack**: `blackjack.mp3`
- **Bust**: `bust.mp3`

### **4. Background Music**
- **Auto-play**: `background-music.mp3` (loop)
- **Volume control**: Adjustable via AudioControls
- **Pause/Resume**: Maintains state across game sessions

## 🎛️ **Audio Controls Panel**

### **Location**
- Fixed position: Bottom-right corner
- Available on all pages
- Compact design with expandable advanced settings

### **Controls**
- **Background Music**: On/Off + Volume slider
- **Sound Effects**: On/Off + Volume slider
- **Master Volume**: Overall volume control
- **Test Buttons**: Test SFX and Win/Lose sounds

### **Settings Persistence**
- All settings saved to localStorage
- Maintained across browser sessions
- Applied immediately when changed

## 🔧 **Technical Implementation**

### **Audio Manager**
```typescript
import { audioManager } from '@/lib/audio-manager'

// Play sounds
audioManager.playButtonSound()
audioManager.playCardDealSound()
audioManager.playWinSound()
// ... etc

// Control music
audioManager.playBackgroundMusic()
audioManager.pauseBackgroundMusic()

// Settings
audioManager.updateSettings({
  musicVolume: 0.5,
  sfxVolume: 0.8,
  masterVolume: 0.7
})
```

### **React Hook**
```typescript
import { useAudio } from '@/hooks/useAudio'

const { 
  playButtonSound, 
  playWinSound, 
  playBackgroundMusic 
} = useAudio()
```

## 📝 **How to Add Audio Files**

### **1. Prepare Your Audio Files**
- **Format**: MP3 recommended (also supports WAV, OGG)
- **Quality**: 44.1kHz, 16-bit (good balance)
- **Size**: Keep files small (< 100KB for SFX, < 1MB for music)

### **2. Place Files in Correct Folders**
```bash
# Background music
cp your-music.mp3 public/audio/music/background-music.mp3

# Sound effects
cp button-sound.mp3 public/audio/sfx/button-click.mp3
cp card-sound.mp3 public/audio/sfx/card-deal.mp3
# ... etc for all SFX
```

### **3. File Naming Convention**
- Use lowercase with hyphens
- Match exactly the names in the code
- No spaces or special characters

## 🎯 **Audio Features**

### **Automatic Audio Management**
- **Preloading**: All audio files preloaded on app start
- **Fallback**: Silent mode if files missing
- **Error Handling**: Graceful degradation
- **Performance**: Optimized for smooth gameplay

### **Volume Controls**
- **Master Volume**: Affects all audio
- **Music Volume**: Background music only
- **SFX Volume**: Sound effects only
- **Mute Options**: Individual mute for music/SFX

### **Advanced Features**
- **Audio Testing**: Built-in test buttons
- **Status Monitoring**: Real-time audio status
- **Settings Sync**: Persistent across sessions
- **File Detection**: Checks for missing files

## 🚀 **Quick Setup**

### **1. Add Your Audio Files**
```bash
# Copy your audio files to the correct locations
cp your-background-music.mp3 public/audio/music/background-music.mp3
cp your-button-sound.mp3 public/audio/sfx/button-click.mp3
cp your-card-deal.mp3 public/audio/sfx/card-deal.mp3
# ... add all other sound effects
```

### **2. Test the Audio System**
1. Open the game
2. Look for AudioControls in bottom-right
3. Click "Test SFX" button
4. Adjust volumes as needed
5. Enable background music

### **3. Customize Settings**
- Adjust default volumes in `audio-manager.ts`
- Modify audio triggers in game components
- Add new sound effects as needed

## 🎮 **Game Integration**

### **Sound Timing**
- **Card sounds**: Staggered for realistic dealing
- **Button sounds**: Immediate feedback
- **Result sounds**: Triggered with popup modal
- **Background music**: Continuous loop

### **User Experience**
- **Non-intrusive**: Audio enhances, doesn't distract
- **Customizable**: Full user control
- **Performance**: Optimized for smooth gameplay
- **Accessible**: Visual alternatives for all audio cues

---

## 🎉 **Summary**

Audio system is fully integrated with:
- ✅ **Background music** with volume control
- ✅ **Button sound effects** for all interactions
- ✅ **Card sounds** for dealing and flipping
- ✅ **Win/lose sounds** with popup modal timing
- ✅ **Audio controls panel** with full settings
- ✅ **Persistent settings** across sessions
- ✅ **Error handling** for missing files
- ✅ **Performance optimization**

Just add your audio files to the specified folders and the system will work automatically! 🎵