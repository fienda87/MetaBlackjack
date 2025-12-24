export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ error: 'playerAddress required' }, { status: 400 })
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(playerAddress)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 })
    }

    //  INSTANT RESPONSE: Static data for testing
    return NextResponse.json({
      playerAddress,
      canClaim: true,
      claimAmount: '100',
      lastClaimTime: null,
      nextClaimTime: null,
      cooldownDays: 30,
      timestamp: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({ error: 'Failed to get faucet status' }, { status: 500 })
  }
}
