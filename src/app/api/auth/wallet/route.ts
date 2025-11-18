import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

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
    const { walletAddress, signature } = await request.json()

    // Validate wallet address format (basic validation)
    if (!walletAddress || (!walletAddress.startsWith('0x') && !walletAddress.startsWith('test_wallet_dummy_')) || (walletAddress.startsWith('0x') && walletAddress.length !== 42)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // For development: accept mock addresses without signature verification
    const mockWallet = MOCK_WALLETS.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
    
    if (mockWallet) {
      // Find or create user
      let user = await db.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
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
          }
        })

        // Create signup bonus transaction
        await db.transaction.create({
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
        })
      } else {
        // Update last login
        user = await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      }

      // Get user's game statistics
      const gameStats = await db.game.groupBy({
        by: ['result'],
        where: { playerId: user.id },
        _count: { result: true },
        _sum: { betAmount: true, netProfit: true }
      })

      const totalGames = gameStats.reduce((sum, stat) => sum + stat._count.result, 0)
      const totalBet = gameStats.reduce((sum, stat) => sum + (stat._sum.betAmount || 0), 0)
      const totalWin = gameStats.reduce((sum, stat) => sum + (stat._sum.netProfit || 0), 0)

      // Get recent games
      const recentGames = await db.game.findMany({
        where: { playerId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          betAmount: true,
          result: true,
          netProfit: true,
          createdAt: true,
          endedAt: true
        }
      })

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
          totalGames,
          totalBet,
          totalWin,
          winRate: totalGames > 0 ? (gameStats.find(s => s.result === 'WIN')?._count.result || 0) / totalGames * 100 : 0
        },
        recentGames,
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