import { createConfig, http } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    metaMask(),
  ],
  transports: {
    [polygonAmoy.id]: http(),
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

// Contract addresses (updated after deployment)
export const CONTRACTS = {
  GCWAN_TOKEN: '0xca0195072Fc8cd7B8174BEFB01baFD827674b1eB',
  NFT_COLLECTION: '0xc86F8F320c3E7BD586A08bCe0922C61520296990',
  STAKING_CONTRACT: '0x346D28153335E64e179D69627297415f8212f3E9'
}

// ABI definitions
export const GCWAN_TOKEN_ABI = [
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
]

export const NFT_COLLECTION_ABI = [
  // ERC721 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function approve(address to, uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
  // Game-specific functions
  'function mint(address to, uint256 tokenId)',
  'function getTokenRarity(uint256 tokenId) view returns (uint8)',
  'function getTokenDailyReward(uint256 tokenId) view returns (uint256)',
  'function getTokenSpecialAbility(uint256 tokenId) view returns (string)',
]

export const STAKING_CONTRACT_ABI = [
  // Staking functions
  'function stake(uint256[] tokenIds, uint256 duration)',
  'function unstake(uint256 tokenId)',
  'function claimRewards(uint256 tokenId)',
  'function claimAllRewards()',
  'function getStakedNFTs(address owner) view returns (uint256[])',
  'function getStakingInfo(uint256 tokenId) view returns (uint256 stakingTime, uint256 duration, uint256 rewards, bool active)',
  'function calculateRewards(uint256 tokenId) view returns (uint256)',
  'function getTotalStaked(address owner) view returns (uint256)',
  'function getTotalRewards(address owner) view returns (uint256)',
  // Configuration
  'function APY() view returns (uint256)',
  'function MIN_STAKING_DURATION() view returns (uint256)',
  'function MAX_STAKING_DURATION() view returns (uint256)',
  // Events
  'event Staked(address indexed owner, uint256 tokenId, uint256 duration)',
  'event Unstaked(address indexed owner, uint256 tokenId)',
  'event RewardsClaimed(address indexed owner, uint256 tokenId, uint256 amount)',
]

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