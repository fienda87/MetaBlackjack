import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            games: true,
            sessions: true,
            transactions: true
          }
        }
      }
    })

    // Return users without passwords
    const usersWithoutPasswords = users.map(user => {
      const { passwordHash: _, ...userWithoutPassword } = user
      return userWithoutPassword
    })

    return NextResponse.json({
      success: true,
      users: usersWithoutPasswords
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}