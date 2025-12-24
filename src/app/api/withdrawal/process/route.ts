import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withInternalAuth } from '@/lib/internal-auth';
import { emitBlockchainBalanceUpdate, emitGameBalanceUpdate } from '@/lib/socket-instance';
import { invalidateCache, CACHE_KEYS } from '@/lib/cache-helper';
import { z } from 'zod';

/**
 * POST /api/withdrawal/process
 * 
 * Process withdrawal event from blockchain listener
 * Decrements user balance and creates transaction record
 * 
 * Authentication: Internal API key required
 */

const withdrawalEventSchema = z.object({
  walletAddress: z.string().min(42).max(42),
  amount: z.number().positive(),
  txHash: z.string().min(66).max(66),
  blockNumber: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  nonce: z.number().int().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  return withInternalAuth(request, async (req) => {
    try {
      const body = await req.json();
      const validated = withdrawalEventSchema.parse(body);

      const { walletAddress, amount, txHash, blockNumber, timestamp, nonce } = validated;
      const normalizedAddress = walletAddress.toLowerCase();

      console.log(`🔴 Processing withdrawal: ${amount} GBC for ${normalizedAddress}`);

      // Check if transaction already processed
      const existingTx = await db.transaction.findFirst({
        where: {
          referenceId: txHash,
          type: 'WITHDRAWAL',
        },
      });

      if (existingTx) {
        console.log(`⏭️  Withdrawal already processed: ${txHash}`);
        return NextResponse.json({
          success: true,
          message: 'Withdrawal already processed',
          transactionId: existingTx.id,
        });
      }

      // Find user
      const user = await db.user.findUnique({
        where: { walletAddress: normalizedAddress },
        select: { id: true, balance: true, walletAddress: true },
      });

      if (!user) {
        console.error(`❌ User not found: ${normalizedAddress}`);
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
            message: `No user found with wallet address ${normalizedAddress}`,
          },
          { status: 404 }
        );
      }

      // Check sufficient balance
      if (user.balance < amount) {
        console.error(`❌ Insufficient balance: has ${user.balance}, needs ${amount}`);
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient balance',
            message: `User has ${user.balance} GBC but withdrawal requires ${amount} GBC`,
            data: {
              userId: user.id,
              currentBalance: user.balance,
              requestedAmount: amount,
              shortfall: amount - user.balance,
            },
          },
          { status: 400 }
        );
      }

      const balanceBefore = user.balance;
      const balanceAfter = balanceBefore - amount;

      // Update balance and create transaction in atomic operation
      const transaction = await db.$transaction(async (tx) => {
        // Update user balance
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { decrement: amount },
            totalWithdrawn: { increment: amount },
          },
        });

        // Create transaction record
        const newTransaction = await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount: -amount, // Negative for withdrawal
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            referenceId: txHash,
            description: `Withdrawal to blockchain: ${amount} GBC`,
            metadata: {
              blockNumber,
              timestamp,
              nonce,
              onChainAmount: amount.toString(),
              destination: 'blockchain',
            },
          },
        });

        return newTransaction;
      });

      console.log(`✅ Withdrawal processed: ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)} GBC`);

      // ✅ Invalidate cache after withdrawal
      await invalidateCache(`${CACHE_KEYS.BALANCE}${normalizedAddress}`);
      await invalidateCache(`${CACHE_KEYS.USER}${normalizedAddress}`);

      // Emit real-time balance updates via Socket.IO
      emitBlockchainBalanceUpdate(normalizedAddress, 'withdraw', amount, txHash);
      emitGameBalanceUpdate(normalizedAddress, balanceAfter);

      // Return success with transaction details
      return NextResponse.json({
        success: true,
        message: 'Withdrawal processed successfully',
        data: {
          transactionId: transaction.id,
          userId: user.id,
          walletAddress: normalizedAddress,
          amount,
          balanceBefore,
          balanceAfter,
          txHash,
          blockNumber,
          nonce,
        },
      });

    } catch (error) {
      console.error('❌ Withdrawal processing error:', error);

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
 * GET /api/withdrawal/process
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Withdrawal Processing API',
    status: 'ready',
    version: '1.0.0',
  });
}
