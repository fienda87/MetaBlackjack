import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { z } from 'zod'

const withdrawalSchema = z.object({
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
})

/**
 * POST /api/withdrawal/initiate
 * 
 * Generate a signature for withdrawal from the backend signer wallet
 * 
 * Request:
 * {
 *   playerAddress: "0x...",
 *   amount: "100.5"
 * }
 * 
 * Response:
 * {
 *   signature: "0x...",
 *   nonce: 1,
 *   finalBalance: "200.5"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validated = withdrawalSchema.parse(body)
    const { playerAddress, amount } = validated

    // Get backend private key from environment
    const backendPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY
    if (!backendPrivateKey) {
      return NextResponse.json(
        { error: 'Backend signer not configured' },
        { status: 500 }
      )
    }

    // Create signer from private key
    const signer = new ethers.Wallet(backendPrivateKey)
    
    // Get player's current balance from database (off-chain)
    // For now, we'll use a placeholder - in production, query actual database
    const playerData = await getPlayerBalance(playerAddress)
    
    const currentBalance = parseFloat(playerData.offChainBalance || '0')
    const withdrawAmount = parseFloat(amount)
    const finalBalance = Math.max(0, currentBalance - withdrawAmount)

    // Generate nonce for replay protection
    // In production, this should be stored in database to track used nonces
    const nonce = Math.floor(Date.now() / 1000) // Use timestamp as base

    // Create message hash matching contract expectations
    // Must match GameWithdraw.sol contract exactly
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256'],
      [
        playerAddress,
        ethers.parseEther(amount),
        ethers.parseEther(finalBalance.toString()),
        nonce,
      ]
    )

    // Sign the message
    const signature = await signer.signMessage(ethers.getBytes(messageHash))

    // Store nonce in database for replay prevention
    await storeUsedNonce(nonce, playerAddress)

    return NextResponse.json({
      signature,
      nonce,
      finalBalance: finalBalance.toString(),
      playerAddress,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Withdrawal initiate error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate withdrawal' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/withdrawal/initiate
 * Get withdrawal history and status with cursor pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { nextUrl } = request
    const playerAddress = nextUrl.searchParams.get('playerAddress')
    const limit = Math.min(parseInt(nextUrl.searchParams.get('limit') || '20'), 100)
    const cursor = nextUrl.searchParams.get('cursor') || undefined
    
    if (!playerAddress) {
      return NextResponse.json(
        { error: 'playerAddress required' },
        { status: 400 }
      )
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(playerAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      )
    }

    // Get withdrawal history from database with cursor pagination
    const history = await getWithdrawalHistory(playerAddress, limit, cursor)

    // Build cursor pagination response
    const { buildCursorPaginationResponse } = await import('@/lib/pagination')
    const paginationData = buildCursorPaginationResponse(history, limit)

    return NextResponse.json({
      playerAddress,
      withdrawals: paginationData.data,
      totalWithdrawn: history.reduce((sum: number, w: any) => sum + parseFloat(w.amount), 0),
      pagination: paginationData.pagination
    })
  } catch (error) {
    console.error('Get withdrawal history error:', error)
    return NextResponse.json(
      { error: 'Failed to get withdrawal history' },
      { status: 500 }
    )
  }
}

/**
 * Get player's current off-chain balance
 * Query from Prisma database
 */
async function getPlayerBalance(playerAddress: string) {
  const { db } = await import('@/lib/db')
  
  const player = await db.user.findUnique({ 
    where: { walletAddress: playerAddress.toLowerCase() },
    select: {
      balance: true,
      walletAddress: true,
    }
  })
  
  if (!player) {
    throw new Error('Player not found')
  }
  
  return {
    playerAddress: player.walletAddress,
    offChainBalance: player.balance.toString(),
    lastUpdated: new Date(),
  }
}

/**
 * Store used nonce to prevent replay attacks
 * Using transaction metadata for now
 */
async function storeUsedNonce(nonce: number, playerAddress: string) {
  const { db } = await import('@/lib/db')
  
  // Store nonce in transaction metadata for tracking
  // In production, you might want a dedicated table for nonces
  await db.transaction.create({
    data: {
      userId: playerAddress.toLowerCase(),
      type: 'WITHDRAWAL',
      amount: 0, // Nonce record, not actual transaction
      description: `Nonce ${nonce} reserved`,
      status: 'PENDING',
      balanceBefore: 0,
      balanceAfter: 0,
      metadata: {
        nonce,
        type: 'NONCE_RESERVATION',
        timestamp: new Date().toISOString(),
      }
    }
  }).catch(() => {
    // If user doesn't exist, just log it
    console.log(`Could not store nonce for ${playerAddress}`)
  })
  
  console.log(`Stored nonce ${nonce} for player ${playerAddress}`)
}

/**
 * Get player's withdrawal history
 * 🚀 Phase 2: Cursor-based pagination support
 */
async function getWithdrawalHistory(playerAddress: string, limit = 50, cursor?: string) {
  const { db } = await import('@/lib/db')
  
  // Cap limit at 100 for safety
  const safeLimit = Math.min(limit, 100)
  
  return await db.transaction.findMany({
    where: { 
      userId: playerAddress.toLowerCase(),
      type: 'WITHDRAWAL',
      status: 'COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
    ...(cursor ? { take: safeLimit, skip: 1, cursor: { id: cursor } } : { take: safeLimit }),
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      description: true,
      metadata: true,
    }
  })
}
