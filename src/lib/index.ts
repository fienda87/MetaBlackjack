/**
 * Barrel exports for lib utilities
 * Only export what's needed - helps tree-shaker remove unused code
 */

// ✅ Pure utilities (tree-shakeable)
export * from './card-dealing'
export * from './db-security'
export * from './game-logic'
export * from './request-utils'
export * from './utils'
export * from './validation'
export * from './validation-schemas'

// ✅ Optimized utilities
export * from './query-helpers'
export * from './cache-strategy'
export * from './cache-operations'
export * from './cache-invalidation'
export * from './performance-monitor'
export * from './performance-test'
export * from './optimistic-updates'
export * from './cache-helper'

// ✅ UI helpers
export * from './ui-helpers'

// ✅ Dynamic imports wrapper
export * from './dynamic-imports'

// ⚠️ Heavy dependencies - only export selectively
// Don't re-export these, import directly where needed:
// - redis.ts (server-only)
// - queue.ts (server-only)
// - socket.ts (server-only)
// - socket-instance.ts (server-only)
// - production-db.ts (server-only)
// - audit.ts (server-only)
// - auth-middleware.ts (server-only)
// - middleware.ts (server-only)
// - cors.ts (server-only)
// - internal-auth.ts (server-only)
// - rate-limit.ts (server-only)
// - rate-limiter.ts (server-only)
// - security.ts (server-only)
// - web3-config.ts (server-only)
// - audio-manager.ts (client-side heavy)
// - logger.ts (both sides)
