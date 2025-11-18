import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fromCurrency, toCurrency, amount, fromAmount } = await request.json()
    
    // For demo purposes, use the first available user or create one
    let user = await db.user.findFirst()
    if (!user) {
      // Create a demo user if none exists
      user = await db.user.create({
        data: {
          walletAddress: 'demo_' + Math.random().toString(36).substr(2, 9),
          username: 'Player One',
          balance: 1000
        }
      })
    }
    const userId = user.id
    
    // Validate input
    if (!fromCurrency || !toCurrency || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid purchase parameters' }, { status: 400 })
    }

    // Get current prices
    const prices = await db.cryptoPrice.findMany()
    const fromPrice = prices.find(p => p.currency === fromCurrency)
    const toPrice = prices.find(p => p.currency === toCurrency)

    if (!fromPrice || !toPrice) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    // Calculate conversion rate
    let rate: number
    let finalAmount: number
    let totalCost: number

    if (fromCurrency === 'GBC') {
      // Buying crypto with GBC
      rate = fromPrice.priceUSD / toPrice.priceUSD
      finalAmount = amount * rate
      totalCost = amount
    } else if (toCurrency === 'GBC') {
      // Selling crypto for GBC
      rate = toPrice.priceUSD / fromPrice.priceUSD
      finalAmount = amount * rate
      totalCost = fromAmount || (amount * fromPrice.priceGBC)
    } else {
      // Crypto to crypto conversion
      rate = fromPrice.priceGBC / toPrice.priceGBC
      finalAmount = amount * rate
      totalCost = fromAmount || (amount * fromPrice.priceGBC)
    }

    // Check if user has enough balance
    if (fromCurrency === 'GBC' && user.balance < totalCost) {
      return NextResponse.json({ error: 'Insufficient GBC balance' }, { status: 400 })
    }

    // Create transaction record
    const transaction = await db.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT' as const,
        amount: finalAmount,
        description: `Converted ${amount} ${fromCurrency} to ${finalAmount.toFixed(6)} ${toCurrency}`,
        balanceBefore: user.balance,
        balanceAfter: fromCurrency === 'GBC' ? user.balance - totalCost : user.balance + finalAmount,
        status: 'COMPLETED' as const,
        metadata: {
          fromCurrency,
          toCurrency,
          rate,
          totalCost
        }
      }
    })

    // Update user balance if dealing with GBC
    let newBalance = user.balance
    if (fromCurrency === 'GBC') {
      newBalance = user.balance - totalCost
      await db.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      })
    } else if (toCurrency === 'GBC') {
      newBalance = user.balance + finalAmount
      await db.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      })
    }

    // Update or create wallet
    const existingWallet = await db.wallet.findFirst({
      where: { userId, currency: toCurrency }
    })

    if (existingWallet) {
      await db.wallet.update({
        where: { id: existingWallet.id },
        data: { balance: existingWallet.balance + finalAmount }
      })
    } else {
      await db.wallet.create({
        data: {
          userId,
          currency: toCurrency,
          balance: finalAmount,
          address: `${toCurrency.toLowerCase()}_${userId.slice(0, 8)}`
        }
      })
    }

    // Get updated user data
    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    return NextResponse.json({
      success: true,
      transaction,
      user: updatedUser,
      conversionDetails: {
        fromAmount: amount,
        fromCurrency,
        toAmount: finalAmount,
        toCurrency,
        rate,
        totalCost
      }
    })

  } catch (error) {
    console.error('Error processing purchase:', error)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // For demo purposes, use the first available user or create one
    let user = await db.user.findFirst({
      include: {
        wallets: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })
    
    if (!user) {
      // Create a demo user if none exists
      user = await db.user.create({
        data: {
          walletAddress: 'demo_' + Math.random().toString(36).substr(2, 9),
          username: 'Player One',
          balance: 1000
        },
        include: {
          wallets: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
  }
}