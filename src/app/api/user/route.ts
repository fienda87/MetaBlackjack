import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // For demo purposes, use the first available user or create one
    const users = await db.user.findMany({ take: 1, select: { id: true, walletAddress: true, email: true, username: true, balance: true } })
    let user = users[0] || null
    
    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress: 'demo-wallet',
          email: 'demo@metablackjack.com',
          username: 'Demo User',
          balance: 1000
        }
      })
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    logger.error('Error fetching user', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { balance } = await request.json()
    
    // For demo purposes, use the first available user
    const users = await db.user.findMany({ take: 1, select: { id: true } })
    const user = users[0] || null
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { balance }
    })
    
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    logger.error('Error updating user balance', error)
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }
}