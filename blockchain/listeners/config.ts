import { ethers } from 'ethers';
import { webSocketManager } from '../providers/webSocketManager.js';

/**
 * ABIs for blockchain event listening
 * Minimal ABIs containing only the events we need to listen to
 */

export const DEPOSIT_ESCROW_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "availableRewards",
        "type": "uint256"
      }
    ],
    "name": "Deposit",
    "type": "event"
  }
] as const;

export const GAME_WITHDRAW_ABI = [
  'event Withdraw(address indexed player, uint256 amount, uint256 finalBalance, uint256 nonce, uint256 timestamp)',
] as const;

export const GBC_FAUCET_ABI = [
  'event Claim(address indexed claimer, uint256 amount, uint256 timestamp)',
] as const;

/**
 * Contract addresses from deployment
 */
export const CONTRACT_ADDRESSES = {
  DEPOSIT_ESCROW: '0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22',
  GAME_WITHDRAW: '0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3',
  GBC_FAUCET: '0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7',
  GBC_TOKEN: '0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a',
} as const;

/**
 * Network configuration
 */
export const NETWORK_CONFIG = {
  // Use HTTPS for read-only operations
  RPC_URL: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
  // Use WSS for event listening (more stable than HTTP polling)
  // Leave empty to auto-use public fallback URLs (PublicNode → DRPC → HTTP)
  WSS_RPC_URL: process.env.POLYGON_AMOY_WSS_URL || '',
  CHAIN_ID: 80002,
  NETWORK_NAME: 'Polygon Amoy Testnet',
  BLOCK_CONFIRMATION: 3, // Wait 3 blocks before considering transaction final
  POLLING_INTERVAL: 5000, // Poll every 5 seconds
} as const;

/**
 * Create provider instance (HTTP polling - for read operations)
 */
export function createProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.RPC_URL, {
    chainId: NETWORK_CONFIG.CHAIN_ID,
    name: NETWORK_CONFIG.NETWORK_NAME,
  });
}

/**
 * Get WebSocket provider for event listening (with graceful reconnection)
 * Uses webSocketManager for robust multi-URL fallback + auto-reconnect
 */
export function getWebSocketProvider(): ethers.WebSocketProvider | ethers.JsonRpcProvider | null {
  return webSocketManager.getProvider();
}

/**
 * Initialize WebSocket connection
 * Call this once at app startup
 */
export async function initializeWebSocketProvider(): Promise<ethers.WebSocketProvider | ethers.JsonRpcProvider> {
  return webSocketManager.connect();
}

/**
 * Cleanup WebSocket connection
 * Call this on app shutdown
 */
export function cleanupWebSocketProvider(): void {
  webSocketManager.disconnect();
}

/**
 * Format Wei to GBC (18 decimals)
 */
export function formatGBC(weiAmount: bigint): number {
  return parseFloat(ethers.formatEther(weiAmount));
}

/**
 * Validate wallet address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Normalize address to lowercase for DB consistency
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}
