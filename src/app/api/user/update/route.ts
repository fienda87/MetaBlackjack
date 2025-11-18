import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const { userId, username } = await request.json()

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'User ID and username are required' },
        { status: 400 }
      )
    }

    // Validate username length
    if (username.trim().length < 2 || username.trim().length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 2 and 30 characters' },
        { status: 400 }
      )
    }

    // Update user in database
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { username: username.trim() }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        walletAddress: updatedUser.walletAddress,
        balance: updatedUser.balance
      }
    })

  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    )
  }
}