import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 🚀 ULTRA OPTIMIZED: Fast connection with PgBouncer pooling support
// Prefer DATABASE_POOL_URL for production, fallback to DATABASE_URL
const databaseUrl = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    // Optimized transaction settings for PgBouncer
    transactionOptions: {
      timeout: 30000, // 30 seconds (increased from default 5s)
      maxWait: 10000, // 10 seconds max wait to acquire transaction
      isolationLevel: undefined, // Use default isolation level
    },
  })

// Configure connection pool
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  // Set reasonable timeout for development
  db.$connect().catch(err => {
    console.error('❌ Database connection failed:', err)
  })
}