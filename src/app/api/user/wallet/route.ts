import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/user/wallet?address=0x...
 * Get or create user by wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase()

    // Try to find existing user
    let user = await db.user.findUnique({
      where: { walletAddress: normalizedAddress }
    })

    // If user doesn't exist, create new one with initial balance
    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress: normalizedAddress,
          username: `Player ${normalizedAddress.slice(0, 6)}`,
          balance: 1000, // Initial game balance
        }
      })

      console.log('✅ New user created:', {
        address: normalizedAddress,
        username: user.username,
        balance: user.balance
      })
    } else {
      console.log('✅ Existing user found:', {
        address: normalizedAddress,
        username: user.username,
        balance: user.balance
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('❌ Error fetching/creating user by wallet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch/create user' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/wallet
 * Create or update user by wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, username } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase()

    // Upsert user (create if not exists, update if exists)
    const user = await db.user.upsert({
      where: { walletAddress: normalizedAddress },
      update: {
        ...(username && { username })
      },
      create: {
        walletAddress: normalizedAddress,
        username: username || `Player ${normalizedAddress.slice(0, 6)}`,
        balance: 1000,
      }
    })

    console.log('✅ User upserted:', {
      address: normalizedAddress,
      username: user.username,
      balance: user.balance
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('❌ Error upserting user:', error)
    return NextResponse.json(
      { error: 'Failed to create/update user' },
      { status: 500 }
    )
  }
}
