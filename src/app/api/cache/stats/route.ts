export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getCacheStats, isRedisConnected } from '@/lib/redis'

/**
 * GET /api/cache/stats
 * Returns cache statistics and health status
 */
export async function GET() {
  try {
    const stats = await getCacheStats()

    return NextResponse.json({
      success: true,
      redis: {
        connected: isRedisConnected(),
        status: stats.connected ? 'healthy' : 'disconnected',
        totalKeys: stats.totalKeys,
        memory: stats.memory,
        hitRate: stats.hitRate,
        performance: {
          target: '> 80%',
          current: stats.hitRate >= 80 ? 'excellent' : stats.hitRate >= 60 ? 'good' : 'needs improvement'
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Cache Stats] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
