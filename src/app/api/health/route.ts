import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/production-db'
import { CACHE_PRESETS } from '@/lib/http-cache'

export async function GET(request: NextRequest) {
  try {
    const health = await db.healthCheck()
    
    // 🚀 Phase 2: Use standardized cache headers
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': CACHE_PRESETS.NO_CACHE,
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}