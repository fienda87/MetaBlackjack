import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/queue';
import { 
  createProvider, 
  CONTRACT_ADDRESSES, 
  DEPOSIT_ESCROW_ABI,
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config';
import type { DepositEvent, ProcessedTransaction } from './types';

/**
 * Deposit Event Listener
 * Listens to DepositEscrow contract Deposit events and updates user balance
 */
export class DepositListener {
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
      CONTRACT_ADDRESSES.DEPOSIT_ESCROW,
      DEPOSIT_ESCROW_ABI,
      this.provider
    );
    this.io = io;
    
    console.log('🏗️  DepositListener initialized');
    console.log('📍 Contract:', CONTRACT_ADDRESSES.DEPOSIT_ESCROW);
    console.log('🌐 RPC:', NETWORK_CONFIG.RPC_URL);
  }

  /**
   * Start listening to Deposit events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('⚠️  DepositListener already running');
      return;
    }

    try {
      // Verify contract is deployed
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.DEPOSIT_ESCROW);
      if (code === '0x') {
        throw new Error('DepositEscrow contract not found at address');
      }

      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`📦 Starting from block ${currentBlock}`);

      // Listen to new Deposit events
      this.contract.on('Deposit', async (player, amount, timestamp, totalBalance, event) => {
        await this.handleDepositEvent({
          player,
          amount,
          timestamp,
          totalBalance,
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          blockTimestamp: Number(timestamp),
          logIndex: event.log.index,
        });
      });

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log('✅ DepositListener started successfully');

    } catch (error) {
      console.error('❌ Failed to start DepositListener:', error);
      await this.handleReconnect();
    }
  }

  /**
   * Handle Deposit event
   */
  private async handleDepositEvent(event: DepositEvent): Promise<void> {
    const txHash = event.transactionHash;
    
    // Prevent duplicate processing
    if (this.processedTxHashes.has(txHash)) {
      console.log(`⏭️  Skipping duplicate tx: ${txHash}`);
      return;
    }

    console.log(`\n🟢 Deposit Event Detected!`);
    console.log(`├─ Player: ${event.player}`);
    console.log(`├─ Amount: ${formatGBC(event.amount)} GBC`);
    console.log(`├─ Tx Hash: ${txHash}`);
    console.log(`└─ Block: ${event.blockNumber}`);

    try {
      // Wait for block confirmations
      await this.waitForConfirmations(event.blockNumber);

      // Process the deposit
      const result = await this.processDeposit(event);

      // Mark as processed
      this.processedTxHashes.add(txHash);

      // Emit Socket.IO event for real-time update
      if (this.io && result) {
        this.emitBalanceUpdate(result);
      }

      console.log(`✅ Deposit processed successfully`);

    } catch (error) {
      console.error(`❌ Failed to process deposit:`, error);
      // Don't mark as processed so it can be retried
    }
  }

  /**
   * Process deposit: enqueue job for async processing (Phase 3)
   */
  private async processDeposit(event: DepositEvent): Promise<ProcessedTransaction | null> {
    const walletAddress = normalizeAddress(event.player);
    const depositAmount = formatGBC(event.amount);

    // 🚀 Phase 3: Enqueue deposit processing job (non-blocking)
    const enqueued = await enqueueJob('blockchain:deposit', {
      player: walletAddress,
      amount: depositAmount.toString(),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp
    });

    if (enqueued) {
      console.log(`📋 Deposit job enqueued for ${walletAddress}: ${depositAmount} GBC`);
      
      // Emit Socket.IO events immediately (optimistic update)
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'deposit',
          amount: depositAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        }
        this.io.emit('blockchain:balance-updated', eventData)
        console.log(`📡 Emitted blockchain:balance-updated for ${walletAddress}`)
      }
      
      return {
        txHash: event.transactionHash,
        userId: 'pending', // Will be resolved by worker
        type: 'DEPOSIT',
        amount: depositAmount,
        balanceBefore: 0, // Will be resolved by worker
        balanceAfter: 0, // Will be resolved by worker
        status: 'COMPLETED', // Set to completed as worker will process
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };
    }

    // Fallback: If queue unavailable, process directly
    console.warn('⚠️  Queue unavailable, processing deposit directly');
    return await this.processDepositDirectDB(event, walletAddress, depositAmount);
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
    const endpoint = `${apiUrl}/api/deposit/process`;

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
   * Fallback: Process deposit via direct DB access
   */
  private async processDepositDirectDB(
    event: DepositEvent,
    walletAddress: string,
    depositAmount: number
  ): Promise<ProcessedTransaction | null> {
    try {
      // Find or create user
      let user = await db.user.findUnique({
        where: { walletAddress },
        select: { id: true, balance: true, walletAddress: true },
      });

      if (!user) {
        console.log(`📝 Creating new user for wallet: ${walletAddress}`);
        user = await db.user.create({
          data: {
            walletAddress,
            balance: 0,
            startingBalance: 0,
          },
          select: { id: true, balance: true, walletAddress: true },
        });
      }

      const balanceBefore = user.balance;
      const balanceAfter = balanceBefore + depositAmount;

      // Update user balance and totalDeposited in a transaction
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user!.id },
          data: {
            balance: { increment: depositAmount },
            totalDeposited: { increment: depositAmount },
          },
        });

        await tx.transaction.create({
          data: {
            userId: user!.id,
            type: 'DEPOSIT',
            amount: depositAmount,
            balanceBefore,
            balanceAfter,
            status: 'COMPLETED',
            referenceId: event.transactionHash,
            metadata: {
              blockNumber: event.blockNumber,
              timestamp: event.blockTimestamp,
              onChainAmount: event.amount.toString(),
              fallback: true,
            },
          },
        });
      });

      console.log(`💰 Balance updated (DB fallback): ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)} GBC`);

      return {
        txHash: event.transactionHash,
        userId: user.id,
        type: 'DEPOSIT',
        amount: depositAmount,
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
      type: 'deposit',
      userId: transaction.userId,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      txHash: transaction.txHash,
      timestamp: transaction.timestamp.toISOString(),
    };

    // Emit to specific user's room
    this.io.to(transaction.userId).emit('balance:updated', event);
    
    // Also emit to wallet address room (if connected via wallet)
    this.io.emit('deposit:confirmed', event);

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

    this.contract.removeAllListeners('Deposit');
    this.isListening = false;
    console.log('🛑 DepositListener stopped');
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
