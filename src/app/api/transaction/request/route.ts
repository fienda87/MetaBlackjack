import { NextRequest, NextResponse } from 'next/server';
import { createTransaction } from '@/lib/transaction-service.js';
import { db } from '@/lib/db.js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { userId, type, amount, txHash, walletAddress } = body;
    
    // If userId is missing but walletAddress is provided, look up the user
    if (!userId && walletAddress) {
      const user = await db.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        select: { id: true }
      });
      if (user) {
        userId = user.id;
      }
    }

    // Validate required fields
    if (!userId || !type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields (userId or walletAddress, type, amount)' },
        { status: 400 }
      );
    }
    
    // Validate type
    if (!['DEPOSIT', 'WITHDRAW', 'FAUCET'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }
    
    // For DEPOSIT, txHash is required
    if (type === 'DEPOSIT' && !txHash) {
      return NextResponse.json(
        { error: 'txHash required for DEPOSIT' },
        { status: 400 }
      );
    }
    
    const result = await createTransaction({ userId, type, amount, txHash });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[Transaction] Error creating transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
