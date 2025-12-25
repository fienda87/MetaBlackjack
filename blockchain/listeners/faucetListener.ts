import { ethers } from 'ethers';
import { db } from '@/lib/db';
import {
  createProvider,
  createWebSocketProvider,
  CONTRACT_ADDRESSES,
  GBC_FAUCET_ABI,
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config.js';
import type { FaucetClaimEvent, ProcessedTransaction } from './types.js';

/**
 * Faucet Claim Event Listener
 * Listens to GBCFaucet contract Claim events and updates user balance
 */
export class FaucetListener {
  private contract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private isListening: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private processedTxHashes: Set<string> = new Set();
  
  // Socket.IO instance (injected)
  private io?: any;

  constructor(io?: any) {
    // ✅ Use WebSocket provider for stable event listening
    this.provider = createWebSocketProvider() as ethers.JsonRpcProvider;
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.GBC_FAUCET,
      GBC_FAUCET_ABI,
      this.provider
    );
    this.io = io;

    console.log('🏗️  FaucetListener initialized');
    console.log('📍 Contract:', CONTRACT_ADDRESSES.GBC_FAUCET);
    console.log('🌐 RPC:', NETWORK_CONFIG.RPC_URL);
    console.log('🔌 WSS:', NETWORK_CONFIG.WSS_RPC_URL);
  }

  /**
   * Start listening to Claim events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('⚠️  FaucetListener already running');
      return;
    }

    try {
      // Verify contract is deployed
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.GBC_FAUCET);
      if (code === '0x') {
        throw new Error('GBCFaucet contract not found at address');
      }

      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`📦 Starting from block ${currentBlock}`);

      // Listen to new Claim events
      this.contract.on('Claim', async (claimer, amount, timestamp, event) => {
        await this.handleClaimEvent({
          claimer,
          amount,
          timestamp,
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          blockTimestamp: Number(timestamp),
          logIndex: event.log.index,
        });
      });

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log('✅ FaucetListener started successfully');

    } catch (error) {
      console.error('❌ Failed to start FaucetListener:', error);
      await this.handleReconnect();
    }
  }

  /**
   * Handle Claim event
   */
  private async handleClaimEvent(event: FaucetClaimEvent): Promise<void> {
    const txHash = event.transactionHash;
    
    // Prevent duplicate processing
    if (this.processedTxHashes.has(txHash)) {
      console.log(`⏭️  Skipping duplicate tx: ${txHash}`);
      return;
    }

    console.log(`\n🎁 Faucet Claim Event Detected!`);
    console.log(`├─ Claimer: ${event.claimer}`);
    console.log(`├─ Amount: ${formatGBC(event.amount)} GBC`);
    console.log(`├─ Tx Hash: ${txHash}`);
    console.log(`└─ Block: ${event.blockNumber}`);

    try {
      // Wait for block confirmations
      await this.waitForConfirmations(event.blockNumber);

      // Process the claim
      const result = await this.processClaim(event);

      // Mark as processed
      this.processedTxHashes.add(txHash);

      // Emit Socket.IO event for real-time update
      if (this.io && result) {
        this.emitBalanceUpdate(result);
      }

      console.log(`✅ Faucet claim processed successfully`);

    } catch (error) {
      console.error(`❌ Failed to process faucet claim:`, error);
      // Don't mark as processed so it can be retried
    }
  }

  /**
   * Process faucet claim: call internal API with retry logic
   */
  private async processClaim(event: FaucetClaimEvent): Promise<ProcessedTransaction | null> {
    const walletAddress = normalizeAddress(event.claimer);
    const claimAmount = formatGBC(event.amount);

    // Try API first with retry logic
    const apiResult = await this.callProcessingAPI({
      walletAddress,
      amount: claimAmount,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
    });

    if (apiResult) {
      console.log(`🎉 Balance updated via API: ${apiResult.data.balanceBefore.toFixed(2)} → ${apiResult.data.balanceAfter.toFixed(2)} GBC`);
      
      // Emit Socket.IO events directly from listener (faucet only updates wallet, not game balance)
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'faucet',
          amount: claimAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        }
        this.io.emit('blockchain:balance-updated', eventData)
        console.log(`📡 Emitted blockchain:balance-updated for ${walletAddress}`)
      }
      
      return {
        txHash: event.transactionHash,
        userId: apiResult.data.userId,
        type: 'SIGNUP_BONUS',
        amount: claimAmount,
        balanceBefore: apiResult.data.balanceBefore,
        balanceAfter: apiResult.data.balanceAfter,
        status: 'COMPLETED',
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };
    }

    // Fallback to direct DB access if API fails
    console.warn('⚠️  API unavailable, falling back to direct DB access');
    return await this.processClaimDirectDB(event, walletAddress, claimAmount);
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
    const endpoint = `${apiUrl}/api/faucet/process`;

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
   * Fallback: Process claim via direct DB access
   */
  private async processClaimDirectDB(
    event: FaucetClaimEvent,
    walletAddress: string,
    claimAmount: number
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
      const balanceAfter = user.balance; // Faucet does NOT update game balance

      // Create transaction record for tracking (no balance update)
      await db.transaction.create({
        data: {
          userId: user.id,
          type: 'SIGNUP_BONUS',
          amount: claimAmount,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          referenceId: event.transactionHash,
          description: `Faucet claim: ${claimAmount} GBC (on-chain only, use Deposit to move to game balance)`,
          metadata: {
            blockNumber: event.blockNumber,
            timestamp: event.blockTimestamp,
            onChainAmount: event.amount.toString(),
            source: 'faucet',
            fallback: true,
            walletOnly: true, // Flag to indicate this is wallet-only, not game balance
          },
        },
      });

      console.log(`🎉 Faucet claim logged (DB fallback): ${claimAmount} GBC added to wallet (on-chain)`);

      return {
        txHash: event.transactionHash,
        userId: user.id,
        type: 'SIGNUP_BONUS',
        amount: claimAmount,
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
      type: 'faucet_claim',
      userId: transaction.userId,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      txHash: transaction.txHash,
      timestamp: transaction.timestamp.toISOString(),
    };

    // Emit to specific user's room
    this.io.to(transaction.userId).emit('balance:updated', event);
    
    // Also emit faucet claim confirmed event
    this.io.emit('faucet:claimed', event);

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

    this.contract.removeAllListeners('Claim');
    this.isListening = false;
    console.log('🛑 FaucetListener stopped');
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
