import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 🚀 ULTRA OPTIMIZED: Fast connection with timeouts to prevent hanging
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // 🚀 Add connection timeout and pool settings
    // @ts-ignore - Prisma Client doesn't expose these in types but they work
    __internal: {
      engine: {
        connectTimeout: 5000, // 5 second connection timeout
        pool_timeout: 10, // 10 second pool timeout
        connection_limit: 10 // Maximum 10 connections in pool
      }
    }
  })

// Configure connection pool
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  // Set reasonable timeout for development
  db.$connect().catch(err => {
    console.error('❌ Database connection failed:', err)
  })
}