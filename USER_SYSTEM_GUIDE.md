# 👤 User Registration & Balance Management Guide

## 🎯 **OVERVIEW**

Sistem BlackJack game sekarang sudah memiliki **user registration** dengan **starting balance yang bisa diatur**! Setiap user baru akan dapat **1000 GBC** sebagai modal awal, dan Anda bisa mengubahnya kapan saja melalui admin panel.

---

## 🆕 **FITUR BARU YANG DITAMBAHKAN**

### **1. User Registration System**
- ✅ **Register** dengan username, email, password
- ✅ **Login** dengan email dan password
- ✅ **Automatic starting balance** (1000 GBC default)
- ✅ **Transaction tracking** untuk semua balance changes
- ✅ **Audit logging** untuk security

### **2. Configurable Starting Balance**
- ✅ **Admin panel** untuk ubah starting balance
- ✅ **Real-time updates** - new users get latest balance
- ✅ **System configuration** tersimpan di database
- ✅ **Default: 1000 GBC** (bisa diubah 0-10,000 GBC)

### **3. Transaction System**
- ✅ **Complete tracking** semua balance changes
- ✅ **Transaction types**: Signup Bonus, Game Win/Loss, Admin Adjustment
- ✅ **Balance history** untuk setiap user
- ✅ **Audit trail** untuk transparency

### **4. Admin Panel**
- ✅ **Configuration management** - ubah starting balance
- ✅ **User management** - lihat semua user
- ✅ **Balance adjustment** - tambah/kurangi balance user
- ✅ **User statistics** - games, sessions, transactions

---

## 🚀 **CARA KERJA SYSTEM**

### **Registration Flow:**
1. **User register** → System cek configuration
2. **Get starting balance** dari `SystemConfig` table
3. **Create user** dengan balance tersebut
4. **Create transaction** "SIGNUP_BONUS"
5. **Send welcome message** dengan amount bonus

### **Balance Management:**
1. **All balance changes** → Create transaction record
2. **Before/After balance** selalu tercatat
3. **Transaction types** untuk tracking yang jelas
4. **Audit logs** untuk security

### **Admin Configuration:**
1. **Update config** → Langsung berlaku untuk new users
2. **Existing users** tidak terpengaruh (kecuali admin adjust)
3. **Real-time updates** tanpa need restart
4. **Validation** untuk prevent invalid values

---

## 📊 **DATABASE STRUCTURE UPDATE**

### **New Tables:**
```sql
-- Enhanced Users Table
users {
  id, username, email, passwordHash
  balance, startingBalance
  totalDeposited, totalWithdrawn
  isActive, lastLoginAt
  createdAt, updatedAt
}

-- New Transactions Table
transactions {
  id, userId, type, amount
  description, referenceId
  balanceBefore, balanceAfter
  status, metadata
  createdAt, updatedAt
}

-- Enhanced SystemConfig Table
systemConfig {
  id, key, value, description
  createdAt, updatedAt
}
```

### **Configuration Keys:**
- `STARTING_BALANCE` = 1000 (default)
- `MIN_BET` = 0.01 GBC
- `MAX_BET` = 10 GBC  
- `DAILY_BONUS` = 10 GBC

---

## 🎮 **CARA PEMAKAIAN**

### **1. User Registration (Automatic 1000 GBC)**

**API Endpoint:**
```bash
POST /api/auth/register
{
  "username": "player123",
  "email": "player@email.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully! You received 1000 GBC as starting balance.",
  "user": {
    "id": "user_id",
    "username": "player123",
    "email": "player@email.com",
    "balance": 1000,
    "startingBalance": 1000
  },
  "startingBalance": 1000
}
```

### **2. User Login**

**API Endpoint:**
```bash
POST /api/auth/login
{
  "email": "player@email.com",
  "password": "password123"
}
```

### **3. Admin - Ubah Starting Balance**

**API Endpoint:**
```bash
POST /api/admin/config
{
  "STARTING_BALANCE": 1500,
  "MIN_BET": 0.05,
  "MAX_BET": 20,
  "DAILY_BONUS": 15
}
```

### **4. Admin - Adjust User Balance**

**API Endpoint:**
```bash
POST /api/user/{userId}
{
  "amount": 500,
  "type": "ADMIN_BONUS",
  "description": "Bonus for loyal player"
}
```

---

## 🛠️ **SETUP INSTRUCTIONS**

### **1. Update Database**
```bash
# Push schema changes
npm run db:push

# Seed with demo data
node scripts/seed-database.js
```

### **2. Install Dependencies**
```bash
npm install bcryptjs zod
```

### **3. Start Application**
```bash
npm run dev
```

### **4. Test Registration**
- Buka http://localhost:3000
- Register user baru
- Check balance = 1000 GBC

---

## 🎯 **DEMO ACCOUNT**

Setelah seeding, Anda punya demo account:

**Login Details:**
- **Email**: demo@blackjack.com
- **Password**: demo123
- **Balance**: 1000 GBC
- **Games**: 10 sample games
- **Sessions**: 1 session

---

## 📱 **ADMIN PANEL ACCESS**

### **Cara Akses:**
1. Buka aplikasi
2. Akses admin panel (route: /admin)
3. Lihat semua configuration
4. Ubah starting balance
5. Manage user balances

### **Fitur Admin Panel:**
- ✅ **Configuration Tab** - Ubah starting balance dll
- ✅ **User Management Tab** - Lihat semua user
- ✅ **Balance Adjustment** - Tambah/kurangi balance
- ✅ **Real-time Updates** - Langsung berlaku

---

## 🔧 **CUSTOMIZATION OPTIONS**

### **1. Ubah Default Starting Balance**
```javascript
// Di SystemConfig table
await db.systemConfig.upsert({
  where: { key: 'STARTING_BALANCE' },
  update: { value: 2000 },  // Ubah ke 2000 GBC
  create: { key: 'STARTING_BALANCE', value: 2000 }
})
```

### **2. Add New Configuration**
```javascript
// Tambah config baru
await db.systemConfig.create({
  data: {
    key: 'WEEKLY_BONUS',
    value: 100,
    description: 'Weekly bonus for active players'
  }
})
```

### **3. Custom Transaction Types**
```javascript
// Buat custom transaction
await db.transaction.create({
  data: {
    userId: 'user_id',
    type: 'REFERRAL_BONUS',
    amount: 500,
    description: 'Referral bonus for inviting friend',
    balanceBefore: 1000,
    balanceAfter: 1500,
    status: 'COMPLETED'
  }
})
```

---

## 📊 **REPORTING & ANALYTICS**

### **User Statistics:**
```javascript
// Get user stats
const user = await db.user.findUnique({
  where: { id: userId },
  include: {
    _count: {
      select: {
        games: true,
        sessions: true,
        transactions: true
      }
    }
  }
})
```

### **Transaction History:**
```javascript
// Get user transactions
const transactions = await db.transaction.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  take: 20
})
```

### **System Configuration:**
```javascript
// Get current config
const configs = await db.systemConfig.findMany()
const configMap = configs.reduce((acc, config) => {
  acc[config.key] = config.value
  return acc
}, {})
```

---

## 🔒 **SECURITY FEATURES**

### **1. Password Hashing**
- Menggunakan **bcryptjs** untuk hash password
- Salt rounds = 10 (secure)
- Password tidak pernah disimpan plain text

### **2. Input Validation**
- **Zod schema** untuk validate input
- Email format validation
- Password strength requirements
- Username length limits

### **3. Audit Logging**
- Semua user actions tercatat
- IP address dan user agent
- Before/after values untuk changes
- Timestamp untuk semua events

### **4. Transaction Integrity**
- Balance before/after selalu valid
- Negative balance prevention
- Transaction status tracking
- Reference linking untuk traceability

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**

#### **1. "User already exists"**
```bash
# Check existing user
sqlite3 db/dev.db "SELECT * FROM users WHERE email='user@email.com'"

# Delete user if needed
sqlite3 db/dev.db "DELETE FROM users WHERE email='user@email.com'"
```

#### **2. "Invalid starting balance"**
```bash
# Check system config
sqlite3 db/dev.db "SELECT * FROM system_config WHERE key='STARTING_BALANCE'"

# Update config
sqlite3 db/dev.db "UPDATE system_config SET value=1000 WHERE key='STARTING_BALANCE'"
```

#### **3. "Transaction failed"**
```bash
# Check transaction table
sqlite3 db/dev.db "SELECT * FROM transactions WHERE userId='user_id'"

# Check user balance
sqlite3 db/dev.db "SELECT balance FROM users WHERE id='user_id'"
```

---

## 🎉 **SUCCESS CHECKLIST**

### **✅ Registration System:**
- [ ] User bisa register dengan email/password
- [ ] Starting balance otomatis 1000 GBC
- [ ] Transaction record terbuat
- [ ] Audit log tercatat

### **✅ Login System:**
- [ ] User bisa login
- [ ] Password verification works
- [ ] Last login updated
- [ ] User data returned safely

### **✅ Admin Panel:**
- [ ] Configuration bisa diubah
- [ ] Starting balance update real-time
- [ ] User management works
- [ ] Balance adjustment works

### **✅ Database:**
- [ ] Schema updated dengan benar
- [ ] Sample data ter-create
- [ ] Transactions ter-track
- [ ] Audit logs complete

---

## 🚀 **NEXT STEPS**

### **Immediate:**
1. **Test registration** dengan user baru
2. **Test admin panel** untuk ubah config
3. **Test balance adjustment** untuk existing user
4. **Verify transaction tracking**

### **Future Enhancements:**
1. **Email verification** untuk registration
2. **Password reset** functionality  
3. **Two-factor authentication**
4. **Referral system** dengan bonus
5. **Leaderboard** dan achievements
6. **Advanced analytics** dashboard

---

## 🎯 **SUMMARY**

### **✅ What You Have Now:**
- 🎰 **Complete user system** dengan registration/login
- 💰 **Configurable starting balance** (default 1000 GBC)
- 📊 **Full transaction tracking** dan audit logs
- 🛠️ **Admin panel** untuk management
- 🔒 **Security features** (hashing, validation, logging)
- 📱 **Mobile ready** auth components

### **✅ Key Benefits:**
- **1000 GBC starting balance** untuk setiap user baru
- **Flexible configuration** - ubah kapan saja
- **Complete tracking** semua balance changes
- **Admin control** untuk user management
- **Production ready** security features

### **✅ Easy to Use:**
- **One-click registration** dengan automatic bonus
- **Admin panel** yang user-friendly
- **Real-time updates** tanpa restart
- **Complete documentation** dan examples

**Selamat! Sistem user registration dengan configurable starting balance sudah siap! 🎉👤💰**

**Setiap user baru sekarang dapat 1000 GBC, dan Anda bisa mengubahnya kapan saja melalui admin panel! 🎰⚙️**