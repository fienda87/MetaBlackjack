# 🎰 BlackJack Game - Panduan Instalasi Pemula

## 📋 **PRASYARAT - Apa yang Harus Diinstall Dulu?**

### **1. Node.js (WAJIB)**
**Kenapa?** Untuk menjalankan kode JavaScript di komputer
**Cara Install:**
- Download di: https://nodejs.org/
- Pilih versi **LTS** (Recommended for Most Users)
- Klik Next → Next → Install → Finish

**Cek Apakah Sudah Terinstall:**
```bash
# Buka Command Prompt / PowerShell / Terminal
node --version
# Harus keluar: v18.x.x atau v20.x.x
```

### **2. Code Editor (Recommended)**
**Pilihan:**
- **Visual Studio Code** (Recommended) - https://code.visualstudio.com/
- Atau text editor lain seperti Sublime, Notepad++

---

## 🚀 **LANGKAH DEMI LANGKAH - Instalasi Project**

### **Langkah 1: Download & Extract Project**
1. Download file project (ZIP)
2. Extract ke folder yang mudah diingat (contoh: `C:\blackjack-game`)
3. Buka folder tersebut

### **Langkah 2: Buka Terminal/Command Prompt**
**Windows:**
- Tekan `Win + R`, ketik `cmd`, Enter
- Atau klik kanan di folder → "Open in Terminal"

**Mac/Linux:**
- Buka Terminal
- Navigate ke folder project: `cd /path/to/blackjack-game`

### **Langkah 3: Install Dependencies**
```bash
# Masuk ke folder project
cd blackjack-game

# Install semua package yang dibutuhkan
npm install
```
*Tunggu sampai selesai (ada progress bar)*

### **Langkah 4: Setup Database**
```bash
# Generate Prisma client dan setup database
npm run db:generate
npm run db:push

# Database: SQLite dengan Prisma ORM
# Location: ./db/custom.db
# Sample data: 90+ games, user balance 1,512 GBC
```

### **Langkah 5: Jalankan Aplikasi**
```bash
# Start development server
npm run dev
```

### **Langkah 6: Buka Game**
- Buka browser (Chrome, Firefox, dll)
- Pergi ke: http://localhost:3000
- Game sudah siap dimainkan! 🎉

---

## 🎮 **Cara Main Game**

### **1. Start Game**
- Klik tombol "DEAL CARDS"
- Automatic bet 0.50 GBC

### **2. Gameplay**
- **HIT** - Ambil kartu tambahan
- **STAND** - Cukup dengan kartu sekarang
- **DOUBLE DOWN** - Double bet, ambil 1 kartu

### **3. Menang/Kalah**
- **BlackJack** (21 dengan 2 kartu) = Menang 1.5x
- **Lebih dekat ke 21 dari dealer** = Menang 1x
- **Lebih dari 21** = Kalah
- **Sama dengan dealer** = Seri (Push)

---

## 📱 **Fitur yang Tersedia**

### ✅ **Game Features:**
- Real-time BlackJack gameplay
- Cryptocurrency betting (GBC)
- Mobile responsive design
- Touch-friendly controls
- Game history tracking

### **✅ Data yang Sudah Ada:**
- 🗄️ **Database**: Prisma + SQLite (./db/custom.db)
- 👤 **User Balance**: 1,512.80 GBC
- 🎮 **Game History**: 90+ real games
- 📈 **Win Rate**: 48.9% (realistic)
- 🕐 **Sessions**: 10 gaming sessions
- 🎯 **Game Features**: Full BlackJack rules, betting, statistics

### ✅ **Mobile Features:**
- Pull-to-refresh
- Touch optimized buttons
- Responsive design
- Custom scrollbars

---

## 🛠️ **PANDUAN CEKLIST - Instalasi Sukses**

### **✅ Sebelum Install:**
- [ ] Node.js sudah terinstall (cek dengan `node --version`)
- [ ] Project sudah di-extract
- [ ] Bisa buka terminal/command prompt

### **✅ Proses Install:**
- [ ] `cd blackjack-game` (masuk folder)
- [ ] `npm install` (install dependencies)
- [ ] `npm run db:generate` (generate Prisma client)
- [ ] `npm run db:push` (setup database)
- [ ] `npm run dev` (jalankan server)

### **✅ Testing:**
- [ ] Buka http://localhost:3000
- [ ] Game muncul di browser
- [ ] Bisa main game
- [ ] Buka di HP (mobile responsive)

---

## 🆘 **TROUBLESHOOTING - Kalau Ada Error**

### **Error: "node is not recognized"**
**Solusi:** Install Node.js dulu dari https://nodejs.org/

### **Error: "npm command not found"**
**Solusi:** Install ulang Node.js, restart komputer

### **Error: "Port 3000 already in use"**
**Solusi:** 
```bash
# Kill process di port 3000
npx kill-port 3000
# Atau pakai port lain
npm run dev -- -p 3001
```

### **Error: "Database locked"**
**Solusi:**
```bash
# Delete journal file (SQLite)
rm db/custom.db-journal

# Generate ulang Prisma client
npm run db:generate

# Restart server
npm run dev
```

### **Error: "Module not found"**
**Solusi:**
```bash
# Install ulang dependencies
rm -rf node_modules package-lock.json
npm install
```

### **Error: "Permission denied"**
**Solusi:** Run as Administrator (Windows) atau sudo (Mac/Linux)

---

## 🎯 **QUICK START - 5 Menit Jadi**

### **Cara Super Cepat:**
```bash
# 1. Buka terminal
# 2. Masuk folder project
cd blackjack-game

# 3. Install & run (one command)
npm install && npm run db:generate && npm run db:push && npm run dev

# 4. Buka browser
# http://localhost:3000
```

### **Kalau mau pakai script:**
```bash
# Windows
start.bat

# Mac/Linux  
./start.sh
```

---

## 📊 **MENGENAL PROJECT STRUCTURE**

### **Folder Penting:**
```
blackjack-game/
├── src/
│   ├── app/          # Next.js pages
│   ├── components/   # React components
│   └── lib/          # Database & utilities
├── prisma/           # Database schema
├── db/               # Database files
├── public/           # Static files
└── scripts/          # Database management
```

### **File Penting:**
- `package.json` - List dependencies
- `prisma/schema.prisma` - Database structure
- `src/lib/db.ts` - Database connection
- `src/app/page.tsx` - Main game page
- `db/custom.db` - SQLite database file
- `.env` - Environment variables

---

## 🎮 **TESTING GAME**

### **Desktop Testing:**
1. Buka Chrome/Firefox
2. Pergi ke localhost:3000
3. Klik "DEAL CARDS"
4. Coba HIT, STAND, DOUBLE DOWN
5. Lihat game history

### **Mobile Testing:**
1. Buka HP (connect ke WiFi sama)
2. Buka browser, ke IP komputer:3000
3. Test touch controls
4. Test pull-to-refresh

### **Feature Testing:**
- [ ] Start new game
- [ ] Place bets
- [ ] Hit/Stand actions
- [ ] Win/lose detection
- [ ] Balance updates
- [ ] Game history
- [ ] Mobile responsive

---

## 🚀 **NEXT STEPS - Setelah Jalan**

### **Kalau mau deploy ke internet:**
1. Baca `DEPLOYMENT.md`
2. Pilih platform (Vercel recommended)
3. Follow deployment steps

### **Kalau mau custom game:**
1. Edit `src/app/page.tsx`
2. Modify game logic
3. Update database schema di `prisma/schema.prisma`

### **Kalau mau add features:**
1. Add new API routes di `src/app/api/`
2. Create new components di `src/components/`
3. Update database dengan `npm run db:push`

---

## 🎉 **SELAMAT BERMAIN!**

### **Game Features:**
- 🎰 Real BlackJack gameplay
- 💰 Cryptocurrency betting
- 📱 Mobile optimized
- 📊 Game statistics
- 🎮 Professional UI

### **Contact & Support:**
- Error? Cek troubleshooting section
- Butuh bantuan? Lihat file README.md
- Mau deploy? Baca DEPLOYMENT.md

**Enjoy your BlackJack game! 🃏💰🎰**

---

## 📞 **QUICK HELP**

### **Common Commands:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code quality
npm run db:studio    # View Prisma database
npm run db:push      # Update database schema
npm run db:generate  # Generate Prisma client
```

### **Useful URLs:**
- Game: http://localhost:3000
- Database Studio: http://localhost:5555
- API Docs: http://localhost:3000/api/health

**Happy Coding! 🎮✨**