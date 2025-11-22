import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mock wallet addresses for testing
const MOCK_WALLETS = [
  {
    address: '0x1234567890123456789012345678901234567890',
    username: 'TestPlayer1',
    balance: 10000.0
  },
  {
    address: '0x9876543210987654321098765432109876543210',
    username: 'TestPlayer2', 
    balance: 10000.0
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    username: 'CryptoWhale',
    balance: 10000.0
  },
  {
    address: 'test_wallet_dummy_4j5a9o8a5',
    username: 'TestDummy',
    balance: 1000.0
  }
]

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    // Validate wallet address format (basic validation)
    if (!walletAddress || (!walletAddress.startsWith('0x') && !walletAddress.startsWith('test_wallet_dummy_')) || (walletAddress.startsWith('0x') && walletAddress.length !== 42)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }
    
    // 🚀 REMOVED: Redis rate limiting (was causing 70s timeouts)

    // For development: accept mock addresses without signature verification
    const mockWallet = MOCK_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
    
    if (mockWallet) {
      // 🚀 OPTIMIZED: Check user with minimal fields
      let user = await db.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        select: { id: true, walletAddress: true, username: true, balance: true, createdAt: true, lastLoginAt: true }
      })

      if (!user) {
        // Create new user with mock data
        user = await db.user.create({
          data: {
            walletAddress: walletAddress.toLowerCase(),
            username: mockWallet.username,
            balance: mockWallet.balance,
            startingBalance: mockWallet.balance,
            lastLoginAt: new Date(),
            isActive: true
          },
          select: { id: true, walletAddress: true, username: true, balance: true, createdAt: true, lastLoginAt: true }
        })

        // 🚀 FIRE-AND-FORGET: Create signup bonus transaction (non-blocking)
        db.transaction.create({
          data: {
            userId: user.id,
            type: 'SIGNUP_BONUS',
            amount: mockWallet.balance,
            description: 'Welcome bonus for new player',
            balanceBefore: 0,
            balanceAfter: mockWallet.balance,
            status: 'COMPLETED',
            metadata: {
              walletAddress,
              isMock: true
            }
          }
        }).catch(err => console.error('Signup bonus transaction failed:', err))
      } else {
        // 🚀 FIRE-AND-FORGET: Update last login (non-blocking)
        db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        }).catch(err => console.error('Last login update failed:', err))
      }

      // 🚀 ULTRA FAST: No stats query on login - fetch lazily
      // This reduces login time from 120s to <1s
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          balance: user.balance,
          createdAt: user.createdAt
        },
        stats: {
          totalGames: 0,
          totalBet: 0,
          totalWin: 0,
          winRate: 0
        },
        recentGames: [],
        isMock: true
      })
    }

    // For real wallet addresses (future implementation)
    // TODO: Implement proper signature verification using ethers.js
    return NextResponse.json(
      { error: 'Signature verification not implemented yet. Please use mock wallet addresses.' },
      { status: 501 }
    )

  } catch (error) {
    console.error('Wallet login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get available mock wallets for testing
export async function GET() {
  return NextResponse.json({
    mockWallets: MOCK_WALLETS,
    message: 'Use any of these wallet addresses for testing'
  })
}