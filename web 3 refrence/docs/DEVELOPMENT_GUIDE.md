# 📚 Panduan Pengembangan Aplikasi NFT Staking Game

## 🎯 **Overview**
Aplikasi ini adalah NFT Staking Game dengan tema Windows 98 retro style yang dibangun dengan Next.js 15, TypeScript, dan Web3 technologies.

## 🏗️ **Arsitektur Project**

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Halaman utama (game interface)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React Components
│   ├── ui/               # Basic UI components (shadcn/ui)
│   ├── RetroButton.tsx   # Custom retro button
│   ├── RetroWindow.tsx   # Custom retro window
│   ├── NFTCard.tsx       # NFT card component
│   ├── NFTMinting.tsx    # NFT minting interface
│   └── StakingArena.tsx  # Staking interface
├── lib/                  # Utility libraries
│   ├── web3.ts          # Web3 configuration
│   ├── contracts.ts     # Smart contract ABIs
│   ├── nft-artwork.ts   # NFT artwork data
│   ├── security.ts      # Security utilities
│   └── error-handling.ts # Error handling
├── hooks/               # Custom React Hooks
│   ├── useWeb3.ts      # Web3 state management
│   └── useStaking.ts   # Staking logic
└── styles/             # Style files
    └── windows-98.css  # Windows 98 retro styles
```

---

## 🎨 **Cara Menambah NFT Baru**

### 1. **Menambah Artwork NFT**

Buka file `src/lib/nft-artwork.ts` dan tambahkan NFT baru ke dalam array `NFT_ARTWORK`:

```typescript
export const NFT_ARTWORK: NFTArtwork[] = [
  // ... NFT existing
  {
    id: 'nft-baru', // Unique ID
    name: 'Nama NFT Baru',
    rarity: 'rare', // 'normal' | 'rare' | 'epic' | 'legendary'
    imageUrl: 'URL_GAMBAR_BESAR',
    thumbnailUrl: 'URL_GAMBAR_KECIL',
    description: 'Deskripsi lengkap NFT ini',
    specialAbility: 'Kemampuan khusus NFT',
    dailyReward: 25, // Reward harian dalam GCWAN tokens
    backgroundGradient: 'from-blue-600 to-blue-800',
    frameColor: 'border-blue-400',
    glowEffect: 'shadow-blue-400/30'
  }
]
```

### 2. **Menambah Gambar NFT**

**Cara 1: Upload ke Hosting**
- Upload gambar ke hosting (Imgur, GitHub, dll)
- Dapatkan URL gambar
- Masukkan ke `imageUrl` dan `thumbnailUrl`

**Cara 2: Local Storage**
- Simpan gambar di `public/images/nfts/`
- Gunakan path relatif: `/images/nfts/nama-gambar.jpg`

### 3. **Menyesuaikan Rarity**

**Normal (Gray)**:
- `dailyReward`: 10-20
- `backgroundGradient`: 'from-gray-600 to-gray-800'
- `frameColor`: 'border-gray-400'

**Rare (Blue)**:
- `dailyReward`: 20-40
- `backgroundGradient`: 'from-blue-600 to-blue-800'
- `frameColor`: 'border-blue-400'

**Epic (Purple)**:
- `dailyReward`: 40-70
- `backgroundGradient`: 'from-purple-600 to-purple-800'
- `frameColor`: 'border-purple-400'

**Legendary (Yellow/Orange)**:
- `dailyReward`: 70-100+
- `backgroundGradient`: 'from-yellow-600 to-orange-600'
- `frameColor`: 'border-yellow-400'

---

## 🔧 **Cara Menambah Variasi NFT**

### 1. **Menambah Variasi Rarity**

Untuk NFT yang sama dengan rarity berbeda:

```typescript
{
  id: 'warrior-normal',
  name: 'Basic Warrior',
  rarity: 'normal',
  // ... props lainnya
},
{
  id: 'warrior-rare',
  name: 'Elite Warrior',
  rarity: 'rare',
  imageUrl: 'URL_GAMBAR_VERSI_RARE',
  // ... props lainnya dengan reward lebih tinggi
}
```

### 2. **Menambah Special Abilities**

Edit fungsi `calculateRewards` di `src/hooks/useStaking.ts`:

```typescript
const calculateRewards = (nfts: NFT[], hours: number): number => {
  let baseReward = 0
  
  nfts.forEach(nft => {
    const artwork = getNFTArtwork(nft.id)
    let nftReward = artwork?.dailyReward || 10
    
    // Special ability logic
    if (artwork?.id === 'moonlight-samurai') {
      // 2x rewards during night hours
      const currentHour = new Date().getHours()
      if (currentHour >= 20 || currentHour <= 6) {
        nftReward *= 2
      }
    }
    
    baseReward += nftReward
  })
  
  return (baseReward * hours) / 24
}
```

---

## 🛠️ **Maintenance Guide**

### **Daily Maintenance**

1. **Check Health API**:
```bash
curl http://localhost:3000/api/health
```

2. **Monitor Logs**:
```bash
tail -f dev.log
```

3. **Check Dependencies**:
```bash
npm outdated
npm audit
```

### **Weekly Maintenance**

1. **Update Dependencies**:
```bash
npm update
npm audit fix
```

2. **Code Quality Check**:
```bash
npm run lint
npm run type-check
```

3. **Performance Check**:
- Monitor memory usage
- Check API response times
- Review error logs

### **Monthly Maintenance**

1. **Security Updates**:
```bash
npm audit fix --force
```

2. **Database Backup** (jika menggunakan database):
```bash
npm run db:backup
```

3. **Smart Contract Update** (jika perlu):
- Deploy new contract version
- Update ABI in `src/lib/contracts.ts`
- Test thoroughly

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### 1. **MetaMask Connection Failed**
```bash
# Clear cache
rm -rf .next
npm run dev
```

#### 2. **NFT Images Not Loading**
- Check image URLs
- Verify CORS settings
- Test image accessibility

#### 3. **Staking Not Working**
- Check smart contract connection
- Verify network settings
- Check user permissions

#### 4. **Performance Issues**
```bash
# Check bundle size
npm run build -- --analyze
```

### **Debug Mode**

Enable debug mode di `src/lib/web3.ts`:
```typescript
const config = createConfig({
  // ... config
  logger: {
    level: 'debug'
  }
})
```

---

## 📦 **Deployment Guide**

### **Development**
```bash
npm run dev
```

### **Production Build**
```bash
npm run build
npm start
```

### **Environment Variables**

Buat file `.env.local`:
```env
NEXT_PUBLIC_CHAIN_ID=80001
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_WS_URL=wss://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PINATA_API_KEY=...
NEXT_PUBLIC_PINATA_SECRET=...
```

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔄 **Update Workflow**

### **Menambah Fitur Baru**

1. **Create Branch**:
```bash
git checkout -b feature/nama-fitur
```

2. **Development**:
- Code changes
- Test thoroughly
- Update documentation

3. **Testing**:
```bash
npm run test
npm run lint
npm run type-check
```

4. **Deploy**:
```bash
git add .
git commit -m "feat: tambah fitur baru"
git push origin feature/nama-fitur
```

### **Version Management**

Gunakan semantic versioning:
- **Major**: Breaking changes (2.0.0)
- **Minor**: New features (1.1.0)
- **Patch**: Bug fixes (1.0.1)

---

## 📊 **Monitoring & Analytics**

### **Key Metrics**
- Daily active users
- NFT minting volume
- Staking activity
- Transaction success rate
- Error rates

### **Tools**
- **Analytics**: Google Analytics, Mixpanel
- **Monitoring**: Sentry, LogRocket
- **Performance**: Lighthouse, Web Vitals

---

## 🔐 **Security Best Practices**

### **Smart Contract Security**
- Regular audits
- Test coverage > 90%
- Multi-signature wallets
- Time locks for critical functions

### **Frontend Security**
- Input sanitization
- XSS prevention
- HTTPS only
- Content Security Policy

### **API Security**
- Rate limiting
- Input validation
- Error handling
- Authentication

---

## 📞 **Support & Resources**

### **Documentation**
- [Next.js Docs](https://nextjs.org/docs)
- [Wagmi Docs](https://wagmi.sh/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### **Community**
- Discord: [Join Community]
- GitHub: [Report Issues]
- Twitter: [Follow Updates]

### **Emergency Contacts**
- Tech Lead: [Contact Info]
- DevOps: [Contact Info]
- Security: [Contact Info]

---

## 🎯 **Best Practices**

### **Code Quality**
- TypeScript strict mode
- ESLint + Prettier
- Unit tests
- Code reviews

### **Performance**
- Lazy loading
- Code splitting
- Image optimization
- Caching strategies

### **UX/UI**
- Responsive design
- Accessibility (WCAG 2.1)
- Loading states
- Error boundaries

---

## 🚀 **Future Enhancements**

### **Planned Features**
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Governance system
- [ ] Cross-chain support
- [ ] AI-powered recommendations

### **Technology Roadmap**
- Q1 2024: Mobile optimization
- Q2 2024: Advanced staking features
- Q3 2024: Cross-chain integration
- Q4 2024: AI features

---

*Document ini akan terus diupdate seiring dengan perkembangan project. Jangan ragu untuk kontribusi ke dokumentasi ini!*