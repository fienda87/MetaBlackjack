/**
 * Pagination utilities for consistent API responses
 * Phase 1 DB tuning - enforce pagination on all list endpoints
 */

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
    nextCursor?: string
  }
}

export interface CursorPaginationResult<T> {
  data: T[]
  pagination: {
    limit: number
    nextCursor?: string
    hasMore: boolean
  }
}

/**
 * Parse and validate pagination parameters from request
 * Enforces maximum limit of 100 items
 */
export function parsePaginationParams(searchParams: URLSearchParams): Required<Pick<PaginationParams, 'page' | 'limit'>> & { cursor?: string } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const cursor = searchParams.get('cursor') || undefined
  
  return { page, limit, cursor }
}

/**
 * Build offset pagination response
 */
export function buildPaginationResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit)
  const hasMore = page < totalPages

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore
    }
  }
}

/**
 * Build cursor-based pagination response
 */
export function buildCursorPaginationResponse<T extends { id: string }>(
  data: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = data.length === limit
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined

  return {
    data,
    pagination: {
      limit,
      nextCursor,
      hasMore
    }
  }
}

/**
 * Calculate skip/offset for Prisma queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Build Prisma pagination query params
 */
export function buildPrismaOffsetParams(page: number, limit: number) {
  return {
    skip: calculateOffset(page, limit),
    take: limit
  }
}

/**
 * Build Prisma cursor pagination params
 */
export function buildPrismaCursorParams(cursor: string | undefined, limit: number) {
  return cursor
    ? {
        take: limit,
        skip: 1, // Skip the cursor
        cursor: { id: cursor }
      }
    : {
        take: limit
      }
}
