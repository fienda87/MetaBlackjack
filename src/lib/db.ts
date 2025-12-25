import { PrismaClient } from '@prisma/client'

// Set fallback DATABASE_URL if not already set
// This handles the Railway build phase where DATABASE_URL isn't available yet
// At runtime, Railway will inject the real DATABASE_URL
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://fallback:fallback@localhost:5432/fallback'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null
}

/**
 * Lazy-initialize Prisma client to handle missing DATABASE_URL during build time.
 * The Prisma client is only created when first accessed at runtime.
 * This allows Next.js to build without DATABASE_URL.
 * 
 * PrismaClient itself doesn't validate DATABASE_URL until connection is attempted,
 * so we can safely create it during build. The actual connection (and potential
 * failure) only happens at runtime when database operations are executed.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
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
  }

  return globalForPrisma.prisma
}

/**
 * Proxy-based Prisma client that defers initialization until first use.
 * This allows Next.js to build without DATABASE_URL at build time.
 * At runtime (on Railway), DATABASE_URL will be available when routes execute.
 * 
 * The Proxy pattern ensures:
 * 1. No DATABASE_URL check at module load time
 * 2. No DATABASE_URL check during Next.js page data collection
 * 3. PrismaClient is created only when first property is accessed
 * 4. Connection errors (from missing DATABASE_URL) only occur at runtime
 */
export const db = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const client = getPrismaClient()
    return (client as any)[prop]
  },
})