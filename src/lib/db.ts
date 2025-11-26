import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 🚀 ULTRA OPTIMIZED: Fast connection with increased transaction timeout
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Increase transaction timeout for slow network/blockchain operations
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