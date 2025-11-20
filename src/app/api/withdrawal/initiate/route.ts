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
        { error: 'Invalid request format', details: error.errors },
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
 * Get withdrawal history and status
 */
export async function GET(request: NextRequest) {
  try {
    const playerAddress = request.nextUrl.searchParams.get('playerAddress')
    
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

    // Get withdrawal history from database
    const history = await getWithdrawalHistory(playerAddress)

    return NextResponse.json({
      playerAddress,
      withdrawals: history,
      totalWithdrawn: history.reduce((sum, w: any) => sum + parseFloat(w.amount), 0),
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
 * In production, query from Prisma database
 */
async function getPlayerBalance(playerAddress: string) {
  // TODO: Replace with actual database query
  // const player = await prisma.player.findUnique({ where: { address: playerAddress } })
  
  return {
    playerAddress,
    offChainBalance: '1000', // Placeholder
    lastUpdated: new Date(),
  }
}

/**
 * Store used nonce to prevent replay attacks
 */
async function storeUsedNonce(nonce: number, playerAddress: string) {
  // TODO: Store in database
  // await prisma.usedNonce.create({
  //   data: { nonce, playerAddress, timestamp: new Date() }
  // })
  
  console.log(`Stored nonce ${nonce} for player ${playerAddress}`)
}

/**
 * Get player's withdrawal history
 */
async function getWithdrawalHistory(playerAddress: string) {
  // TODO: Query from database
  // return await prisma.withdrawal.findMany({
  //   where: { playerAddress },
  //   orderBy: { createdAt: 'desc' },
  //   take: 50,
  // })
  
  return [] // Placeholder
}
