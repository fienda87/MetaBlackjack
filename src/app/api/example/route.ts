/**
 * Example API route showing dynamic imports pattern
 * Heavy dependencies are loaded only when needed
 */

import { NextRequest, NextResponse } from 'next/server'

// Static imports for critical path
import { validateAction } from '@/lib/validation'

// Dynamic imports for heavy modules
const getGameLogic = async () => {
  const module = await import('@/lib/game-logic')
  return module
}

const getCacheOperations = async () => {
  const module = await import('@/lib/cache-operations')
  return module
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, action, userId } = validateAction(body)

    // Load heavy game logic only when needed
    const { executeAction } = await getGameLogic()
    
    // Perform action...
    const result = executeAction(gameId, action)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
