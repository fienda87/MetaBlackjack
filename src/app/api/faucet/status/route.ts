import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/faucet/status
 * 
 * Check if player can claim faucet tokens
 * 
 * Query params:
 * - playerAddress: wallet address (0x...)
 * 
 * Response:
 * {
 *   playerAddress: "0x...",
 *   canClaim: true,
 *   claimAmount: "100",
 *   lastClaimTime: null,
 *   nextClaimTime: null,
 *   cooldownDays: 30
 * }
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

    const faucetStatus = await getFaucetStatus(playerAddress)

    return NextResponse.json({
      playerAddress,
      ...faucetStatus,
    })
  } catch (error) {
    console.error('Get faucet status error:', error)
    return NextResponse.json(
      { error: 'Failed to get faucet status' },
      { status: 500 }
    )
  }
}

/**
 * Get player's faucet claim status
 * In production, query from Prisma database and smart contract
 */
async function getFaucetStatus(playerAddress: string) {
  // TODO: Replace with actual database and contract queries
  // const claimed = await faucetContract.hasClaimed(playerAddress)
  // const nextClaimTime = await faucetContract.getNextClaimTime(playerAddress)
  // const claimAmount = await faucetContract.CLAIM_AMOUNT()
  
  // Placeholder
  return {
    canClaim: true,
    claimAmount: '100', // 100 GBC
    lastClaimTime: null,
    nextClaimTime: null,
    cooldownDays: 30,
    timestamp: new Date().toISOString(),
  }
}
