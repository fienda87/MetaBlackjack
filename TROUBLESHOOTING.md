# 🆘 Troubleshooting Guide - BlackJack Game

## 🔍 **CEKLIST SEBELUM MULAI**

### ✅ **Harus Dipastikan:**
- [ ] Node.js sudah terinstall (versi 18+)
- [ ] Project sudah di-extract dengan benar
- [ ] Buka terminal/command prompt di folder project yang benar
- [ ] Koneksi internet stabil (untuk download dependencies)

---

## 🚨 **ERROR PALING SERING & SOLUSINYA**

### **1. "node is not recognized"**
**Error Muncul:**
```
'node' is not recognized as an internal or external command
```

**Penyebab:** Node.js belum terinstall
**Solusi:**
1. Download Node.js di https://nodejs.org/
2. Pilih versi **LTS** (Recommended for Most Users)
3. Install dan restart komputer
4. Cek lagi: `node --version`

---

### **2. "npm command not found"**
**Error Muncul:**
```
npm: command not found
```

**Penyebab:** Node.js installation bermasalah
**Solusi:**
1. Uninstall Node.js
2. Install ulang dari https://nodejs.org/
3. Restart komputer
4. Cek: `npm --version`

---

### **3. "Port 3000 already in use"**
**Error Muncul:**
```
Error: listen EADDRINUSE :::3000
```

**Penyebab:** Port 3000 sudah dipakai aplikasi lain
**Solusi:**

**Windows:**
```bash
# Cari process yang pakai port 3000
netstat -ano | findstr :3000

# Kill process (ganti XXXX dengan PID)
taskkill /PID XXXX /F

# Atau pakai tool
npx kill-port 3000
```

**Mac/Linux:**
```bash
# Kill process di port 3000
lsof -ti:3000 | xargs kill -9

# Atau
npx kill-port 3000
```

**Alternatif:** Pakai port lain
```bash
npm run dev -- -p 3001
```

---

### **4. "Database locked"**
**Error Muncul:**
```
Database is locked
SQLite busy
Prisma error: Database is locked
```

**Penyebab:** Database sedang dipakai atau corrupted
**Solusi:**
```bash
# Hapus journal file (SQLite)
rm db/custom.db-journal

# Atau restart server
npm run dev

# Kalau masih error, reset database
npm run db:push

# Generate ulang Prisma client
npm run db:generate
```

---

### **5. "Module not found" / "Cannot resolve module"**
**Error Muncul:**
```
Module not found: Can't resolve 'react'
Error: Cannot find module '@prisma/client'
Cannot find module 'z-ai-web-dev-sdk'
```

**Penyebab:** Dependencies tidak terinstall dengan benar
**Solusi:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Generate Prisma client
npm run db:generate

# Atau coba dengan yarn
yarn install
yarn db:generate
```

---

### **6. "Permission denied"**
**Error Muncul:**
```
Error: EACCES: permission denied
npm ERR! permission denied
```

**Penyebab:** Tidak punya akses admin
**Solusi:**

**Windows:**
- Klik kanan Command Prompt → "Run as administrator"

**Mac/Linux:**
```bash
sudo npm install
# Atau fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

---

### **7. "Failed to compile" / "TypeScript error"**
**Error Muncul:**
```
Failed to compile
TypeScript error in src/app/page.tsx
Prisma Client error: Invalid prisma usage
```

**Penyebab:** Kode error atau missing dependencies
**Solusi:**
```bash
# Cek code quality
npm run lint

# Install missing dependencies
npm install

# Generate Prisma client
npm run db:generate

# Sync database schema
npm run db:push

# Kalau masih error, coba rebuild
npm run build
npm run dev
```

---

### **8. "Game not loading" / "White screen"**
**Gejala:** Halaman kosong atau loading terus
**Penyebab:** JavaScript error atau database connection issue
**Solusi:**
1. Buka browser developer tools (F12)
2. Cek Console tab untuk error
3. Refresh browser (Ctrl+F5)
4. Clear browser cache
5. Restart server: `npm run dev`

---

### **9. "Cannot GET /api/..."**
**Error Muncul:** API endpoints tidak berfungsi
**Penyebab:** Server belum start atau route error
**Solusi:**
```bash
# Pastikan server jalan
npm run dev

# Cek health endpoint
curl http://localhost:3000/api/health

# Restart server
```

---

### **10. "Mobile not working"**
**Gejala:** Di HP tidak responsive atau error
**Penyebab:** IP address atau network issue
**Solusi:**
1. Pastikan HP dan komputer sama-sama WiFi
2. Cek IP komputer: `ipconfig` (Windows) atau `ifconfig` (Mac)
3. Akses via IP: `http://192.168.x.x:3000`
4. Enable firewall exception untuk port 3000

---

### **11. "Prisma Client not generated"**
**Error Muncul:**
```
Error: Prisma Client is not generated
Please run `prisma generate`
```

**Penyebab:** Prisma client belum di-generate setelah schema changes
**Solusi:**
```bash
# Generate Prisma client
npm run db:generate

# Atau langsung dengan Prisma CLI
npx prisma generate

# Sync schema ke database
npm run db:push
```

---

### **12. "z-ai-web-dev-sdk import error"**
**Error Muncul:**
```
Cannot find module 'z-ai-web-dev-sdk'
Module not found: Error: Can't resolve 'z-ai-web-dev-sdk'
```

**Penyebab:** AI SDK tidak terinstall atau version conflict
**Solusi:**
```bash
# Install AI SDK
npm install z-ai-web-dev-sdk

# Atau reinstall semua dependencies
npm install

# Cek package.json
grep "z-ai-web-dev-sdk" package.json
```

---

### **13. "Production database error"**
**Error Muncul:**
```
Error: Production database not configured
DATABASE_URL is missing
```

**Penyebab:** Environment variable untuk database belum diset
**Solusi:**
```bash
# Cek .env file
cat .env

# Setup environment variable
echo "DATABASE_URL=file:./db/custom.db" >> .env.local

# Atau untuk production
echo "DATABASE_URL=postgresql://user:pass@host:5432/db" >> .env.production
```

---

### **14. "'prisma' is not recognized"**
**Error Muncul:**
```
'prisma' is not recognized as an internal or external command,
operable program or batch file.
```

**Penyebab:** Prisma CLI tidak terinstall secara global atau tidak ada di PATH
**Solusi:**
```bash
# Opsi 1: Gunakan npx (Recommended)
npx prisma --version
npx prisma generate
npx prisma db push

# Opsi 2: Install Prisma CLI lokal
npm install prisma --save-dev

# Opsi 3: Install global (requires admin)
npm install -g prisma

# Opsi 4: Gunakan npm scripts
npm run db:generate
npm run db:push
```

**Quick Fix:**
```bash
# One command fix
npm install && npm run db:generate && npm run db:push && npm run dev
```

---

### **15. "Element type is invalid. Received a promise that resolves to: undefined"**
**Error Muncul:**
```
Error: Element type is invalid. Received a promise that resolves to: undefined. 
Lazy element type must resolve to a class or function.
```

**Penyebab:** Lazy loading komponen tidak bisa resolve ke default export
**Solusi:**
```bash
# Restart development server
npm run dev

# Atau clean build
rm -rf .next
npm run build
npm run dev

# Check component exports
grep -n "export default" src/components/GameHistory.tsx
grep -n "export default" src/components/Wallet.tsx
```

**Quick Fix:**
```bash
# Clean restart
npm run build && npm run dev
```

---

## 🔧 **DIAGNOSTIC TOOLS**

### **Cek Environment:**
```bash
# Cek Node.js version
node --version

# Cek npm version
npm --version

# Cek current directory
pwd

# Cek folder contents
ls -la

# Cek available ports
netstat -an | grep 3000
```

### **Cek Project Health:**
```bash
# Cek package.json
cat package.json

# Cek dependencies
npm list

# Cek database
ls -la db/

# Cek logs
npm run dev 2>&1 | tee dev.log
```

### **Database Diagnostics:**
```bash
# Cek database connection
npm run db:push

# View database dengan Prisma Studio
npm run db:studio

# Generate Prisma client
npm run db:generate

# Reset database (dangerous!)
npm run db:push --force-reset

# Cek database file
ls -la db/custom.db
```

---

## 🛠️ **ADVANCED TROUBLESHOOTING**

### **Clean Reinstall:**
```bash
# Backup dulu (kalau ada data penting)
cp -r db backups/

# Clean reinstall
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install

# Setup database
npm run db:generate
npm run db:push

# Start development
npm run dev
```

### **Network Issues:**
```bash
# Cek firewall (Windows)
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow protocol=TCP localport=3000

# Cek firewall (Mac)
sudo ufw allow 3000

# Test local connection
curl http://localhost:3000
```

### **Performance Issues:**
```bash
# Cek memory usage
node --max-old-space-size=4096 node_modules/.bin/next dev

# Cek CPU usage
top | grep node

# Restart server
npm run dev
```

---

## 📱 **MOBILE SPECIFIC ISSUES**

### **Touch Not Working:**
- Pastikan CSS touch events enabled
- Cek browser mobile compatibility
- Test di berbagai mobile browsers

### **Responsive Issues:**
```bash
# Test dengan Chrome DevTools
1. Buka Chrome
2. F12 → Device Toolbar
3. Pilih mobile device
4. Refresh halaman
```

### **Network Issues:**
1. Pastikan WiFi sama
2. Cek IP address: `ipconfig` atau `ifconfig`
3. Test ping dari HP ke komputer
4. Disable firewall sementara

---

## 🆘 **WHEN ALL ELSE FAILS**

### **Last Resort Options:**

**1. Fresh Start:**
```bash
# Delete everything except source code
rm -rf node_modules .next package-lock.json
npm install
npm run db:push
npm run dev
```

**2. Different Port:**
```bash
npm run dev -- -p 3001
npm run dev -- -p 8000
npm run dev -- -p 8080
```

**3. Alternative Package Manager:**
```bash
# Coba dengan yarn
npm install -g yarn
yarn install
yarn dev
```

**4. Docker (Advanced):**
```bash
docker build -t blackjack .
docker run -p 3000:3000 blackjack
```

---

## 📞 **GETTING HELP**

### **Information to Collect:**
1. **Error Message** (screenshot atau copy text)
2. **Operating System** (Windows 10/11, macOS, Linux)
3. **Node.js Version** (`node --version`)
4. **npm Version** (`npm --version`)
5. **Browser** (Chrome, Firefox, Safari)
6. **Steps to Reproduce**

### **Where to Get Help:**
1. **Check this guide first**
2. **Search Google with error message**
3. **Check Stack Overflow**
4. **Ask in developer forums**

### **Quick Diagnostic Command:**
```bash
echo "=== System Info ===" && \
node --version && \
npm --version && \
echo "=== Project Info ===" && \
pwd && \
ls -la && \
echo "=== Dependencies ===" && \
npm list --depth=0
```

---

## ✅ **SUCCESS CHECKLIST**

### **Installation Success:**
- [ ] `node --version` shows v18.x.x or higher
- [ ] `npm install` completed without errors
- [ ] `npm run db:generate` shows "Prisma Client generated"
- [ ] `npm run db:push` shows "Database is up to date"
- [ ] `npm run dev` shows "ready on http://localhost:3000"
- [ ] Browser shows game at http://localhost:3000

### **Game Functionality:**
- [ ] Game loads without errors
- [ ] Can click "DEAL CARDS"
- [ ] Can click HIT/STAND
- [ ] Balance updates correctly
- [ ] Game history shows
- [ ] Mobile responsive works

### **Final Verification:**
- [ ] No console errors in browser
- [ ] All game features working
- [ ] Mobile version works
- [ ] Database operations work

---

## 🎉 **SUCCESS!**

**If all checks pass, your BlackJack game is running perfectly!**

**Enjoy your game! 🎰💰🃏**

**Remember:**
- Game runs on http://localhost:3000
- Mobile: http://YOUR_IP:3000
- Stop server: Ctrl+C
- Restart: `npm run dev`

**Happy Gaming! 🎮✨**