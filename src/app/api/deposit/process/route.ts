export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withInternalAuth } from '@/lib/internal-auth';
import { invalidateCache, CACHE_KEYS } from '@/lib/cache-helper';
import { z } from 'zod';


/**
 * POST /api/deposit/process
 * 
 * Process deposit event from blockchain listener
 * Updates user balance and creates transaction record
 * 
 * Authentication: Internal API key required
 */

const depositEventSchema = z.object({
  walletAddress: z.string().min(42).max(42), // Ethereum address
  amount: z.number().positive(),
  txHash: z.string().min(66).max(66), // 0x + 64 hex chars
  blockNumber: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  totalBalance: z.number().optional(),
});

export async function POST(request: NextRequest) {
  return withInternalAuth(request, async (req) => {
    try {
      const body = await req.json();
      const validated = depositEventSchema.parse(body);

      const { walletAddress, amount, txHash, blockNumber, timestamp } = validated;
      const normalizedAddress = walletAddress.toLowerCase();

      console.log(`🟢 Processing deposit: ${amount} GBC for ${normalizedAddress}`);

      // Check if transaction already processed
      const existingTx = await db.transaction.findFirst({
        where: {
          referenceId: txHash,
          type: 'DEPOSIT',
        },
      });

      if (existingTx) {
        console.log(`⏭️  Deposit already processed: ${txHash}`);
        return NextResponse.json({
          success: true,
          message: 'Deposit already processed',
          transactionId: existingTx.id,
        });
      }

      // Find or create user
      let user = await db.user.findUnique({
        where: { walletAddress: normalizedAddress },
        select: { id: true, balance: true, walletAddress: true },
      });

      if (!user) {
        console.log(`📝 Creating new user for wallet: ${normalizedAddress}`);
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
      const balanceAfter = balanceBefore + amount;

      // Update balance and create transaction in atomic operation
      const transaction = await db.$transaction(async (tx) => {
        // Update user balance
        await tx.user.update({
          where: { id: user!.id },
          data: {
            balance: { increment: amount },
            totalDeposited: { increment: amount },
          },
        });

        // Create transaction record
        const newTransaction = await tx.transaction.create({
          data: {
            userId: user!.id,
            type: 'DEPOSIT',
            amount,
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            referenceId: txHash,
            description: `Deposit from blockchain: ${amount} GBC`,
            metadata: {
              blockNumber,
              timestamp,
              onChainAmount: amount.toString(),
              source: 'blockchain',
            },
          },
        });

        return newTransaction;
      });

      console.log(`✅ Deposit processed: ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)} GBC`);

      // ✅ Invalidate cache after deposit
      await invalidateCache(`${CACHE_KEYS.BALANCE}${normalizedAddress}`);
      await invalidateCache(`${CACHE_KEYS.USER}${normalizedAddress}`);

      // Note: Socket.IO emit is handled by blockchain listener, not API route
      // API routes in Next.js 15 don't share memory with custom server

      // Return success with transaction details
      return NextResponse.json({
        success: true,
        message: 'Deposit processed successfully',
        data: {
          transactionId: transaction.id,
          userId: user.id,
          walletAddress: normalizedAddress,
          amount,
          balanceBefore,
          balanceAfter,
          txHash,
          blockNumber,
        },
      });

    } catch (error) {
      console.error('❌ Deposit processing error:', error);

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
 * GET /api/deposit/process
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Deposit Processing API',
    status: 'ready',
    version: '1.0.0',
  });
}
