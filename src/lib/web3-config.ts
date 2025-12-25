import { createConfig, http } from 'wagmi'
import { polygonAmoy, mainnet } from 'wagmi/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

// Wagmi configuration
export const web3Config = createConfig({
  chains: [polygonAmoy, mainnet],
  connectors: [
    metaMask(),
    // walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '' }),
  ],
  transports: {
    [polygonAmoy.id]: http(),
    [mainnet.id]: http(),
  },
})

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

// Contract addresses (updated after Phase 2 deployment)
export const CONTRACTS = {
  GBC_TOKEN: (process.env.NEXT_PUBLIC_GBC_TOKEN_ADDRESS || '0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a') as `0x${string}`,
  GBC_FAUCET: (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || '0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7') as `0x${string}`,
  DEPOSIT_ESCROW: (process.env.NEXT_PUBLIC_DEPOSIT_ADDRESS || '0x4c950023B40131944c7F0D116e86D046A7e7EE20') as `0x${string}`,
  GAME_WITHDRAW: (process.env.NEXT_PUBLIC_WITHDRAW_ADDRESS || '0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3') as `0x${string}`,
}

// GBC Token ABI (ERC20 Standard)
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
  // Minting function for game rewards
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const

// Faucet Contract ABI
export const FAUCET_ABI = [
  'function claim() external',
  'function canClaim(address user) external view returns (bool)',
  'function getNextClaimTime(address user) external view returns (uint256)',
  'function CLAIM_AMOUNT() external view returns (uint256)',
  'function gbcToken() external view returns (address)',
  'function hasClaimed(address) external view returns (bool)',
  'function lastClaimTime(address) external view returns (uint256)',
  'event Claim(address indexed user, uint256 amount)',
  'event ClaimReset(address indexed user)',
] as const

// Deposit Escrow Contract ABI
export const DEPOSIT_ESCROW_ABI = [
  'function deposit(uint256 amount) external',
  'function getBalance(address player) external view returns (uint256)',
  'function getTotalEscrow() external view returns (uint256)',
  'function isSolvent() external view returns (bool)',
  'function emergencyWithdraw() external',
  'function gbcToken() external view returns (address)',
  'event Deposit(address indexed player, uint256 amount, uint256 timestamp)',
  'event Withdrawal(address indexed player, uint256 amount, uint256 timestamp)',
] as const

// Withdraw Contract ABI
export const WITHDRAW_ABI = [
  'function withdraw(uint256 amount, uint256 finalBalance, uint256 nonce, bytes memory signature) external',
  'function verifySignature(address player, uint256 amount, uint256 finalBalance, uint256 nonce, bytes memory signature) external view returns (bool)',
  'function isNonceUsed(uint256 nonce) external view returns (bool)',
  'function getPlayerNonce(address player) external view returns (uint256)',
  'function getContractBalance() external view returns (uint256)',
  'function setBackendSigner(address _backendSigner) external',
  'function gbcToken() external view returns (address)',
  'function backendSigner() external view returns (address)',
  'event Withdraw(address indexed player, uint256 amount, uint256 timestamp)',
  'event BackendSignerChanged(address newSigner)',
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
