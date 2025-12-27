import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { 
  createProvider,
  CONTRACT_ADDRESSES, 
  GBC_FAUCET_ABI,
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config.js';
import type { FaucetClaimEvent, ProcessedTransaction } from './types.js';

/**
 * FaucetListener - ROBUST VERSION
 * 
 * Fixes:
 * - TypeScript "Object is possibly undefined" errors
 * - RPC node filter timeout issues via manual polling
 * - Better resource management and error recovery
 */
export class FaucetListener {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private isListening: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedTxHashes: Set<string> = new Set();
  private lastScannedBlock: number = 0;
  private io?: any;

  constructor(io?: any) {
    this.io = io;
    console.log('🏗️  FaucetListener initialized (Robust Polling Mode)');
  }

  /**
   * Start the listener with initial block scan
   */
  async start(): Promise<void> {
    if (this.isListening) return;

    try {
      this.provider = createProvider();
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESSES.GBC_FAUCET,
        GBC_FAUCET_ABI,
        this.provider
      );

      // Initialize scanning from current block
      const currentBlock = await this.provider.getBlockNumber();
      this.lastScannedBlock = currentBlock - NETWORK_CONFIG.BLOCK_CONFIRMATION;
      
      this.isListening = true;
      this.pollInterval = setInterval(() => this.pollEvents(), NETWORK_CONFIG.POLLING_INTERVAL);
      
      console.log(`✅ FaucetListener started. Scanning from block ${this.lastScannedBlock}`);
    } catch (error) {
      console.error('❌ Failed to start FaucetListener:', error);
      // Retry in 10 seconds
      setTimeout(() => this.start(), 10000);
    }
  }

  /**
   * Manual polling loop to fetch events
   */
  private async pollEvents(): Promise<void> {
    // Guard Clause (Satpam) - Prevents undefined reference errors
    if (!this.contract || !this.provider || !this.isListening) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = this.lastScannedBlock + 1;
      
      // Limit scan range to max 1000 blocks to prevent RPC timeouts
      // Also respect block confirmation delay
      const toBlock = Math.min(
        currentBlock - NETWORK_CONFIG.BLOCK_CONFIRMATION,
        fromBlock + 1000
      );

      if (fromBlock > toBlock) return;

      const events = await this.contract.queryFilter(
        this.contract.filters.Claim(),
        fromBlock,
        toBlock
      );

      for (const event of events) {
        // Double check args existence for TypeScript safety
        if (!('args' in event) || !event.args) continue;

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

      this.lastScannedBlock = toBlock;
    } catch (error) {
      console.error('❌ Faucet Polling Error:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Process detected events with duplicate protection
   */
  private async handleClaimEvent(event: FaucetClaimEvent): Promise<void> {
    const txHash = event.transactionHash;

    // Dual-Layer Duplicate Protection
    // 1. RAM Check
    if (this.processedTxHashes.has(txHash)) return;

    try {
      // 2. DB Check
      const existingTx = await db.transaction.findFirst({
        where: { referenceId: txHash },
        select: { id: true },
      });

      if (existingTx) {
        this.processedTxHashes.add(txHash);
        return;
      }

      const result = await this.processClaim(event);
      if (result) {
        this.processedTxHashes.add(txHash);
        // Manage memory: clear set if it gets too large
        if (this.processedTxHashes.size > 10000) this.processedTxHashes.clear();
      }
    } catch (error) {
      console.error('❌ Failed to handle faucet event:', error);
    }
  }

  /**
   * Process claim via API first, with DB fallback
   */
  private async processClaim(event: FaucetClaimEvent): Promise<ProcessedTransaction | null> {
    const walletAddress = normalizeAddress(event.claimer);
    const claimAmount = formatGBC(event.amount);

    // API-First approach
    const apiResult = await this.callProcessingAPI({
      walletAddress,
      amount: claimAmount,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
    });

    if (apiResult) {
      this.emitBalanceUpdate(apiResult.data, walletAddress, event.transactionHash);
      return apiResult.data;
    }

    // DB Fallback approach
    console.warn(`⚠️  API unavailable for faucet claim, falling back to DB: ${event.transactionHash}`);
    return this.processClaimDirectDB(event, walletAddress, claimAmount);
  }

  /**
   * Call internal API for processing
   */
  private async callProcessingAPI(data: any): Promise<any | null> {
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return null;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/faucet/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': apiKey,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        return result.success ? result : null;
      }
    } catch (error) {
      console.error('❌ API Call failed:', error);
    }
    return null;
  }

  /**
   * Fallback: Process claim directly in database
   */
  private async processClaimDirectDB(
    event: FaucetClaimEvent,
    walletAddress: string,
    claimAmount: number
  ): Promise<ProcessedTransaction | null> {
    try {
      let user = await db.user.findUnique({
        where: { walletAddress },
        select: { id: true, balance: true },
      });

      if (!user) {
        user = await db.user.create({
          data: { walletAddress, balance: 0, startingBalance: 0 },
          select: { id: true, balance: true },
        });
      }

      await db.transaction.create({
        data: {
          userId: user.id,
          type: 'SIGNUP_BONUS',
          amount: claimAmount.toString(),
          balanceBefore: Number(user.balance),
          balanceAfter: Number(user.balance),
          status: 'COMPLETED',
          referenceId: event.transactionHash,
          description: `Faucet claim: ${claimAmount} GBC`,
          metadata: {
            blockNumber: event.blockNumber,
            timestamp: event.blockTimestamp,
            source: 'faucet',
            fallback: true
          },
        },
      });

      const processed: ProcessedTransaction = {
        txHash: event.transactionHash,
        userId: user.id,
        type: 'SIGNUP_BONUS',
        amount: claimAmount,
        balanceBefore: Number(user.balance),
        balanceAfter: Number(user.balance),
        status: 'COMPLETED',
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };

      this.emitBalanceUpdate(processed, walletAddress, event.transactionHash, claimAmount);
      return processed;
    } catch (error) {
      console.error('❌ DB Fallback failed:', error);
      return null;
    }
  }

  /**
   * Emit Socket.IO events for real-time updates
   */
  private emitBalanceUpdate(
    data: any, 
    walletAddress: string, 
    txHash: string, 
    amountFallback?: number
  ): void {
    if (!this.io) return;

    try {
      // Global update event
      this.io.emit('blockchain:balance-updated', {
        walletAddress: walletAddress.toLowerCase(),
        type: 'faucet',
        amount: data?.amount || amountFallback?.toString(),
        txHash,
        timestamp: Date.now()
      });

      // User-specific update event
      if (data?.userId) {
        this.io.to(data.userId).emit('balance:updated', {
          type: 'faucet_claim',
          userId: data.userId,
          amount: data.amount || amountFallback,
          txHash: txHash,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Socket.IO emit failed:', error);
    }
  }

  /**
   * Stop the listener and cleanup
   */
  async stop(): Promise<void> {
    this.isListening = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('🛑 FaucetListener stopped');
  }

  /**
   * Return current status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      lastScannedBlock: this.lastScannedBlock,
      processedCacheSize: this.processedTxHashes.size
    };
  }
}
