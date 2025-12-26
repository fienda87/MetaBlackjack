import { NextRequest, NextResponse } from 'next/server';
import { checkTransactionStatus } from '@/lib/transaction-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { txHash: string } }
) {
  try {
    const { txHash } = params;
    
    if (!txHash || !txHash.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid transaction hash' },
        { status: 400 }
      );
    }
    
    const result = await checkTransactionStatus(txHash);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[Transaction] Error checking status:', error);
    
    if (error instanceof Error && error.message === 'Transaction not found') {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}
