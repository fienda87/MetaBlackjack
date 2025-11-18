import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // For demo purposes, use the first available user or create one
    let user = await db.user.findFirst()
    
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
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { balance } = await request.json()
    
    // For demo purposes, use the first available user
    let user = await db.user.findFirst()
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { balance }
    })
    
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user balance:', error)
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }
}