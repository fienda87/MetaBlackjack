import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { 
  cacheGet, 
  cacheSet,
  cacheDelete,
  isRedisConnected,
  checkRateLimit,
  CACHE_KEYS,
  CACHE_TTL
} from '@/lib/redis'

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
    
    // Rate limiting (10 login attempts per minute per wallet)
    const rateLimit = await checkRateLimit(
      `wallet:${walletAddress}`,
      10, // 10 requests
      60  // per minute
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts',
          message: `Please try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`,
          resetAt: rateLimit.resetAt
        },
        { status: 429 }
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

      // Cache user data in Redis
      if (isRedisConnected()) {
        await cacheSet(`${CACHE_KEYS.USER}${user.id}`, user, CACHE_TTL.USER)
      }

      // Lazy load stats - Don't query on login (performance optimization)
      // Stats will be fetched separately when user opens dashboard/history
      const totalGames = 0
      const totalBet = 0
      const totalWin = 0
      const recentGames: any[] = []
      
      // NOTE: Stats are now loaded lazily via /api/history endpoint
      // This reduces login time from ~800ms to ~200ms

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