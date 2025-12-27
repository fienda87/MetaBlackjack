import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { 
  createProvider,
  CONTRACT_ADDRESSES, 
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config.js';
import type { FaucetClaimEvent, ProcessedTransaction } from './types.js';

/**
 * CORRECT_FAUCET_ABI - Manual ABI definition for GBCFaucet Claim event
 * This is the canonical event signature for the faucet contract
 */
const CORRECT_FAUCET_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'claimer', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'Claim',
    type: 'event'
  }
] as const;

/**
 * Faucet Claim Event Listener - Production Version
 * 
 * Features:
 * - HTTP Polling Strategy (stable, no WebSocket reconnection issues)
 * - Dual-Layer Duplicate Protection (RAM Set + DB referenceId check)
 * - API-First with DB Fallback (max 3 retries)
 * - Complete Socket.IO event emission
 * - Proper error handling with reconnect delay
 */
export class FaucetListener {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private isListening: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedTxHashes: Set<string> = new Set();
  private lastProcessedBlock: number = 0;
  
  // Socket.IO instance (injected)
  private io?: any;

  constructor(io?: any) {
    this.io = io;
    
    console.log('🏗️  FaucetListener initialized (HTTP polling mode)');
    console.log('📍 Contract:', CONTRACT_ADDRESSES.GBC_FAUCET);
    console.log('🌐 RPC:', NETWORK_CONFIG.RPC_URL);
  }

  /**
   * Start listening to Claim events via HTTP polling
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('⚠️  FaucetListener already running');
      return;
    }

    try {
      // Initialize HTTP provider for stable polling
      this.provider = createProvider();
      
      console.log('📍 Provider initialized:', this.provider.constructor.name);

      // Create contract instance with CORRECT_FAUCET_ABI
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESSES.GBC_FAUCET,
        CORRECT_FAUCET_ABI,
        this.provider
      );

      // Verify contract is deployed
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.GBC_FAUCET);
      if (code === '0x') {
        throw new Error('GBCFaucet contract not found at address');
      }

      console.log('✅ Contract verified at', CONTRACT_ADDRESSES.GBC_FAUCET);

      // Get starting block (last processed or current)
      const currentBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = currentBlock - NETWORK_CONFIG.BLOCK_CONFIRMATION;
      console.log(`📦 Starting polling from block ${this.lastProcessedBlock}`);

      // Start HTTP polling
      this.startPolling();

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log('✅ FaucetListener started successfully (HTTP polling)');

    } catch (error) {
      console.error('❌ Failed to start FaucetListener:', error instanceof Error ? error.message : error);
      await this.handleReconnect();
    }
  }

  /**
   * Start HTTP polling for new events
   */
  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      try {
        await this.pollForEvents();
      } catch (error) {
        console.error('❌ Polling error:', error instanceof Error ? error.message : error);
      }
    }, NETWORK_CONFIG.POLLING_INTERVAL);
    
    console.log(`🔄 Polling every ${NETWORK_CONFIG.POLLING_INTERVAL}ms`);
  }

  /**
   * Poll for new Claim events since last processed block
   */
  private async pollForEvents(): Promise<void> {
    if (!this.contract || !this.provider) {
      throw new Error('Contract or provider not initialized');
    }

    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = this.lastProcessedBlock + 1;
    const toBlock = currentBlock - NETWORK_CONFIG.BLOCK_CONFIRMATION;

    if (fromBlock > toBlock) {
      return; // No new blocks to process
    }

    console.log(`🔍 Checking blocks ${fromBlock} to ${toBlock}...`);

    try {
      const filter = this.contract.filters.Claim();
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        await this.handleClaimEvent({
          claimer: event.args[0] as string,
          amount: event.args[1] as bigint,
          timestamp: event.args[2] as bigint,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: Number(event.args[2]),
          logIndex: event.logIndex,
        });
      }

      // Update last processed block
      if (events.length > 0) {
        this.lastProcessedBlock = events[events.length - 1].blockNumber;
        console.log(`📦 Updated last processed block to ${this.lastProcessedBlock}`);
      } else {
        this.lastProcessedBlock = toBlock;
      }

    } catch (error) {
      console.error('❌ Failed to query events:', error);
      throw error;
    }
  }

  /**
   * Handle Claim event with dual-layer duplicate protection
   */
  private async handleClaimEvent(event: FaucetClaimEvent): Promise<void> {
    const txHash = event.transactionHash;
    
    // LAYER 1: RAM check - Fast in-memory deduplication
    if (this.processedTxHashes.has(txHash)) {
      console.log(`⏭️  RAM skip (already processed): ${txHash.substring(0, 16)}...`);
      return;
    }

    console.log(`\n🎁 Faucet Claim Event Detected!`);
    console.log(`├─ Claimer: ${event.claimer}`);
    console.log(`├─ Amount: ${formatGBC(event.amount)} GBC`);
    console.log(`├─ Tx Hash: ${txHash}`);
    console.log(`├─ Block: ${event.blockNumber}`);
    console.log(`└─ Timestamp: ${new Date(event.blockTimestamp * 1000).toISOString()}`);

    try {
      // LAYER 2: DB check - Persistent duplicate protection via referenceId
      const existingTx = await db.transaction.findFirst({
        where: { referenceId: txHash },
        select: { id: true },
      });

      if (existingTx) {
        console.log(`⏭️  DB skip (referenceId exists): ${txHash.substring(0, 16)}...`);
        this.processedTxHashes.add(txHash);
        return;
      }

      // Process the claim
      const result = await this.processClaim(event);

      if (result) {
        // Mark as processed in RAM
        this.processedTxHashes.add(txHash);
        
        // Limit RAM set size to prevent memory leaks
        if (this.processedTxHashes.size > 10000) {
          const iterator = this.processedTxHashes.keys();
          for (let i = 0; i < 5000; i++) {
            iterator.next();
          }
          const newSet = new Set<string>(Array.from(iterator));
          this.processedTxHashes = newSet;
        }

        // Emit Socket.IO event for real-time update
        if (this.io) {
          this.emitBalanceUpdate(result);
        }

        console.log(`✅ Faucet claim processed successfully: ${txHash.substring(0, 16)}...`);
      }

    } catch (error) {
      console.error(`❌ Failed to process faucet claim:`, error instanceof Error ? error.message : error);
      // Don't mark as processed so it can be retried on next poll
    }
  }

  /**
   * Process faucet claim: API-first with DB fallback
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
      
      // Emit Socket.IO events directly from listener
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'faucet',
          amount: claimAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        };
        this.io.emit('blockchain:balance-updated', eventData);
        console.log(`📡 Emitted blockchain:balance-updated for ${walletAddress}`);
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
   * Call internal processing API with retry logic (max 3 retries)
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
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': apiKey,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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
        console.error(`❌ API call failed (attempt ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`💀 All ${maxRetries} API attempts failed`);
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

      const balanceBefore = Number(user.balance);
      const balanceAfter = balanceBefore; // Faucet does NOT update game balance

      // Create transaction record for tracking (no balance update - wallet only)
      await db.transaction.create({
        data: {
          userId: user.id,
          type: 'SIGNUP_BONUS',
          amount: claimAmount.toString(),
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
            walletOnly: true,
          },
        },
      });

      console.log(`🎉 Faucet claim logged (DB fallback): ${claimAmount} GBC for ${walletAddress}`);

      // Emit Socket.IO event for DB fallback case
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'faucet',
          amount: claimAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        };
        this.io.emit('blockchain:balance-updated', eventData);
        console.log(`📡 Emitted blockchain:balance-updated (DB fallback) for ${walletAddress}`);
      }

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
      console.error('❌ Database operation failed:', error instanceof Error ? error.message : error);
      throw error;
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

    try {
      // Emit to specific user's room
      this.io.to(transaction.userId).emit('balance:updated', event);
      
      // Also emit faucet claim confirmed event
      this.io.emit('faucet:claimed', event);

      console.log(`📡 Socket.IO events emitted for user: ${transaction.userId}`);
    } catch (error) {
      console.error('❌ Failed to emit Socket.IO event:', error);
    }
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💀 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.start();
  }

  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    if (!this.isListening) return;

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Remove all listeners
    if (this.contract) {
      this.contract.removeAllListeners();
    }

    this.isListening = false;
    console.log('🛑 FaucetListener stopped');
  }

  /**
   * Get listener status
   */
  getStatus(): { 
    isListening: boolean; 
    processedCount: number; 
    reconnectAttempts: number;
    lastProcessedBlock: number;
    providerType: string | null;
  } {
    return {
      isListening: this.isListening,
      processedCount: this.processedTxHashes.size,
      reconnectAttempts: this.reconnectAttempts,
      lastProcessedBlock: this.lastProcessedBlock,
      providerType: this.provider ? this.provider.constructor.name : null,
    };
  }
}
