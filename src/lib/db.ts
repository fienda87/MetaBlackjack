import { PrismaClient } from '@prisma/client'

// Set fallback DATABASE_URL if not already set.
// This handles the Railway build phase where DATABASE_URL isn't available yet.
// At runtime, Railway will inject the real DATABASE_URL.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://fallback:fallback@localhost:5432/fallback'
}

let prisma: PrismaClient | undefined

export const db = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    if (!prisma) {
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        transactionOptions: {
          timeout: 30000,
          maxWait: 10000,
          isolationLevel: undefined,
        },
      })
    }

    return (prisma as any)[prop]
  },
})
