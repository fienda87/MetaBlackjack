import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { 
  createProvider, 
  CONTRACT_ADDRESSES, 
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config.js';
import type { DepositEvent, ProcessedTransaction } from './types.js';

/**
 * 🛠️ FIXED DEPOSIT LISTENER (PRODUCTION READY - FINAL FIX)
 * Fix: Type Casting amount to String for Prisma Transaction
 */

// 🔥 ABI HASIL INVESTIGASI SPY MODE
const CORRECT_DEPOSIT_ABI = [
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp, uint256 balance)"
];

export class DepositListener {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null; 
  private isListening: boolean = false;
  private processedTxHashes: Set<string> = new Set();
  
  // Socket.IO instance (injected)
  private io?: any;

  constructor(io?: any) {
    this.io = io;
    console.log('🏗️  DepositListener initialized (HTTP Polling Strategy)');
    console.log('📍 Contract:', CONTRACT_ADDRESSES.DEPOSIT_ESCROW);
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
      // 1️⃣ GUNAKAN HTTP PROVIDER (Stabil & Anti-Putus)
      this.provider = createProvider();
      
      if (!this.provider) {
        throw new Error('Failed to initialize HTTP provider');
      }

      console.log('📍 Provider initialized (HTTP Mode)');

      // 2️⃣ GUNAKAN ABI YANG SUDAH DIKOREKSI
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESSES.DEPOSIT_ESCROW,
        CORRECT_DEPOSIT_ABI, 
        this.provider
      );

      // Cek koneksi contract
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.DEPOSIT_ESCROW);
      if (code === '0x') {
        throw new Error('DepositEscrow contract not found at address');
      }

      const currentBlock = await this.provider.getBlockNumber();
      console.log(`📦 Listening via HTTP Polling from block ${currentBlock}`);

      // 3️⃣ LISTEN EVENT (DENGAN URUTAN PARAMETER YANG BENAR)
      this.contract.on("Deposit", async (user, amount, timestamp, balance, event) => {
          try {
              console.log(`\n════════════════════════════════════════════════════════════`);
              console.log(`💰 DEPOSIT EVENT DETECTED! (Block ${event.log.blockNumber})`);
              console.log(`👤 User: ${user}`);
              console.log(`💵 Amount Raw: ${amount.toString()}`); 
              console.log(`⏰ Timestamp: ${timestamp.toString()}`);
              console.log(`════════════════════════════════════════════════════════════\n`);

              // Mapping data mentah ke format internal aplikasi
              await this.handleDepositEvent({
                sender: user,
                amount: amount,
                balance: balance, 
                availableRewards: BigInt(0), 
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
      console.log('✅ DepositListener started successfully');

    } catch (error) {
      console.error('❌ Failed to start DepositListener:', error instanceof Error ? error.message : error);
      setTimeout(() => this.start(), 5000); 
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

    console.log(`\n🟢 Processing Deposit Logic...`);
    console.log(`├─ Sender: ${event.sender}`);
    console.log(`├─ Amount: ${formatGBC(event.amount)} GBC`);

    try {
      // Process the deposit
      const result = await this.processDeposit(event);

      // Mark as processed
      this.processedTxHashes.add(txHash);

      // Emit Socket.IO event for real-time update
      if (this.io && result) {
        this.emitBalanceUpdate(result);
      }

      console.log(`✅ Deposit FULLY processed successfully`);

    } catch (error) {
      console.error(`❌ Failed to process deposit logic:`, error);
    }
  }

  /**
   * Process deposit: call internal API with retry logic
   */
  private async processDeposit(event: DepositEvent): Promise<ProcessedTransaction | null> {
    const walletAddress = normalizeAddress(event.sender);
    const depositAmount = formatGBC(event.amount);

    // Try API first with retry logic
    const apiResult = await this.callProcessingAPI({
      walletAddress,
      amount: depositAmount,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
      totalBalance: formatGBC(event.balance),
    });

    if (apiResult) {
      console.log(`💰 Balance updated via API: ${apiResult.data.balanceBefore} → ${apiResult.data.balanceAfter}`);
      
      // Kirim event socket manual
      if (this.io) {
         this.io.emit('balance:updated', {
             userId: apiResult.data.userId,
             balanceAfter: apiResult.data.balanceAfter
         });
      }
      
      return {
        txHash: event.transactionHash,
        userId: apiResult.data.userId,
        type: 'DEPOSIT',
        amount: depositAmount,
        balanceBefore: apiResult.data.balanceBefore,
        balanceAfter: apiResult.data.balanceAfter,
        status: 'COMPLETED',
        blockNumber: event.blockNumber,
        timestamp: new Date(event.blockTimestamp * 1000),
      };
    }

    // Fallback to direct DB access if API fails
    console.warn('⚠️  API unavailable, falling back to direct DB access');
    return await this.processDepositDirectDB(event, walletAddress, depositAmount);
  }

  /**
   * Call internal processing API with retry logic
   */
  private async callProcessingAPI(data: any, maxRetries: number = 3): Promise<any | null> {
    const apiKey = process.env.INTERNAL_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/api/deposit/process`;

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
            username: `User-${walletAddress.slice(0,6)}`
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
            amount: depositAmount.toString(), // 👈 FIX: Convert ke String untuk Prisma
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

      console.log(`💰 Balance updated (DB fallback): ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)}`);

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

    this.io.to(transaction.userId).emit('balance:updated', event);
    this.io.emit('deposit:confirmed', event);
  }

  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    if (!this.isListening) return;
    if (this.contract) {
      this.contract.removeAllListeners('Deposit');
    }
    this.isListening = false;
    console.log('🛑 DepositListener stopped');
  }
}
