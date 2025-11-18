# Audio Files Placeholder

## 📁 **Required Audio Files**

### **Background Music**
- `public/audio/music/background-music.mp3`
  - Loop-friendly background music
  - Recommended: 2-3 minutes, seamless loop
  - Genre: Casino/jazz ambient

### **Sound Effects (SFX)**
- `public/audio/sfx/button-click.mp3` - Button click sound
- `public/audio/sfx/card-deal.mp3` - Card dealing sound
- `public/audio/sfx/card-flip.mp3` - Card flip/reveal sound
- `public/audio/sfx/chip-place.mp3` - Chip placing sound
- `public/audio/sfx/win.mp3` - Win celebration sound
- `public/audio/sfx/lose.mp3` - Lose sound
- `public/audio/sfx/blackjack.mp3` - Blackjack special sound
- `public/audio/sfx/push.mp3` - Push/tie sound
- `public/audio/sfx/bust.mp3` - Bust sound

## 🎵 **How to Add Your Audio Files**

### **Step 1: Prepare Your Files**
- Format: MP3 (recommended)
- Quality: 44.1kHz, 16-bit
- Size: SFX < 100KB, Music < 1MB

### **Step 2: Copy to Folders**
```bash
# Example: Copy your background music
cp /path/to/your-background-music.mp3 public/audio/music/background-music.mp3

# Example: Copy your sound effects
cp /path/to/your-button-sound.mp3 public/audio/sfx/button-click.mp3
cp /path/to/your-card-sound.mp3 public/audio/sfx/card-deal.mp3
# ... etc for all files
```

### **Step 3: Test the System**
1. Open the game
2. Check AudioControls panel (bottom-right)
3. Click "Test SFX" to test sound effects
4. Enable background music to test music

## 🔊 **Audio System Features**

- ✅ Automatic file preloading
- ✅ Graceful fallback if files missing
- ✅ Volume controls for music and SFX
- ✅ Persistent settings
- ✅ Error handling
- ✅ Performance optimized

## 🎮 **Integration Points**

### **Game Actions with Audio**
- **Deal Button**: Button click + chip place + 4x card deal sounds
- **Hit Button**: Button click + card deal sound
- **Stand Button**: Button click sound
- **Double Down**: Button click + chip place + card deal
- **Dealer Cards**: Card flip + staggered deal sounds
- **Win/Lose**: Result sounds with popup modal
- **Background Music**: Continuous loop when enabled

### **Audio Controls**
- Located in bottom-right corner
- Master volume control
- Individual music/SFX controls
- Test buttons for verification
- Advanced settings panel

---

## 📝 **Note**

The audio system is fully implemented and ready to use. 
Simply add your audio files to the specified folders and they will be automatically detected and used by the game.

If files are missing, the system will gracefully fallback to silent mode without any errors.