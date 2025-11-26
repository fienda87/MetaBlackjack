import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, buildCursorPaginationResponse, buildPrismaCursorParams } from '@/lib/pagination'
import { createCachedResponse, CACHE_PRESETS } from '@/lib/http-cache'

export async function GET(request: NextRequest) {
  try {
    // 🚀 Phase 2: Cursor pagination for better performance
    const { searchParams } = new URL(request.url)
    const { limit, cursor } = parsePaginationParams(searchParams)

    const users = await db.user.findMany({
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
      ...(cursor ? { take: limit, skip: 1, cursor: { id: cursor } } : { take: limit })
    })

    const responseData = {
      success: true,
      ...buildCursorPaginationResponse(users, limit)
    }

    // 🚀 Phase 2: Return cached response with ETag
    return createCachedResponse(responseData, request, {
      preset: CACHE_PRESETS.MEDIUM,
      vary: ['Authorization']
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}