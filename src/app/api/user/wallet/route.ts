import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getCached, invalidateCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache-helper'

/**
 * GET /api/user/wallet?address=0x...
 * Get or create user by wallet address (with Redis cache)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase()
    const cacheKey = `${CACHE_KEYS.USER}${normalizedAddress}`

    // ✅ Use cache with 5 minute TTL
    let user = await getCached(
      cacheKey,
      () => db.user.findUnique({
        where: { walletAddress: normalizedAddress }
      }),
      CACHE_TTL.USER
    )

    // If user doesn't exist, create new one with initial balance
    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress: normalizedAddress,
          username: `Player ${normalizedAddress.slice(0, 6)}`,
          balance: 1000, // Initial game balance
        }
      })

      // ✅ Invalidate cache after user creation
      await invalidateCache(cacheKey)
      await invalidateCache(`${CACHE_KEYS.BALANCE}${normalizedAddress}`)

      logger.info('New user created', {
        address: normalizedAddress,
        username: user.username,
        balance: user.balance
      })
    } else {
      logger.info('Existing user found (cached)', {
        address: normalizedAddress,
        username: user.username,
        balance: user.balance
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    logger.error('Error fetching/creating user by wallet', error)
    return NextResponse.json(
      { error: 'Failed to fetch/create user' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/wallet
 * Create or update user by wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, username } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Normalize address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase()

    // Upsert user (create if not exists, update if exists)
    const user = await db.user.upsert({
      where: { walletAddress: normalizedAddress },
      update: {
        ...(username && { username })
      },
      create: {
        walletAddress: normalizedAddress,
        username: username || `Player ${normalizedAddress.slice(0, 6)}`,
        balance: 1000,
      }
    })

    // ✅ Invalidate cache after upsert
    await invalidateCache(`${CACHE_KEYS.USER}${normalizedAddress}`)
    await invalidateCache(`${CACHE_KEYS.BALANCE}${normalizedAddress}`)

    logger.info('User upserted', {
      address: normalizedAddress,
      username: user.username,
      balance: user.balance
    })

    return NextResponse.json({ user })
  } catch (error) {
    logger.error('Error upserting user', error)
    return NextResponse.json(
      { error: 'Failed to create/update user' },
      { status: 500 }
    )
  }
}
