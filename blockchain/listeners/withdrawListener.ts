import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { 
  createProvider, // 👈 KITA PAKAI HTTP (Sama seperti Deposit)
  CONTRACT_ADDRESSES, 
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config.js';
import type { WithdrawEvent, ProcessedTransaction } from './types.js';

/**
 * 🛠️ FIXED WITHDRAW LISTENER (PRODUCTION READY)
 * Strategy: HTTP Polling + DB Validation + Correct ABI
 */

// 🔥 ABI UPDATE: Sesuai dengan parameter yang ada di kodingan lama kamu
const CORRECT_WITHDRAW_ABI = [
  "event Withdraw(address indexed player, uint256 amount, uint256 finalBalance, uint256 nonce, uint256 timestamp)"
];

export class WithdrawListener {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null; 
  private isListening: boolean = false;
  private processedTxHashes: Set<string> = new Set();
  
  // Socket.IO instance (injected)
  private io?: any;

  constructor(io?: any) {
    this.io = io;
    console.log('🏗️  WithdrawListener initialized (HTTP Polling Strategy)');
    console.log('📍 Contract:', CONTRACT_ADDRESSES.GAME_WITHDRAW);
    console.log('🌐 RPC:', NETWORK_CONFIG.RPC_URL);
  }

  /**
   * Start listening to Withdraw events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('⚠️  WithdrawListener already running');
      return;
    }

    try {
      // 1️⃣ GUNAKAN HTTP PROVIDER (Stabil)
      this.provider = createProvider();
      
      if (!this.provider) {
        throw new Error('Failed to initialize HTTP provider');
      }

      console.log('📍 Provider initialized (HTTP Mode)');

      // 2️⃣ GUNAKAN ABI YANG SPESIFIK
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESSES.GAME_WITHDRAW,
        CORRECT_WITHDRAW_ABI, 
        this.provider
      );

      // Cek koneksi contract
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.GAME_WITHDRAW);
      if (code === '0x') {
        throw new Error('GameWithdraw contract not found at address');
      }

      const currentBlock = await this.provider.getBlockNumber();
      console.log(`📦 Withdraw Listener watching from block ${currentBlock}`);

      // 3️⃣ LISTEN EVENT
      this.contract.on("Withdraw", async (player, amount, finalBalance, nonce, timestamp, event) => {
          try {
              console.log(`\n════════════════════════════════════════════════════════════`);
              console.log(`🔴 WITHDRAW EVENT DETECTED! (Block ${event.log.blockNumber})`);
              console.log(`👤 Player: ${player}`);
              console.log(`💸 Amount: ${formatGBC(amount)} GBC`); 
              console.log(`🔢 Nonce: ${nonce}`);
              console.log(`════════════════════════════════════════════════════════════\n`);

              await this.handleWithdrawEvent({
                player,
                amount,
                finalBalance,
                nonce,
                timestamp,
                transactionHash: event.log.transactionHash,
                blockNumber: event.log.blockNumber,
                blockTimestamp: Number(timestamp),
                logIndex: event.log.index,
              });

          } catch (error) {
              console.error("❌ Error inside event callback:", error);
          }
      });

      this.isListening = true;
      console.log('✅ WithdrawListener started successfully');

    } catch (error) {
      console.error('❌ Failed to start WithdrawListener:', error instanceof Error ? error.message : error);
      setTimeout(() => this.start(), 5000); 
    }
  }

  /**
   * Handle Withdraw event
   */
  private async handleWithdrawEvent(event: WithdrawEvent): Promise<void> {
    const txHash = event.transactionHash;
    
    // 🛡️ SECURITY CHECK 1: Cek RAM
    if (this.processedTxHashes.has(txHash)) {
      console.log(`⏭️  Skipping duplicate tx (RAM): ${txHash}`);
      return;
    }

    // 🛡️ SECURITY CHECK 2: Cek Database (Anti-Restart)
    const existingTx = await db.transaction.findFirst({
        where: { referenceId: txHash }
    });

    if (existingTx) {
        console.log(`⏭️  Skipping duplicate tx (DB): ${txHash} - Already Processed`);
        this.processedTxHashes.add(txHash);
        return;
    }

    console.log(`\n🟢 Processing Withdraw Logic...`);
    
    try {
      const result = await this.processWithdraw(event);

      this.processedTxHashes.add(txHash);

      if (this.io && result) {
        this.emitBalanceUpdate(result);
      }

      console.log(`✅ Withdrawal FULLY processed successfully`);

    } catch (error) {
      console.error(`❌ Failed to process withdrawal logic:`, error);
    }
  }

  /**
   * Process withdrawal
   */
  private async processWithdraw(event: WithdrawEvent): Promise<ProcessedTransaction | null> {
    const walletAddress = normalizeAddress(event.player);
    const withdrawAmount = formatGBC(event.amount);

    // Try API first
    const apiResult = await this.callProcessingAPI({
      walletAddress,
      amount: withdrawAmount,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
      nonce: Number(event.nonce),
    });

    if (apiResult) {
      console.log(`💸 Balance updated via API: ${apiResult.data.balanceBefore} → ${apiResult.data.balanceAfter}`);
      
      // Emit events manual (backup jika API tidak emit)
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'withdraw',
          amount: withdrawAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        };
        this.io.emit('blockchain:balance-updated', eventData);
        
        this.io.emit('balance:updated', {
            userId: apiResult.data.userId,
            balanceAfter: apiResult.data.balanceAfter
        });
      }
      
      return {
        txHash: event.transactionHash,
        userId: apiResult.data.userId,
        type: 'WITHDRAWAL',
        amount: withdrawAmount,
        balanceBefore: apiResult.data.balanceBefore,
        balanceAfter: apiResult.data.balanceAfter,
        status: 'COMPLETED',
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };
    }

    // Fallback to DB
    console.warn('⚠️  API unavailable, falling back to direct DB access');
    return await this.processWithdrawDirectDB(event, walletAddress, withdrawAmount);
  }

  /**
   * Call internal API
   */
  private async callProcessingAPI(data: any, maxRetries: number = 3): Promise<any | null> {
    const apiKey = process.env.INTERNAL_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/api/withdrawal/process`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': apiKey || '',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error(`API error ${response.status}`);
        const result = await response.json();
        if (result.success) return result;

      } catch (error) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    return null;
  }

  /**
   * Fallback: Process via DB
   */
  private async processWithdrawDirectDB(
    event: WithdrawEvent,
    walletAddress: string,
    withdrawAmount: number
  ): Promise<ProcessedTransaction | null> {
    try {
      const user = await db.user.findUnique({
        where: { walletAddress },
        select: { id: true, balance: true, walletAddress: true },
      });

      if (!user) {
        console.error(`❌ User not found for wallet: ${walletAddress}`);
        return null;
      }

      const balanceBefore = user.balance;
      // Pastikan balance tidak negatif
      const balanceAfter = Math.max(0, balanceBefore - withdrawAmount);

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { decrement: withdrawAmount },
            totalWithdrawn: { increment: withdrawAmount },
          },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount: withdrawAmount.toString(), // 👈 FIX PRISMA TYPE
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            referenceId: event.transactionHash,
            metadata: {
              blockNumber: event.blockNumber,
              timestamp: event.blockTimestamp,
              nonce: event.nonce.toString(),
              onChainAmount: event.amount.toString(),
              fallback: true,
            },
          },
        });
      });

      console.log(`💸 Balance updated (DB fallback): ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)}`);

      return {
        txHash: event.transactionHash,
        userId: user.id,
        type: 'WITHDRAWAL',
        amount: withdrawAmount,
        balanceBefore,
        balanceAfter,
        status: 'COMPLETED',
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };

    } catch (error) {
      console.error('❌ Database operation failed:', error);
      throw error;
    }
  }

  private emitBalanceUpdate(transaction: ProcessedTransaction): void {
    if (!this.io) return;

    const event = {
      type: 'withdrawal',
      userId: transaction.userId,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      txHash: transaction.txHash,
      timestamp: transaction.timestamp.toISOString(),
    };

    this.io.to(transaction.userId).emit('balance:updated', event);
    this.io.emit('withdrawal:confirmed', event);
  }

  async stop(): Promise<void> {
    if (!this.isListening) return;
    if (this.contract) {
      this.contract.removeAllListeners('Withdraw');
    }
    this.isListening = false;
    console.log('🛑 WithdrawListener stopped');
  }

  public getStatus() {
      return {
          isListening: this.isListening,
          processedCount: this.processedTxHashes.size,
          mode: 'HTTP_POLLING'
      };
  }
}
