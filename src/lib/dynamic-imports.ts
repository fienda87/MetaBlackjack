/**
 * Dynamic import wrapper for heavy modules
 * Only loads when needed, reduces initial bundle size
 */

// Redis client (only needed server-side)
export const getRedisClient = async () => {
  const { initRedis, isRedisConnected } = await import('@/lib/redis')
  return { initRedis, isRedisConnected }
}

// Game logic (only needed during game)
export const getGameLogic = async () => {
  return import('@/lib/game-logic')
}

// Socket setup (only in server context)
export const getSocketSetup = async () => {
  return import('@/lib/socket')
}

// Prisma client (only in server context)
export const getPrismaClient = async () => {
  return import('@/lib/db').then(m => m.db)
}

// Cache operations (heavy caching logic)
export const getCacheOperations = async () => {
  return import('@/lib/cache-operations')
}

// Performance monitor (server-side heavy operations)
export const getPerformanceMonitor = async () => {
  return import('@/lib/performance-monitor')
}

// Usage example in API route:
// export async function POST(request: Request) {
//   const { cacheGet } = await getCacheOperations()
//   // ...
// }
