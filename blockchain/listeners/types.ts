/**
 * Shared types and interfaces for blockchain event listeners
 */

export interface BlockchainEvent {
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
  logIndex: number;
}

export interface DepositEvent extends BlockchainEvent {
  player: string;
  amount: bigint;
  timestamp: bigint;
  totalBalance: bigint;
}

export interface WithdrawEvent extends BlockchainEvent {
  player: string;
  amount: bigint;
  finalBalance: bigint;
  nonce: bigint;
  timestamp: bigint;
}

export interface FaucetClaimEvent extends BlockchainEvent {
  claimer: string;
  amount: bigint;
  timestamp: bigint;
}

export interface ListenerConfig {
  rpcUrl: string;
  contractAddress: string;
  abi: any[];
  eventName: string;
  startBlock?: number;
}

export interface ProcessedTransaction {
  txHash: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SIGNUP_BONUS';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'COMPLETED' | 'FAILED';
  blockNumber: number;
  timestamp: Date;
}
