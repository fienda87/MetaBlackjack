export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'ethers'

type LoginPayload = {
  address: string
  signature: string
  message: string
  timestamp: string
}

/**
 * POST /api/auth/web3-login
 * Verifies a signed message and creates an authenticated session
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginPayload = await request.json()
    const { address, signature, message, timestamp } = body

    // Validate inputs
    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the signature
    let recovered: string
    try {
      recovered = verifyMessage(message, signature)
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Check signature matches address
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Signature does not match address' },
        { status: 401 }
      )
    }

    // Create session cookie (HTTP-only, secure, expires in 7 days)
    const sessionData = {
      address,
      timestamp: new Date().toISOString(),
      authenticated: true,
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Web3 authentication successful',
        session: sessionData,
      },
      { status: 200 }
    )

    // Set HTTP-only cookie with session
    response.cookies.set({
      name: 'mb_web3_session',
      value: JSON.stringify(sessionData),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Web3 login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/web3-login
 * Verify if the current request has a valid Web3 session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('mb_web3_session')

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    const session = JSON.parse(sessionCookie.value)
    return NextResponse.json(
      {
        authenticated: true,
        session,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Web3 session check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    )
  }
}

/**
 * POST /api/auth/web3-logout
 * Clear the Web3 session cookie
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out' },
    { status: 200 }
  )

  response.cookies.delete('mb_web3_session')

  return response
}
