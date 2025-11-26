/**
 * BullMQ Job Queue Module
 * Handles asynchronous job processing for blockchain sync, transactions, and stat recomputation
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisClient, isRedisConnected } from './redis';
import { db } from './db';

// Job type definitions
export type JobType = 
  | 'blockchain:deposit'
  | 'blockchain:withdraw'
  | 'blockchain:faucet'
  | 'stats:recompute'
  | 'transaction:create'
  | 'audit:log';

export interface BlockchainDepositJob {
  player: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface BlockchainWithdrawJob {
  player: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface BlockchainFaucetJob {
  recipient: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface StatsRecomputeJob {
  userId: string;
  trigger?: 'game:ended' | 'nightly' | 'manual';
}

export interface TransactionCreateJob {
  userId: string;
  type: string;
  amount: number;
  description?: string;
  referenceId?: string;
  balanceBefore: number;
  balanceAfter: number;
  status?: string;
  metadata?: any;
}

export interface AuditLogJob {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Queue instances
let jobQueue: Queue | null = null;
let jobWorker: Worker | null = null;
let queueEvents: QueueEvents | null = null;

// Worker state
let isWorkerActive = false;

/**
 * Initialize the job queue
 */
export async function initQueue(): Promise<Queue | null> {
  // Only initialize if Redis is available
  if (!isRedisConnected()) {
    console.log('[Queue] Redis not available, skipping queue initialization');
    return null;
  }

  if (jobQueue) {
    return jobQueue;
  }

  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return null;
    }

    // Create BullMQ connection from ioredis client
    const connection = {
      host: redisClient.options.host,
      port: redisClient.options.port,
      password: redisClient.options.password,
      db: redisClient.options.db
    };

    // Initialize queue
    jobQueue = new Queue('game-jobs', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 3600, // Remove after 1 hour
        },
        removeOnFail: {
          count: 1000, // Keep last 1000 failed jobs for debugging
        },
      },
    });

    // Initialize queue events for monitoring
    queueEvents = new QueueEvents('game-jobs', { connection });

    queueEvents.on('completed', ({ jobId }) => {
      console.log(`[Queue] Job ${jobId} completed`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`[Queue] Job ${jobId} failed:`, failedReason);
    });

    console.log('✅ [Queue] Initialized successfully');
    return jobQueue;

  } catch (error) {
    console.error('[Queue] Initialization failed:', error);
    return null;
  }
}

/**
 * Initialize the job worker
 */
export async function initWorker(): Promise<Worker | null> {
  if (!isRedisConnected()) {
    console.log('[Worker] Redis not available, skipping worker initialization');
    return null;
  }

  if (jobWorker) {
    return jobWorker;
  }

  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return null;
    }

    const connection = {
      host: redisClient.options.host,
      port: redisClient.options.port,
      password: redisClient.options.password,
      db: redisClient.options.db
    };

    // Initialize worker with job processors
    jobWorker = new Worker('game-jobs', async (job) => {
      const startTime = Date.now();
      console.log(`[Worker] Processing job ${job.id} (${job.name})`);

      try {
        await processJob(job.name as JobType, job.data);
        const duration = Date.now() - startTime;
        console.log(`[Worker] Job ${job.id} completed in ${duration}ms`);
        return { success: true, duration };
      } catch (error) {
        console.error(`[Worker] Job ${job.id} failed:`, error);
        throw error; // Let BullMQ handle retries
      }
    }, {
      connection,
      concurrency: 10, // Process up to 10 jobs concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 1000, // per second
      },
    });

    jobWorker.on('completed', (job) => {
      console.log(`[Worker] Completed job ${job.id}`);
    });

    jobWorker.on('failed', (job, err) => {
      console.error(`[Worker] Failed job ${job?.id}:`, err);
    });

    isWorkerActive = true;
    console.log('✅ [Worker] Initialized successfully');
    return jobWorker;

  } catch (error) {
    console.error('[Worker] Initialization failed:', error);
    return null;
  }
}

/**
 * Process individual jobs based on type
 */
async function processJob(jobType: JobType, data: any): Promise<void> {
  switch (jobType) {
    case 'blockchain:deposit':
      await processBlockchainDeposit(data);
      break;
    case 'blockchain:withdraw':
      await processBlockchainWithdraw(data);
      break;
    case 'blockchain:faucet':
      await processBlockchainFaucet(data);
      break;
    case 'stats:recompute':
      await processStatsRecompute(data);
      break;
    case 'transaction:create':
      await processTransactionCreate(data);
      break;
    case 'audit:log':
      await processAuditLog(data);
      break;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

/**
 * Process blockchain deposit job
 */
async function processBlockchainDeposit(data: BlockchainDepositJob): Promise<void> {
  const { player, amount, txHash, blockNumber, timestamp } = data;

  // Find user by wallet address
  const user = await db.user.findUnique({
    where: { walletAddress: player.toLowerCase() },
    select: { id: true, balance: true, totalDeposited: true }
  });

  if (!user) {
    throw new Error(`User not found for wallet: ${player}`);
  }

  const amountGBC = parseFloat(amount);
  const newBalance = user.balance + amountGBC;

  // Update user balance and total deposited
  await db.user.update({
    where: { id: user.id },
    data: {
      balance: newBalance,
      totalDeposited: user.totalDeposited + amountGBC
    }
  });

  // Create transaction record
  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'DEPOSIT',
      amount: amountGBC,
      description: `Deposit from blockchain (Block ${blockNumber})`,
      referenceId: txHash,
      balanceBefore: user.balance,
      balanceAfter: newBalance,
      status: 'COMPLETED',
      metadata: {
        blockNumber,
        timestamp,
        txHash
      }
    }
  });

  console.log(`[Worker] Processed deposit: ${amountGBC} GBC for user ${user.id}`);
}

/**
 * Process blockchain withdraw job
 */
async function processBlockchainWithdraw(data: BlockchainWithdrawJob): Promise<void> {
  const { player, amount, txHash, blockNumber, timestamp } = data;

  // Find user by wallet address
  const user = await db.user.findUnique({
    where: { walletAddress: player.toLowerCase() },
    select: { id: true, balance: true, totalWithdrawn: true }
  });

  if (!user) {
    throw new Error(`User not found for wallet: ${player}`);
  }

  const amountGBC = parseFloat(amount);

  // Update total withdrawn (balance already deducted when withdrawal was initiated)
  await db.user.update({
    where: { id: user.id },
    data: {
      totalWithdrawn: user.totalWithdrawn + amountGBC
    }
  });

  // Update transaction status
  await db.transaction.updateMany({
    where: {
      userId: user.id,
      referenceId: txHash,
      type: 'WITHDRAWAL',
      status: 'PENDING'
    },
    data: {
      status: 'COMPLETED',
      metadata: {
        blockNumber,
        timestamp,
        txHash,
        confirmedAt: new Date()
      }
    }
  });

  console.log(`[Worker] Processed withdrawal: ${amountGBC} GBC for user ${user.id}`);
}

/**
 * Process blockchain faucet job
 */
async function processBlockchainFaucet(data: BlockchainFaucetJob): Promise<void> {
  const { recipient, amount, txHash, blockNumber, timestamp } = data;

  // Find user by wallet address
  const user = await db.user.findUnique({
    where: { walletAddress: recipient.toLowerCase() },
    select: { id: true, balance: true }
  });

  if (!user) {
    console.warn(`[Worker] User not found for faucet claim: ${recipient}`);
    return; // Don't fail the job, just log warning
  }

  const amountGBC = parseFloat(amount);
  const newBalance = user.balance + amountGBC;

  // Update user balance
  await db.user.update({
    where: { id: user.id },
    data: { balance: newBalance }
  });

  // Create transaction record
  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'DAILY_BONUS',
      amount: amountGBC,
      description: `Faucet claim (Block ${blockNumber})`,
      referenceId: txHash,
      balanceBefore: user.balance,
      balanceAfter: newBalance,
      status: 'COMPLETED',
      metadata: {
        blockNumber,
        timestamp,
        txHash,
        source: 'faucet'
      }
    }
  });

  console.log(`[Worker] Processed faucet claim: ${amountGBC} GBC for user ${user.id}`);
}

/**
 * Process stats recomputation job
 */
async function processStatsRecompute(data: StatsRecomputeJob): Promise<void> {
  const { userId, trigger } = data;

  // Aggregate game stats for user
  const [gamesAggregate, sessionsAggregate] = await Promise.all([
    db.game.aggregate({
      where: { playerId: userId, state: 'ENDED' },
      _count: { id: true },
      _sum: {
        betAmount: true,
        winAmount: true,
        netProfit: true
      }
    }),
    db.gameSession.aggregate({
      where: { playerId: userId },
      _sum: {
        totalGames: true,
        totalBet: true,
        totalWin: true,
        netProfit: true
      }
    })
  ]);

  // Count result types
  const [wins, losses, pushes, blackjacks] = await Promise.all([
    db.game.count({ where: { playerId: userId, result: { in: ['WIN', 'BLACKJACK'] } } }),
    db.game.count({ where: { playerId: userId, result: 'LOSE' } }),
    db.game.count({ where: { playerId: userId, result: 'PUSH' } }),
    db.game.count({ where: { playerId: userId, result: 'BLACKJACK' } })
  ]);

  const totalHands = gamesAggregate._count.id || 0;
  const totalBet = gamesAggregate._sum.betAmount || 0;
  const totalWin = gamesAggregate._sum.winAmount || 0;
  const netProfit = gamesAggregate._sum.netProfit || 0;
  const winRate = totalHands > 0 ? (wins / totalHands) * 100 : 0;

  // Store precomputed stats in SystemConfig
  const statsKey = `user_stats:${userId}`;
  const stats = {
    totalHands,
    totalBet,
    totalWin,
    netProfit,
    winRate,
    wins,
    losses,
    pushes,
    blackjacks,
    lastUpdated: new Date().toISOString(),
    trigger: trigger || 'manual'
  };

  await db.systemConfig.upsert({
    where: { key: statsKey },
    create: {
      key: statsKey,
      value: stats,
      description: `Precomputed stats for user ${userId}`
    },
    update: {
      value: stats,
      updatedAt: new Date()
    }
  });

  console.log(`[Worker] Recomputed stats for user ${userId}: ${totalHands} hands, ${winRate.toFixed(2)}% win rate`);
}

/**
 * Process transaction creation job
 */
async function processTransactionCreate(data: TransactionCreateJob): Promise<void> {
  await db.transaction.create({
    data: {
      userId: data.userId,
      type: data.type as any,
      amount: data.amount,
      description: data.description,
      referenceId: data.referenceId,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      status: (data.status as any) || 'COMPLETED',
      metadata: data.metadata
    }
  });

  console.log(`[Worker] Created transaction: ${data.type} ${data.amount} GBC for user ${data.userId}`);
}

/**
 * Process audit log job
 */
async function processAuditLog(data: AuditLogJob): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    }
  });

  console.log(`[Worker] Created audit log: ${data.action} on ${data.resource}`);
}

/**
 * Add a job to the queue
 */
export async function enqueueJob<T>(
  jobType: JobType,
  data: T,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<boolean> {
  if (!jobQueue) {
    // Fallback: Process immediately if queue not available
    console.warn(`[Queue] Queue not available, processing ${jobType} immediately`);
    try {
      await processJob(jobType, data);
      return true;
    } catch (error) {
      console.error(`[Queue] Immediate processing failed for ${jobType}:`, error);
      return false;
    }
  }

  try {
    await jobQueue.add(jobType, data, {
      priority: options?.priority,
      delay: options?.delay,
    });
    return true;
  } catch (error) {
    console.error(`[Queue] Failed to enqueue ${jobType}:`, error);
    return false;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  if (!jobQueue) {
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      jobQueue.getWaitingCount(),
      jobQueue.getActiveCount(),
      jobQueue.getCompletedCount(),
      jobQueue.getFailedCount(),
      jobQueue.getDelayedCount(),
    ]);

    return {
      available: true,
      waiting,
      active,
      completed,
      failed,
      delayed
    };
  } catch (error) {
    console.error('[Queue] Failed to get stats:', error);
    return {
      available: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    };
  }
}

/**
 * Shutdown queue and worker gracefully
 */
export async function shutdownQueue(): Promise<void> {
  console.log('[Queue] Shutting down...');

  if (jobWorker) {
    await jobWorker.close();
    jobWorker = null;
    isWorkerActive = false;
  }

  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }

  if (jobQueue) {
    await jobQueue.close();
    jobQueue = null;
  }

  console.log('[Queue] Shutdown complete');
}

export { jobQueue, jobWorker, isWorkerActive };
