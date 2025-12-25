import { DepositListener } from './depositListener.js';
import { WithdrawListener } from './withdrawListener.js';
import { FaucetListener } from './faucetListener.js';
import { NETWORK_CONFIG, cleanupWebSocketProvider } from './config.js';

/**
 * Blockchain Event Listener Service
 * Orchestrates all blockchain event listeners (deposit, withdraw, faucet)
 */
export class BlockchainListenerService {
  private depositListener: DepositListener;
  private withdrawListener: WithdrawListener;
  private faucetListener: FaucetListener;
  private isRunning: boolean = false;

  constructor(io?: any) {
    console.log('\n🚀 Initializing Blockchain Listener Service...');
    console.log('═'.repeat(60));
    
    this.depositListener = new DepositListener(io);
    this.withdrawListener = new WithdrawListener(io);
    this.faucetListener = new FaucetListener(io);
    
    console.log('═'.repeat(60));
    console.log('✅ All listeners initialized\n');
  }

  /**
   * Start all blockchain event listeners
   */
  async startAll(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️  Blockchain listeners already running');
      return;
    }

    console.log('\n🎯 Starting Blockchain Event Listeners...');
    console.log('─'.repeat(60));

    try {
      // Start all listeners in parallel
      await Promise.all([
        this.depositListener.start(),
        this.withdrawListener.start(),
        this.faucetListener.start(),
      ]);

      this.isRunning = true;
      
      console.log('─'.repeat(60));
      console.log('✅ All blockchain listeners started successfully!');
      console.log(`🌐 Network: ${NETWORK_CONFIG.NETWORK_NAME}`);
      console.log(`🔗 RPC: ${NETWORK_CONFIG.RPC_URL}`);
      console.log(`⏱️  Polling interval: ${NETWORK_CONFIG.POLLING_INTERVAL}ms`);
      console.log(`✓ Block confirmations: ${NETWORK_CONFIG.BLOCK_CONFIRMATION}`);
      console.log('─'.repeat(60));
      console.log('👂 Listening for events:\n');
      console.log('  🟢 Deposit   → DepositEscrow contract');
      console.log('  🔴 Withdraw  → GameWithdraw contract');
      console.log('  🎁 Claim     → GBCFaucet contract\n');

    } catch (error) {
      console.error('❌ Failed to start blockchain listeners:', error);
      throw error;
    }
  }

  /**
   * Stop all blockchain event listeners
   */
  async stopAll(): Promise<void> {
    if (!this.isRunning) {
      console.warn('⚠️  Blockchain listeners not running');
      return;
    }

    console.log('\n🛑 Stopping Blockchain Event Listeners...');

    await Promise.all([
      this.depositListener.stop(),
      this.withdrawListener.stop(),
      this.faucetListener.stop(),
    ]);

    this.isRunning = false;
    console.log('✅ All blockchain listeners stopped');
  }

  /**
   * Get status of all listeners
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      listeners: {
        deposit: this.depositListener.getStatus(),
        withdraw: this.withdrawListener.getStatus(),
        faucet: this.faucetListener.getStatus(),
      },
      network: {
        name: NETWORK_CONFIG.NETWORK_NAME,
        chainId: NETWORK_CONFIG.CHAIN_ID,
        rpcUrl: NETWORK_CONFIG.RPC_URL,
      },
    };
  }

  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n📡 Received ${signal} signal`);
    console.log('🧹 Cleaning up blockchain listeners...');
    
    await this.stopAll();
    cleanupWebSocketProvider();
    
    console.log('✅ Cleanup complete. Exiting...');
    process.exit(0);
  }

  /**
   * Setup process signal handlers
   */
  setupSignalHandlers(): void {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('unhandledRejection');
    });
  }
}

// Singleton instance
let listenerServiceInstance: BlockchainListenerService | null = null;

/**
 * Initialize and start blockchain listener service
 */
export async function initBlockchainListeners(io?: any): Promise<BlockchainListenerService> {
  if (listenerServiceInstance) {
    console.log('⚠️  Blockchain listener service already initialized');
    return listenerServiceInstance;
  }

  listenerServiceInstance = new BlockchainListenerService(io);
  listenerServiceInstance.setupSignalHandlers();
  await listenerServiceInstance.startAll();

  return listenerServiceInstance;
}

/**
 * Get current listener service instance
 */
export function getListenerService(): BlockchainListenerService | null {
  return listenerServiceInstance;
}

/**
 * Stop blockchain listener service
 */
export async function stopBlockchainListeners(): Promise<void> {
  if (listenerServiceInstance) {
    await listenerServiceInstance.stopAll();
    listenerServiceInstance = null;
  }
}
