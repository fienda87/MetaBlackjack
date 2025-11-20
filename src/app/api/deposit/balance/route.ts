import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * GET /api/deposit/balance
 * 
 * Get player's on-chain and off-chain balance
 * 
 * Query params:
 * - playerAddress: wallet address (0x...)
 * 
 * Response:
 * {
 *   playerAddress: "0x...",
 *   onChainBalance: "500.5",
 *   offChainBalance: "250.25",
 *   totalBalance: "750.75"
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

    // Get balance from database
    const balance = await getPlayerBalance(playerAddress)

    return NextResponse.json({
      playerAddress,
      ...balance,
    })
  } catch (error) {
    console.error('Get deposit balance error:', error)
    return NextResponse.json(
      { error: 'Failed to get balance' },
      { status: 500 }
    )
  }
}

/**
 * Get player's current balance
 * In production, query from Prisma database
 */
async function getPlayerBalance(playerAddress: string) {
  // TODO: Replace with actual database query
  // const player = await prisma.player.findUnique({
  //   where: { address: playerAddress },
  //   select: {
  //     onChainBalance: true,
  //     offChainBalance: true,
  //   }
  // })
  
  // Placeholder - in production this comes from database
  return {
    onChainBalance: '500.50',
    offChainBalance: '250.25',
    totalBalance: '750.75',
    lastUpdated: new Date().toISOString(),
  }
}
