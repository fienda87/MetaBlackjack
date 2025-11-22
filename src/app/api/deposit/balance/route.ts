import { NextRequest, NextResponse } from 'next/server'

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
      return NextResponse.json({ error: 'playerAddress required' }, { status: 400 })
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(playerAddress)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 })
    }

    // 🚀 INSTANT RESPONSE: Static data for testing
    return NextResponse.json({
      playerAddress,
      onChainBalance: '500.50',
      offChainBalance: '250.25',
      totalBalance: '750.75',
      lastUpdated: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 })
  }
}


