# 🎨 **Panduan Lengkap Menambah NFT**

## 📋 **Table of Contents**
1. [Persiapan](#persiapan)
2. [Menambah NFT Baru](#menambah-nft-baru)
3. [Membuat Variasi NFT](#membuat-variasi-nft)
4. [Testing NFT](#testing-nft)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 **Persiapan**

### **Tools yang Dibutuhkan**
- Image editor (Photoshop, GIMP, Canva)
- File hosting (Imgur, GitHub Pages, Pinata)
- Text editor (VS Code)
- Terminal/Command Prompt

### **Spesifikasi Gambar**
- **Format**: JPG, PNG, GIF
- **Ukuran**: 512x512px (minimum), 1024x1024px (recommended)
- **File Size**: < 5MB
- **Background**: Transparent atau solid color

---

## ➕ **Menambah NFT Baru**

### **Step 1: Siapkan Gambar**

```bash
# Buat folder untuk gambar NFT
mkdir -p public/images/nfts

# Contoh struktur file
public/images/nfts/
├── warrior-basic.jpg
├── warrior-basic-thumb.jpg
├── mage-epic.png
└── mage-epic-thumb.png
```

### **Step 2: Upload Gambar**

**Option A: Local Storage**
```bash
# Copy gambar ke folder public
cp ~/Downloads/nft-image.jpg public/images/nfts/my-nft.jpg
cp ~/Downloads/nft-image-thumb.jpg public/images/nfts/my-nft-thumb.jpg
```

**Option B: External Hosting**
1. Upload ke Imgur/ GitHub Pages
2. Dapatkan direct link
3. Test link di browser

### **Step 3: Edit NFT Artwork File**

Buka `src/lib/nft-artwork.ts` dan tambahkan NFT baru:

```typescript
export const NFT_ARTWORK: NFTArtwork[] = [
  // ... existing NFTs
  
  {
    id: 'dark-knight', // 🔥 Unique identifier (no spaces)
    name: 'Dark Knight', // 🏷️ Display name
    rarity: 'epic', // ⭐ Rarity level
    imageUrl: '/images/nfts/dark-knight.jpg', // 🖼️ Main image
    thumbnailUrl: '/images/nfts/dark-knight-thumb.jpg', // 🖼️ Thumbnail
    description: 'A mysterious knight wielding dark powers from the shadows.', // 📝 Description
    specialAbility: 'Shadow strike: 2x rewards during midnight hours', // ⚡ Special ability
    dailyReward: 45, // 💰 Daily reward amount
    backgroundGradient: 'from-purple-900 to-black', // 🎨 Background gradient
    frameColor: 'border-purple-500', // 🖼️ Frame color
    glowEffect: 'shadow-purple-500/50' // ✨ Glow effect
  }
]
```

### **Step 4: Custom Rarity Settings**

**Normal NFT Template:**
```typescript
{
  id: 'basic-warrior',
  name: 'Basic Warrior',
  rarity: 'normal',
  dailyReward: 15,
  backgroundGradient: 'from-gray-600 to-gray-800',
  frameColor: 'border-gray-400',
  glowEffect: 'shadow-gray-400/20'
}
```

**Rare NFT Template:**
```typescript
{
  id: 'elite-archer',
  name: 'Elite Archer',
  rarity: 'rare',
  dailyReward: 30,
  backgroundGradient: 'from-blue-600 to-blue-800',
  frameColor: 'border-blue-400',
  glowEffect: 'shadow-blue-400/30'
}
```

**Epic NFT Template:**
```typescript
{
  id: 'shadow-mage',
  name: 'Shadow Mage',
  rarity: 'epic',
  dailyReward: 50,
  backgroundGradient: 'from-purple-600 to-purple-800',
  frameColor: 'border-purple-400',
  glowEffect: 'shadow-purple-400/40'
}
```

**Legendary NFT Template:**
```typescript
{
  id: 'dragon-lord',
  name: 'Dragon Lord',
  rarity: 'legendary',
  dailyReward: 100,
  backgroundGradient: 'from-yellow-600 to-orange-600',
  frameColor: 'border-yellow-400',
  glowEffect: 'shadow-yellow-400/50'
}
```

---

## 🎭 **Membuat Variasi NFT**

### **1. Variasi Rarity yang Sama**

```typescript
// Basic version
{
  id: 'phoenix-normal',
  name: 'Young Phoenix',
  rarity: 'normal',
  imageUrl: '/images/nfts/phoenix-young.jpg',
  dailyReward: 20,
  description: 'A young phoenix learning to control its flames.'
},

// Evolved version
{
  id: 'phoenix-epic',
  name: 'Mystic Phoenix',
  rarity: 'epic',
  imageUrl: '/images/nfts/phoenix-mystic.jpg',
  dailyReward: 60,
  description: 'An ancient phoenix with mystical powers and eternal flames.'
}
```

### **2. Variasi Theme/Season**

```typescript
// Summer version
{
  id: 'warrior-summer',
  name: 'Summer Warrior',
  rarity: 'rare',
  imageUrl: '/images/nfts/warrior-summer.jpg',
  dailyReward: 35,
  specialAbility: 'Sun power: 1.5x rewards during daytime'
},

// Winter version
{
  id: 'warrior-winter',
  name: 'Winter Warrior',
  rarity: 'rare',
  imageUrl: '/images/nfts/warrior-winter.jpg',
  dailyReward: 35,
  specialAbility: 'Frost power: 1.5x rewards during night time'
}
```

### **3. Variasi Special Edition**

```typescript
// Limited edition
{
  id: 'anniversary-special',
  name: 'Anniversary Warrior',
  rarity: 'legendary',
  imageUrl: '/images/nfts/warrior-anniversary.jpg',
  dailyReward: 150,
  specialAbility: 'Celebration bonus: 3x rewards for first week',
  description: 'Limited edition warrior celebrating our anniversary!'
}
```

---

## 🧪 **Testing NFT**

### **1. Visual Testing**

```typescript
// Test di browser
import { getNFTArtwork } from '@/lib/nft-artwork'

// Test function
const testNFT = () => {
  const nft = getNFTArtwork('dark-knight')
  console.log('NFT Data:', nft)
  
  // Test image loading
  const img = new Image()
  img.src = nft?.imageUrl || ''
  img.onload = () => console.log('Image loaded successfully')
  img.onerror = () => console.error('Image failed to load')
}
```

### **2. Integration Testing**

```typescript
// Test di component
import { NFTCard } from '@/components/NFTCard'

// Test rendering
const TestNFTCard = () => {
  const testNFT = {
    tokenId: BigInt(999),
    rarity: 'epic',
    staked: false
  }
  
  const artwork = getNFTArtwork('dark-knight')
  
  return (
    <NFTCard
      artwork={artwork!}
      tokenId={testNFT.tokenId}
      staked={testNFT.staked}
      selected={false}
      onSelect={() => {}}
      onUnstake={() => {}}
      loading={false}
    />
  )
}
```

### **3. Reward Calculation Testing**

```typescript
// Test reward calculation
const testRewards = () => {
  const testNFTs = [
    { id: 'dark-knight', rarity: 'epic' }
  ]
  
  const rewards = calculateRewards(testNFTs, 24) // 24 hours
  console.log('Expected daily reward:', rewards) // Should be 45
}
```

---

## 💡 **Best Practices**

### **1. Naming Conventions**

```typescript
// ✅ Good
id: 'dark-knight'
id: 'fire-mage-epic'
id: 'anniversary-2024'

// ❌ Bad
id: 'dark knight' // spaces
id: 'DarkKnight' // inconsistent casing
id: 'dark_knight' // underscores
```

### **2. Image Optimization**

```bash
# Optimize images
npx sharp input.jpg --output public/images/nfts/output.jpg --resize 512 512

# Create thumbnails
npx sharp input.jpg --output public/images/nfts/thumb-output.jpg --resize 128 128
```

### **3. Rarity Balance**

```typescript
// Reward balance guidelines
const REWARD_RANGES = {
  normal: { min: 10, max: 25 },
  rare: { min: 25, max: 45 },
  epic: { min: 45, max: 75 },
  legendary: { min: 75, max: 150 }
}
```

### **4. Special Ability Guidelines**

```typescript
// Good special abilities
specialAbility: 'Night owl: 2x rewards between 10PM - 6AM'
specialAbility: 'Weekend warrior: 1.5x rewards on weekends'
specialAbility: 'Lucky charm: 10% chance for 5x reward bonus'

// Avoid
specialAbility: 'Good luck' // too vague
specialAbility: 'Bonus' // not specific
specialAbility: 'Special power' // unclear effect
```

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Image Not Loading**
```typescript
// Problem: Image URL incorrect
imageUrl: './images/nft.jpg' // ❌ Wrong path

// Solution: Use absolute path
imageUrl: '/images/nft.jpg' // ✅ Correct path
```

#### **2. NFT Not Showing Up**
```typescript
// Problem: ID conflict
id: 'warrior' // Already exists

// Solution: Use unique ID
id: 'dark-warrior' // ✅ Unique
```

#### **3. Wrong Rarity Colors**
```typescript
// Problem: Inconsistent colors
backgroundGradient: 'from-blue-600 to-red-600' // ❌ Mixed colors

// Solution: Use rarity-specific colors
backgroundGradient: 'from-blue-600 to-blue-800' // ✅ Consistent
```

#### **4. Reward Calculation Issues**
```typescript
// Problem: Reward too high/low
dailyReward: 1000 // ❌ Too high for normal NFT

// Solution: Follow rarity guidelines
dailyReward: 15 // ✅ Appropriate for normal NFT
```

### **Debug Checklist**

- [ ] Image URLs are accessible
- [ ] NFT ID is unique
- [ ] Rarity is correctly set
- [ ] Rewards are balanced
- [ ] Special abilities are clear
- [ ] Colors match rarity
- [ ] Description is engaging
- [ ] No TypeScript errors

---

## 📝 **Template Generator**

### **Quick NFT Template Generator**

```typescript
const generateNFTTemplate = (config: {
  id: string
  name: string
  rarity: 'normal' | 'rare' | 'epic' | 'legendary'
  imageUrl: string
  description: string
  specialAbility: string
}) => {
  const rarityConfig = {
    normal: { reward: 15, gradient: 'from-gray-600 to-gray-800', frame: 'border-gray-400', glow: 'shadow-gray-400/20' },
    rare: { reward: 30, gradient: 'from-blue-600 to-blue-800', frame: 'border-blue-400', glow: 'shadow-blue-400/30' },
    epic: { reward: 50, gradient: 'from-purple-600 to-purple-800', frame: 'border-purple-400', glow: 'shadow-purple-400/40' },
    legendary: { reward: 100, gradient: 'from-yellow-600 to-orange-600', frame: 'border-yellow-400', glow: 'shadow-yellow-400/50' }
  }
  
  const config = rarityConfig[config.rarity]
  
  return {
    id: config.id,
    name: config.name,
    rarity: config.rarity,
    imageUrl: config.imageUrl,
    thumbnailUrl: config.imageUrl, // Same by default
    description: config.description,
    specialAbility: config.specialAbility,
    dailyReward: config.reward,
    backgroundGradient: config.gradient,
    frameColor: config.frame,
    glowEffect: config.glow
  }
}

// Usage example
const newNFT = generateNFTTemplate({
  id: 'shadow-assassin',
  name: 'Shadow Assassin',
  rarity: 'epic',
  imageUrl: '/images/nfts/shadow-assassin.jpg',
  description: 'A deadly assassin who strikes from the shadows.',
  specialAbility: 'Shadow strike: 2x rewards during night hours'
})
```

---

## 🎯 **Next Steps**

Setelah menambah NFT baru:

1. **Test thoroughly** di development environment
2. **Update documentation** jika ada perubahan
3. **Deploy ke staging** untuk testing lebih lanjut
4. **Announce new NFTs** ke community
5. **Monitor performance** dan user feedback

---

## 📞 **Need Help?**

Jika Anda mengalami masalah saat menambah NFT:

1. **Check console** untuk error messages
2. **Verify image URLs** di browser
3. **Test dengan NFT sederhana** dulu
4. **Contact support** dengan detail error

---

*Happy NFT creating! 🎨✨*