import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, buildPaginationResponse, buildPrismaOffsetParams } from '@/lib/pagination'

export async function GET(request: NextRequest) {
  try {
    // 🚀 Phase 1: Enforce pagination on all list endpoints
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePaginationParams(searchParams)
    const { skip, take } = buildPrismaOffsetParams(page, limit)

    // 🚀 Parallel queries: fetch users and count simultaneously
    const [users, total] = await Promise.all([
      db.user.findMany({
        select: {
          id: true,
          username: true,
          walletAddress: true,
          balance: true,
          createdAt: true,
          _count: {
            select: {
              games: true,
              sessions: true,
              transactions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      db.user.count()
    ])

    return NextResponse.json({
      success: true,
      ...buildPaginationResponse(users, page, limit, total)
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}