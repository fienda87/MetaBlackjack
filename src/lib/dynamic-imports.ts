/**
 * Dynamic import wrapper for heavy modules
 * Only loads when needed, reduces initial bundle size
 */

// Queue management (only needed in API context)
export const getQueueManager = async () => {
  const { initQueue, initWorker } = await import('@/lib/queue')
  return { initQueue, initWorker }
}

// Redis client (only needed server-side)
export const getRedisClient = async () => {
  const { initRedis, isRedisConnected } = await import('@/lib/redis')
  return { initRedis, isRedisConnected }
}

// Game logic (only needed during game)
export const getGameLogic = async () => {
  return import('@/lib/game-logic')
}

// Blockchain listeners (only needed server-side)
export const getBlockchainListeners = async () => {
  return import('@/blockchain/listeners')
}

// Socket setup (only in server context)
export const getSocketSetup = async () => {
  return import('@/lib/socket')
}

// Prisma client (only in server context)
export const getPrismaClient = async () => {
  return import('@/lib/db').then(m => m.default)
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
//   const { initQueue } = await getQueueManager()
//   // ...
// }
