/**
 * Query optimization utilities for efficient database operations
 * Implements parallel queries, explicit field selection, and safe pagination
 */

import { Prisma } from '@prisma/client'

// Helper untuk execute multiple queries in parallel
export const executeParallel = async <T extends readonly any[]>(
  ...queries: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> => {
  return Promise.all(queries) as Promise<{ [K in keyof T]: Awaited<T[K]> }>
}

// Helper untuk enforce safe limits
export const getSafeLimit = (limit?: number): number => {
  const parsed = Math.floor(limit || 20)
  return Math.min(parsed, 100)
}

// Helper untuk field projection
export const projectFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> => {
  return fields.reduce((acc, field) => {
    if (field in obj) acc[field] = obj[field]
    return acc
  }, {} as Partial<T>)
}

// Common field selections untuk optimization
export const USER_SELECT = {
  // For game actions - minimal fields needed
  MINIMAL: {
    id: true,
    balance: true,
    walletAddress: true
  },
  
  // For user profile - public fields
  PROFILE: {
    id: true,
    walletAddress: true,
    balance: true,
    totalDeposited: true,
    totalWithdrawn: true,
    isActive: true,
    createdAt: true,
    updatedAt: true
  },
  
  // For admin - all user data
  ADMIN: {
    id: true,
    walletAddress: true,
    balance: true,
    totalDeposited: true,
    totalWithdrawn: true,
    isActive: true,
    apiKey: true,
    createdAt: true,
    updatedAt: true
  }
}

export const GAME_SELECT = {
  // For game actions - current state only
  ACTION: {
    id: true,
    playerId: true,
    sessionId: true,
    state: true,
    playerHand: true,
    dealerHand: true,
    deck: true,
    currentBet: true,
    insuranceBet: true,
    hasSplit: true,
    hasSurrendered: true,
    hasInsurance: true,
    splitHands: true,
    betAmount: true
  },
  
  // For game history - minimal data
  HISTORY: {
    id: true,
    betAmount: true,
    currentBet: true,
    result: true,
    netProfit: true,
    createdAt: true,
    endedAt: true,
    playerHand: true, // Include for analysis
    dealerHand: true  // Include for analysis
  },
  
  // For game listing - summary data
  LIST: {
    id: true,
    playerId: true,
    betAmount: true,
    currentBet: true,
    state: true,
    result: true,
    netProfit: true,
    createdAt: true
  }
}

export const TRANSACTION_SELECT = {
  // For user transactions
  USER: {
    id: true,
    type: true,
    amount: true,
    description: true,
    status: true,
    referenceId: true,
    createdAt: true,
    balanceBefore: true,
    balanceAfter: true
  },
  
  // For admin - all fields
  ADMIN: {
    id: true,
    userId: true,
    type: true,
    amount: true,
    description: true,
    status: true,
    referenceId: true,
    createdAt: true,
    balanceBefore: true,
    balanceAfter: true,
    user: {
      select: {
        id: true,
        walletAddress: true
      }
    }
  }
}

export const GAME_SESSION_SELECT = {
  // For session stats
  STATS: {
    id: true,
    playerId: true,
    totalGames: true,
    totalBet: true,
    totalWin: true,
    netProfit: true,
    stats: true,
    startTime: true,
    endTime: true
  }
}

// Safe cursor pagination helper
export const buildSafeCursorParams = (
  cursor?: string | null,
  take: number = 20
): {
  take: number
  skip?: number
  cursor?: { id: string }
} => {
  const safeTake = getSafeLimit(take)
  
  return {
    take: safeTake + 1, // Get one extra to check for more
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined
  }
}

// Build cursor pagination response
export const buildCursorPaginationResponse = <T extends { id: string }>(
  items: T[],
  requestedLimit: number
): {
  data: T[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    count: number
  }
} => {
  const safeLimit = getSafeLimit(requestedLimit)
  const hasMore = items.length > safeLimit
  const data = hasMore ? items.slice(0, -1) : items
  
  return {
    data,
    pagination: {
      cursor: hasMore ? data[data.length - 1]?.id || null : null,
      hasMore,
      count: data.length
    }
  }
}

// Time-based query helpers
export const getTimeFilter = (timeRange?: string): {
  where: { [key: string]: { gte: Date } }
} => {
  const now = new Date()
  const filters: Record<string, Date> = {
    '1h': new Date(now.getTime() - 60 * 60 * 1000),
    '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const defaultFilter = filters['24h']
  const selectedFilter = filters[timeRange || '24h'] ?? defaultFilter

  return {
    where: {
      createdAt: { gte: selectedFilter }
    }
  }
}

// Batch operation helper
export const executeBatch = async <T>(
  operations: (() => Promise<T>)[]
): Promise<T[]> => {
  return executeParallel(...operations)
}

// Safe order by helper
export const buildSafeOrderBy = (
  orderBy?: string,
  order?: 'asc' | 'desc'
): Prisma.GameOrderByWithRelationInput => {
  const safeOrder = order === 'desc' ? 'desc' : 'asc'
  
  switch (orderBy) {
    case 'createdAt':
    case 'betAmount':
    case 'netProfit':
      return { [orderBy]: safeOrder }
    default:
      return { createdAt: 'desc' }
  }
}