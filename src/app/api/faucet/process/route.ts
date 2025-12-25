export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withInternalAuth } from '@/lib/internal-auth';
import { emitBlockchainBalanceUpdate } from '@/lib/socket-instance';
import { z } from 'zod';


/**
 * POST /api/faucet/process
 * 
 * Process faucet claim event from blockchain listener
 * Awards 100 GBC signup bonus and creates transaction record
 * 
 * Authentication: Internal API key required
 */

const faucetClaimSchema = z.object({
  walletAddress: z.string().min(42).max(42),
  amount: z.number().positive(),
  txHash: z.string().min(66).max(66),
  blockNumber: z.number().int().positive(),
  timestamp: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  return withInternalAuth(request, async (req) => {
    try {
      const body = await req.json();
      const validated = faucetClaimSchema.parse(body);

      const { walletAddress, amount, txHash, blockNumber, timestamp } = validated;
      const normalizedAddress = walletAddress.toLowerCase();

      console.log(`🚰 Processing faucet claim: ${amount} GBC for ${normalizedAddress}`);

      // Check if transaction already processed
      const existingTx = await db.transaction.findFirst({
        where: {
          referenceId: txHash,
          type: 'SIGNUP_BONUS',
        },
      });

      if (existingTx) {
        console.log(`⏭️  Faucet claim already processed: ${txHash}`);
        return NextResponse.json({
          success: true,
          message: 'Faucet claim already processed',
          transactionId: existingTx.id,
        });
      }

      // Find or create user
      let user = await db.user.findUnique({
        where: { walletAddress: normalizedAddress },
        select: { id: true, balance: true, walletAddress: true },
      });

      if (!user) {
        console.log(`📝 Creating new user for faucet claim: ${normalizedAddress}`);
        user = await db.user.create({
          data: {
            walletAddress: normalizedAddress,
            balance: 0,
            startingBalance: 0,
          },
          select: { id: true, balance: true, walletAddress: true },
        });
      }

      const balanceBefore = user.balance;
      const balanceAfter = user.balance; // Faucet does NOT update game balance

      // Create transaction record for tracking (no balance update)
      const transaction = await db.transaction.create({
        data: {
          userId: user.id,
          type: 'SIGNUP_BONUS',
          amount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          referenceId: txHash,
          description: `Faucet claim: ${amount} GBC (on-chain only, use Deposit to move to game balance)`,
          metadata: {
            blockNumber,
            timestamp,
            onChainAmount: amount.toString(),
            source: 'faucet',
            claimType: 'signup_bonus',
            walletOnly: true, // Flag to indicate this is wallet-only, not game balance
          },
        },
      });

      console.log(`✅ Faucet claim logged: ${amount} GBC added to wallet (on-chain)`);

      // Emit real-time balance update via Socket.IO (faucet only updates wallet, not game balance)
      emitBlockchainBalanceUpdate(normalizedAddress, 'faucet', amount, txHash);

      // Return success with transaction details
      return NextResponse.json({
        success: true,
        message: 'Faucet claim processed successfully',
        data: {
          transactionId: transaction.id,
          userId: user.id,
          walletAddress: normalizedAddress,
          amount,
          balanceBefore,
          balanceAfter,
          txHash,
          blockNumber,
          bonusType: 'SIGNUP_BONUS',
        },
      });

    } catch (error) {
      console.error('❌ Faucet claim processing error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: error.issues,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/faucet/process
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Faucet Processing API',
    status: 'ready',
    version: '1.0.0',
  });
}
