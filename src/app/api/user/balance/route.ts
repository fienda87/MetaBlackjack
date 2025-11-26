import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/user/balance?address=0x...
 * Get user's off-chain balance by wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address')
    
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    const normalizedAddress = address.toLowerCase()

    // Find user by wallet address
    const user = await db.user.findUnique({
      where: { walletAddress: normalizedAddress },
      select: {
        id: true,
        walletAddress: true,
        balance: true,
        totalDeposited: true,
        totalWithdrawn: true,
        updatedAt: true,
      }
    })

    if (!user) {
      // User not found - they might need to create account first
      return NextResponse.json({
        walletAddress: normalizedAddress,
        gameBalance: '0',
        balance: '0',
        totalDeposited: '0',
        totalWithdrawn: '0',
        exists: false,
        lastUpdated: new Date().toISOString(),
        message: 'User not registered yet',
      })
    }

    return NextResponse.json({
      walletAddress: user.walletAddress,
      gameBalance: user.balance.toString(), // ✅ Key field for useGameBalance hook
      balance: user.balance.toString(), // Keep for backward compatibility
      totalDeposited: user.totalDeposited.toString(),
      totalWithdrawn: user.totalWithdrawn.toString(),
      exists: true,
      lastUpdated: user.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching user balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
