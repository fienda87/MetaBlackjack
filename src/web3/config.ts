import { createConfig, http } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'
import { createPublicClient } from 'viem'
import { logger } from '@/lib/logger'

// Polygon Amoy testnet configuration
export const POLYGON_AMOY = {
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
}

// Wagmi configuration
export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'MetaBlackjack',
        url: 'https://metablackjack.com',
      },
    }),
  ],
  transports: {
    [polygonAmoy.id]: http(),
  },
})

// Contract addresses - hardcoded for reliability in client components
export const CONTRACTS = {
  GBC_TOKEN: '0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a' as `0x${string}`,
  DEPOSIT_ESCROW: '0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22' as `0x${string}`,
  FAUCET: '0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7' as `0x${string}`,
  WITHDRAW: '0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3' as `0x${string}`,
}

// GBC Token ABI (Viem v2 format - object array)
export const GBC_TOKEN_ABI = [
  // ERC20 Standard
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// Helper function to add Polygon Amoy to MetaMask
export const addPolygonAmoyToMetaMask = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${POLYGON_AMOY.chainId.toString(16)}`,
            chainName: POLYGON_AMOY.chainName,
            nativeCurrency: POLYGON_AMOY.nativeCurrency,
            rpcUrls: POLYGON_AMOY.rpcUrls,
            blockExplorerUrls: POLYGON_AMOY.blockExplorerUrls,
          },
        ],
      })
      return true
    } catch (error) {
      logger.error('Failed to add Polygon Amoy to MetaMask', error)
      return false
    }
  }
  return false
}

// Helper function to switch to Polygon Amoy
export const switchToPolygonAmoy = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${POLYGON_AMOY.chainId.toString(16)}` }],
      })
      return true
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        return await addPolygonAmoyToMetaMask()
      }
      logger.error('Failed to switch to Polygon Amoy', error)
      return false
    }
  }
  return false
}

// Type declarations
declare global {
  interface Window {
    ethereum?: any
  }
}
