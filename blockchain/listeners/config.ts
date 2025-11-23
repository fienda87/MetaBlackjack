import { ethers } from 'ethers';

/**
 * ABIs for blockchain event listening
 * Minimal ABIs containing only the events we need to listen to
 */

export const DEPOSIT_ESCROW_ABI = [
  'event Deposit(address indexed player, uint256 amount, uint256 timestamp, uint256 totalBalance)',
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
  RPC_URL: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
  CHAIN_ID: 80002,
  NETWORK_NAME: 'Polygon Amoy Testnet',
  BLOCK_CONFIRMATION: 3, // Wait 3 blocks before considering transaction final
  POLLING_INTERVAL: 5000, // Poll every 5 seconds
} as const;

/**
 * Create provider instance
 */
export function createProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.RPC_URL, {
    chainId: NETWORK_CONFIG.CHAIN_ID,
    name: NETWORK_CONFIG.NETWORK_NAME,
  });
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
