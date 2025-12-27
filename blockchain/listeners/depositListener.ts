import { ethers } from 'ethers';
import { db } from '@/lib/db';
import { 
  createProvider, // 👈 KITA PAKAI HTTP (Stabil)
  CONTRACT_ADDRESSES, 
  formatGBC,
  normalizeAddress,
  NETWORK_CONFIG
} from './config.js';
import type { DepositEvent, ProcessedTransaction } from './types.js';

/**
 * 🛠️ FIXED DEPOSIT LISTENER (HYBRID VERSION)
 * Struktur Original + Koreksi ABI & HTTP Polling
 */

// 🔥 KITA DEFINISIKAN ABI YANG BENAR DI SINI (HASIL SPY MODE)
// Mengabaikan DEPOSIT_ESCROW_ABI dari config yang mungkin salah.
const CORRECT_DEPOSIT_ABI = [
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp, uint256 balance)"
];

export class DepositListener {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null; // Ubah ke JsonRpcProvider (HTTP)
  private isListening: boolean = false;
  private processedTxHashes: Set<string> = new Set();
  
  // Socket.IO instance (injected)
  private io?: any;

  constructor(io?: any) {
    this.io = io;
    
    console.log('🏗️  DepositListener initialized (HTTP Polling Mode)');
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
      // 1️⃣ GUNAKAN HTTP PROVIDER (Bukan WebSocket)
      // Ini memanfaatkan fitur polling otomatis Ethers.js yang "Anti-Putus"
      this.provider = createProvider();
      
      if (!this.provider) {
        throw new Error('Failed to initialize HTTP provider');
      }

      console.log('📍 Provider initialized (HTTP Mode)');

      // 2️⃣ GUNAKAN ABI YANG SUDAH DIKOREKSI
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESSES.DEPOSIT_ESCROW,
        CORRECT_DEPOSIT_ABI, // 👈 Pakai ABI yang benar
        this.provider
      );

      // Verify contract code exists
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.DEPOSIT_ESCROW);
      if (code === '0x') {
        throw new Error('DepositEscrow contract not found at address');
      }

      const currentBlock = await this.provider.getBlockNumber();
      console.log(`📦 Starting HTTP Polling from block ${currentBlock}`);

      // 3️⃣ LISTEN EVENT DENGAN ARGUMEN YANG BENAR
      // Urutan dari Spy Mode: user, amount, timestamp, balance
      this.contract.on("Deposit", async (user, amount, timestamp, balance, event) => {
          try {
              console.log(`\n════════════════════════════════════════════════════════════`);
              console.log(`💰 DEPOSIT EVENT DETECTED! (Block ${event.log.blockNumber})`);
              console.log(`👤 User: ${user}`);
              console.log(`💵 Amount Raw: ${amount.toString()}`); // Wei
              console.log(`⏰ Timestamp: ${timestamp.toString()}`);
              console.log(`🏦 Balance Info: ${balance.toString()}`);
              console.log(`════════════════════════════════════════════════════════════\n`);

              const blockNumber = event.log.blockNumber;
              // Timestamp kita ambil dari event langsung (karena kontrak mengirimnya), lebih akurat
              const blockTimestamp = Number(timestamp); 

              // Mapping ke struktur DepositEvent original kamu
              // Kita isi availableRewards dengan 0 karena kontrak ternyata tidak mengirim rewards
              await this.handleDepositEvent({
                sender: user,
                amount: amount,
                balance: balance,
                availableRewards: BigInt(0), // Dummy, karena tidak ada di event asli
                transactionHash: event.log.transactionHash,
                blockNumber: blockNumber,
                blockTimestamp: blockTimestamp,
                logIndex: event.log.index,
              });

          } catch (error) {
              console.error("❌ Error processing deposit event logic:", error);
          }
      });

      this.isListening = true;
      console.log('✅ DepositListener started successfully (HTTP Polling Active)');

    } catch (error) {
      console.error('❌ Failed to start DepositListener:', error instanceof Error ? error.message : error);
      // Retry logic removed for simple start failure, Railway will restart the process if needed
      setTimeout(() => this.start(), 5000); // Simple retry
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
    console.log(`├─ Amount: ${formatGBC(event.amount)} POL/GBC`);
    console.log(`└─ Tx Hash: ${txHash}`);

    try {
      // Wait for block confirmations
      // await this.waitForConfirmations(event.blockNumber); // Opsional: Bisa di-skip biar cepat untuk testing

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
      console.error(`❌ Failed to process deposit:`, error);
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
      
      if (this.io) {
        const eventData = {
          walletAddress: walletAddress.toLowerCase(),
          type: 'deposit',
          amount: depositAmount.toString(),
          txHash: event.transactionHash,
          timestamp: Date.now()
        }
        this.io.emit('blockchain:balance-updated', eventData)
        
        const balanceData = {
          walletAddress: walletAddress.toLowerCase(),
          gameBalance: apiResult.data.balanceAfter.toString(),
          timestamp: Date.now()
        }
        this.io.emit('game:balance-updated', balanceData)
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
    if (!apiKey) {
      // console.warn('⚠️  INTERNAL_API_KEY not configured');
      // return null; // Uncomment kalau mau strict
    }

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const endpoint = `${apiUrl}/api/deposit/process`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // console.log(`📡 Calling API (attempt ${attempt}/${maxRetries}): ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': apiKey || '',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
           // Ignore error text parsing for now to prevent crash
           throw new Error(`API error ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          return result;
        }

        throw new Error(result.error || 'API returned success=false');

      } catch (error) {
        // console.error(`❌ API call failed (attempt ${attempt}/${maxRetries})`);
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
            username: `User-${walletAddress.slice(0,6)}` // Tambahkan default username biar ga error
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
            amount: depositAmount, // Pastikan tipe data schema Prisma Float/Decimal
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
   * Wait for block confirmations before processing
   */
  private async waitForConfirmations(eventBlockNumber: number): Promise<void> {
   const requiredConfirmations = NETWORK_CONFIG.BLOCK_CONFIRMATION || 1; // Default 1 biar cepat

   while (true) {
     if (!this.provider) throw new Error('Provider not initialized');
     
     const currentBlock = await this.provider.getBlockNumber();
     const confirmations = currentBlock - eventBlockNumber;

     if (confirmations >= requiredConfirmations) {
       break;
     }

     console.log(`⏳ Confirmations: ${confirmations}/${requiredConfirmations}`);
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

  /**
   * Get listener status
   */
  getStatus(): { isListening: boolean; processedCount: number } {
    return {
      isListening: this.isListening,
      processedCount: this.processedTxHashes.size,
    };
  }
}
