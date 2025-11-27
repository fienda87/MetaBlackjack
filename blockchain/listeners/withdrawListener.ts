import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/queue';
import { 
  createProvider, 
  CONTRACT_ADDRESSES, 
  GAME_WITHDRAW_ABI,
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config';
import type { WithdrawEvent, ProcessedTransaction } from './types';

/**
 * Withdraw Event Listener
 * Listens to GameWithdraw contract Withdraw events and updates user balance
 */
export class WithdrawListener {
  private contract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private isListening: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private processedTxHashes: Set<string> = new Set();
  
  // Socket.IO instance (injected)
  private io?: any;

  constructor(io?: any) {
    this.provider = createProvider();
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.GAME_WITHDRAW,
      GAME_WITHDRAW_ABI,
      this.provider
    );
    this.io = io;
    
    console.log('🏗️  WithdrawListener initialized');
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
      // Verify contract is deployed
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.GAME_WITHDRAW);
      if (code === '0x') {
        throw new Error('GameWithdraw contract not found at address');
      }

      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`📦 Starting from block ${currentBlock}`);

      // Listen to new Withdraw events
      this.contract.on('Withdraw', async (player, amount, finalBalance, nonce, timestamp, event) => {
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
      });

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log('✅ WithdrawListener started successfully');

    } catch (error) {
      console.error('❌ Failed to start WithdrawListener:', error);
      await this.handleReconnect();
    }
  }

  /**
   * Handle Withdraw event
   */
  private async handleWithdrawEvent(event: WithdrawEvent): Promise<void> {
    const txHash = event.transactionHash;
    
    // Prevent duplicate processing
    if (this.processedTxHashes.has(txHash)) {
      console.log(`⏭️  Skipping duplicate tx: ${txHash}`);
      return;
    }

    console.log(`\n🔴 Withdraw Event Detected!`);
    console.log(`├─ Player: ${event.player}`);
    console.log(`├─ Amount: ${formatGBC(event.amount)} GBC`);
    console.log(`├─ Nonce: ${event.nonce.toString()}`);
    console.log(`├─ Tx Hash: ${txHash}`);
    console.log(`└─ Block: ${event.blockNumber}`);

    try {
      // Wait for block confirmations
      await this.waitForConfirmations(event.blockNumber);

      // Process the withdrawal
      const result = await this.processWithdraw(event);

      // Mark as processed
      this.processedTxHashes.add(txHash);

      // Emit Socket.IO event for real-time update
      if (this.io && result) {
        this.emitBalanceUpdate(result);
      }

      console.log(`✅ Withdrawal processed successfully`);

    } catch (error) {
      console.error(`❌ Failed to process withdrawal:`, error);
      // Don't mark as processed so it can be retried
    }
  }

  /**
   * Process withdrawal: enqueue job for async processing (Phase 3)
   */
  private async processWithdraw(event: WithdrawEvent): Promise<ProcessedTransaction | null> {
    const walletAddress = normalizeAddress(event.player);
    const withdrawAmount = formatGBC(event.amount);

    // 🚀 Phase 3: Enqueue withdrawal processing job (non-blocking)
    const enqueued = await enqueueJob('blockchain:withdraw', {
      player: walletAddress,
      amount: withdrawAmount.toString(),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp
    });

    if (enqueued) {
      console.log(`📋 Withdrawal job enqueued for ${walletAddress}: ${withdrawAmount} GBC`);
      
      // Emit Socket.IO events immediately (optimistic update)
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'withdraw',
          amount: withdrawAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        }
        this.io.emit('blockchain:balance-updated', eventData)
        console.log(`📡 Emitted blockchain:balance-updated for ${walletAddress}`)
      }
      
      return {
        txHash: event.transactionHash,
        userId: 'pending', // Will be resolved by worker
        type: 'WITHDRAWAL',
        amount: withdrawAmount,
        balanceBefore: 0, // Will be resolved by worker
        balanceAfter: 0, // Will be resolved by worker
        status: 'COMPLETED', // Set to completed as worker will process
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };
    }

    // Fallback: If queue unavailable, process directly
    console.warn('⚠️  Queue unavailable, processing withdrawal directly');
    return await this.processWithdrawDirectDB(event, walletAddress, withdrawAmount);
  }

  /**
   * Call internal processing API with retry logic
   */
  private async callProcessingAPI(data: any, maxRetries: number = 3): Promise<any | null> {
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  INTERNAL_API_KEY not configured');
      return null;
    }

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/api/withdrawal/process`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Calling API (attempt ${attempt}/${maxRetries}): ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': apiKey,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`API error ${response.status}: ${error}`);
        }

        const result = await response.json();
        if (result.success) {
          console.log(`✅ API call successful`);
          return result;
        }

        throw new Error(result.error || 'API returned success=false');

      } catch (error) {
        console.error(`❌ API call failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return null;
  }

  /**
   * Fallback: Process withdrawal via direct DB access
   */
  private async processWithdrawDirectDB(
    event: WithdrawEvent,
    walletAddress: string,
    withdrawAmount: number
  ): Promise<ProcessedTransaction | null> {
    try {
      // Find user
      const user = await db.user.findUnique({
        where: { walletAddress },
        select: { id: true, balance: true, walletAddress: true },
      });

      if (!user) {
        console.error(`❌ User not found for wallet: ${walletAddress}`);
        return null;
      }

      const balanceBefore = user.balance;
      const balanceAfter = Math.max(0, balanceBefore - withdrawAmount);

      if (balanceBefore < withdrawAmount) {
        console.warn(`⚠️  Insufficient balance for withdrawal: ${balanceBefore} < ${withdrawAmount}`);
      }

      // Update user balance and totalWithdrawn in a transaction
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
            amount: withdrawAmount,
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            referenceId: event.transactionHash,
            metadata: {
              blockNumber: event.blockNumber,
              timestamp: event.blockTimestamp,
              nonce: event.nonce.toString(),
              onChainAmount: event.amount.toString(),
              finalBalance: event.finalBalance.toString(),
              fallback: true,
            },
          },
        });
      });

      console.log(`💸 Balance updated (DB fallback): ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)} GBC`);

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

  /**
   * Wait for block confirmations before processing
   */
  private async waitForConfirmations(eventBlockNumber: number): Promise<void> {
    const requiredConfirmations = NETWORK_CONFIG.BLOCK_CONFIRMATION;
    
    while (true) {
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - eventBlockNumber;
      
      if (confirmations >= requiredConfirmations) {
        console.log(`✓ ${confirmations} confirmations received`);
        break;
      }
      
      console.log(`⏳ Waiting for confirmations: ${confirmations}/${requiredConfirmations}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  /**
   * Emit Socket.IO event for real-time balance update
   */
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

    // Emit to specific user's room
    this.io.to(transaction.userId).emit('balance:updated', event);
    
    // Also emit withdrawal confirmed event
    this.io.emit('withdrawal:confirmed', event);

    console.log(`📡 Socket.IO event emitted to user: ${transaction.userId}`);
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💀 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.start();
  }

  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    if (!this.isListening) return;

    this.contract.removeAllListeners('Withdraw');
    this.isListening = false;
    console.log('🛑 WithdrawListener stopped');
  }

  /**
   * Get listener status
   */
  getStatus(): { isListening: boolean; processedCount: number; reconnectAttempts: number } {
    return {
      isListening: this.isListening,
      processedCount: this.processedTxHashes.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
