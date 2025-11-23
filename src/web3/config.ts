import { createConfig, http } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'
import { createPublicClient } from 'viem'

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

// GBC Token ABI
export const GBC_TOKEN_ABI = [
  // ERC20 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Game-specific functions
  'function mintGameReward(address to, uint256 amount)',
  'function burnGameLoss(uint256 amount)',
  'function isGameMinter(address account) view returns (bool)',
  
  // Events
  'event GameReward(address indexed player, uint256 amount, string gameType)',
  'event GameBurn(address indexed player, uint256 amount, string gameType)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
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
      console.error('Failed to add Polygon Amoy to MetaMask:', error)
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
      console.error('Failed to switch to Polygon Amoy:', error)
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
