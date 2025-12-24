import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/production-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const health = await db.healthCheck()
    
    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
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