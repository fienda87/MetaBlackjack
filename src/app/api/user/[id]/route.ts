import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get user balance and transaction history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    
    // 🚀 PARALLEL QUERIES
    const [user, transactions] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          walletAddress: true,
          balance: true,
          createdAt: true,
          _count: {
            select: {
              games: true,
              sessions: true,
              transactions: true
            }
          }
        }
      }),
      db.transaction.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10 // Reduce from 20 to 10
      })
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        transactions,
        stats: {
          totalGames: user._count.games,
          totalSessions: user._count.sessions,
          totalTransactions: user._count.transactions
        }
      }
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update user balance (admin function)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const { amount, type, description } = await request.json()

    if (!amount || !type) {
      return NextResponse.json(
        { error: 'Amount and type are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const balanceBefore = user.balance
    let balanceAfter = balanceBefore

    // Calculate new balance based on transaction type
    switch (type) {
      case 'DEPOSIT':
      case 'ADMIN_BONUS':
      case 'SIGNUP_BONUS':
        balanceAfter = balanceBefore + amount
        break
      case 'WITHDRAWAL':
      case 'ADMIN_DEDUCTION':
        balanceAfter = balanceBefore - amount
        if (balanceAfter < 0) {
          return NextResponse.json(
            { error: 'Insufficient balance' },
            { status: 400 }
          )
        }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid transaction type' },
          { status: 400 }
        )
    }

    // Update user balance
    await db.user.update({
      where: { id: userId },
      data: { balance: balanceAfter }
    })

    // Create transaction record
    await db.transaction.create({
      data: {
        userId,
        type: type as any,
        amount,
        description: description || `${type.replace('_', ' ')} - ${amount} GBC`,
        balanceBefore,
        balanceAfter,
        status: 'COMPLETED',
        metadata: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          adminAction: true
        }
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'BALANCE_ADJUSTED',
        resource: 'user',
        resourceId: userId,
        oldValues: { balance: balanceBefore },
        newValues: { balance: balanceAfter },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Balance updated successfully!',
      newBalance: balanceAfter,
      transaction: {
        amount,
        type,
        balanceBefore,
        balanceAfter
      }
    })

  } catch (error) {
    console.error('Update balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}