import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // 🚀 Select only essential fields
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
      take: 100 // Limit to 100 users
    })

    return NextResponse.json({
      success: true,
      users
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}