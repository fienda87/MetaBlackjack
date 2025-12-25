import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazy-initialize Prisma client to handle missing DATABASE_URL during build time.
 * The Prisma client is only created when first accessed at runtime.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Validate DATABASE_URL at runtime (not at module load time)
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is not set.\n\n' +
        'To fix this issue:\n' +
        '1. If deploying to Railway: Add PostgreSQL plugin to your Railway project\n' +
        '   - Go to Railway dashboard → Click "Create" or "Add Service"\n' +
        '   - Select "PostgreSQL" and deploy\n' +
        '   - DATABASE_URL will be auto-generated and available\n\n' +
        '2. For local development: Create a .env file with DATABASE_URL\n' +
        '   Example: DATABASE_URL="postgresql://user:password@localhost:5432/blackjack"\n\n' +
        '3. For manual Railway setup: Add DATABASE_URL in Variables tab\n' +
        '   Format: postgresql://user:password@host:port/database\n\n' +
        'See .env.example for all required environment variables.'
      )
    }

    // 🚀 ULTRA OPTIMIZED: Fast connection with increased transaction timeout
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      // Increase transaction timeout for slow network/blockchain operations
      transactionOptions: {
        timeout: 30000, // 30 seconds (increased from default 5s)
        maxWait: 10000, // 10 seconds max wait to acquire transaction
        isolationLevel: undefined, // Use default isolation level
      },
    })

    // Configure connection pool for development
    if (process.env.NODE_ENV !== 'production') {
      // Set reasonable timeout for development
      globalForPrisma.prisma.$connect().catch(err => {
        logger.error('Database connection failed', err)
      })
    }
  }

  return globalForPrisma.prisma!
}

/**
 * Proxy-based Prisma client that defers initialization until first use.
 * This allows Next.js to build without DATABASE_URL at build time.
 * At runtime (on Railway), DATABASE_URL will be available when routes execute.
 */
export const db = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    const client = getPrismaClient()
    return (client as any)[prop]
  },
})