'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { config, switchToPolygonAmoy, CONTRACTS } from '@/lib/web3'
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions'
import { formatEther, parseEther } from 'viem'

export interface NFTData {
  tokenId: bigint
  name: string
  rarity: 'normal' | 'rare' | 'epic' | 'legendary'
  image: string
  dailyReward: number
  specialAbility: string
  staked: boolean
  stakingTime?: bigint
  stakingDuration?: bigint
  rewards?: bigint
}

export interface StakingInfo {
  totalStaked: number
  totalRewards: number
  nextReward: number
}

export function useWeb3() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nfts, setNfts] = useState<NFTData[]>([])
  const [stakingInfo, setStakingInfo] = useState<StakingInfo>({
    totalStaked: 0,
    totalRewards: 0,
    nextReward: 0
  })

  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const chainId = useChainId()

  // Check if we're on the correct network
  const isCorrectNetwork = chainId === 80002 // Polygon Amoy

  // Connect wallet
  const connectWallet = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // First switch to Polygon Amoy
      const networkSwitched = await switchToPolygonAmoy()
      if (!networkSwitched) {
        throw new Error('Failed to switch to Polygon Amoy testnet')
      }

      // Then connect wallet
      connect({ connector: metaMask() })
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    disconnect()
    setNfts([])
    setStakingInfo({ totalStaked: 0, totalRewards: 0, nextReward: 0 })
  }

  // Get user's NFTs
  const getUserNFTs = async () => {
    if (!address || !isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      // Get user's NFT balance
      const balance = await readContract(config, {
        address: CONTRACTS.NFT_COLLECTION as `0x${string}`,
        abi: [
          'function balanceOf(address owner) view returns (uint256)',
          'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
          'function getTokenRarity(uint256 tokenId) view returns (uint8)',
          'function getTokenDailyReward(uint256 tokenId) view returns (uint256)',
          'function getTokenSpecialAbility(uint256 tokenId) view returns (string)',
          'function tokenURI(uint256 tokenId) view returns (string)',
        ],
        functionName: 'balanceOf',
        args: [address]
      })

      const userNFTs: NFTData[] = []

      // Get each NFT's details
      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await readContract(config, {
          address: CONTRACTS.NFT_COLLECTION as `0x${string}`,
          abi: [
            'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
            'function getTokenRarity(uint256 tokenId) view returns (uint8)',
            'function getTokenDailyReward(uint256 tokenId) view returns (uint256)',
            'function getTokenSpecialAbility(uint256 tokenId) view returns (string)',
            'function tokenURI(uint256 tokenId) view returns (string)',
          ],
          functionName: 'tokenOfOwnerByIndex',
          args: [address, BigInt(i)]
        })

        const rarity = await readContract(config, {
          address: CONTRACTS.NFT_COLLECTION as `0x${string}`,
          abi: [
            'function getTokenRarity(uint256 tokenId) view returns (uint8)',
            'function getTokenDailyReward(uint256 tokenId) view returns (uint256)',
            'function getTokenSpecialAbility(uint256 tokenId) view returns (string)',
            'function tokenURI(uint256 tokenId) view returns (string)',
          ],
          functionName: 'getTokenRarity',
          args: [tokenId]
        })

        const dailyReward = await readContract(config, {
          address: CONTRACTS.NFT_COLLECTION as `0x${string}`,
          abi: [
            'function getTokenRarity(uint256 tokenId) view returns (uint8)',
            'function getTokenDailyReward(uint256 tokenId) view returns (uint256)',
            'function getTokenSpecialAbility(uint256 tokenId) view returns (string)',
            'function tokenURI(uint256 tokenId) view returns (string)',
          ],
          functionName: 'getTokenDailyReward',
          args: [tokenId]
        })

        const specialAbility = await readContract(config, {
          address: CONTRACTS.NFT_COLLECTION as `0x${string}`,
          abi: [
            'function getTokenRarity(uint256 tokenId) view returns (uint8)',
            'function getTokenDailyReward(uint256 tokenId) view returns (uint256)',
            'function getTokenSpecialAbility(uint256 tokenId) view returns (string)',
            'function tokenURI(uint256 tokenId) view returns (string)',
          ],
          functionName: 'getTokenSpecialAbility',
          args: [tokenId]
        })

        const rarityMap = ['normal', 'rare', 'epic', 'legendary']
        
        userNFTs.push({
          tokenId: BigInt(tokenId as string | number | bigint),
          name: `NFT #${tokenId}`,
          rarity: rarityMap[Number(rarity)] as 'normal' | 'rare' | 'epic' | 'legendary',
          image: await readContract(config, {
            address: CONTRACTS.NFT_COLLECTION as `0x${string}`,
            abi: ['function tokenURI(uint256 tokenId) view returns (string)'],
            functionName: 'tokenURI',
            args: [tokenId]
          }) as string,
          dailyReward: Number(dailyReward),
          specialAbility: specialAbility as string,
          staked: false
        })
      }

      // Check which NFTs are staked
      const stakedTokens = await readContract(config, {
        address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
        abi: ['function getStakedNFTs(address owner) view returns (uint256[])'],
        functionName: 'getStakedNFTs',
        args: [address]
      })

      // Update staked status and get staking info
      for (const tokenId of (stakedTokens as bigint[])) {
        const stakingInfo = await readContract(config, {
          address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
          abi: ['function getStakingInfo(uint256 tokenId) view returns (uint256 stakingTime, uint256 duration, uint256 rewards, bool active)'],
          functionName: 'getStakingInfo',
          args: [tokenId]
        })

        const nftIndex = userNFTs.findIndex(nft => nft.tokenId === tokenId)
        if (nftIndex !== -1) {
          userNFTs[nftIndex].staked = true
          const info = stakingInfo as readonly [bigint, bigint, bigint, boolean]
          userNFTs[nftIndex].stakingTime = info[0]
          userNFTs[nftIndex].stakingDuration = info[1]
          userNFTs[nftIndex].rewards = info[2]
        }
      }

      setNfts(userNFTs)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch NFTs')
    } finally {
      setIsLoading(false)
    }
  }

  // Get staking information
  const getStakingInfo = async () => {
    if (!address || !isConnected) return

    try {
      const totalStaked = await readContract(config, {
        address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
        abi: [
          'function getTotalStaked(address owner) view returns (uint256)',
          'function getTotalRewards(address owner) view returns (uint256)',
          'function getStakingInfo(uint256 tokenId) view returns (uint256 stakingTime, uint256 duration, uint256 rewards, bool active)',
          'function getStakedNFTs(address owner) view returns (uint256[])'
        ],
        functionName: 'getTotalStaked',
        args: [address]
      })

      const totalRewards = await readContract(config, {
        address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
        abi: [
          'function getTotalStaked(address owner) view returns (uint256)',
          'function getTotalRewards(address owner) view returns (uint256)',
          'function getStakingInfo(uint256 tokenId) view returns (uint256 stakingTime, uint256 duration, uint256 rewards, bool active)',
          'function getStakedNFTs(address owner) view returns (uint256[])'
        ],
        functionName: 'getTotalRewards',
        args: [address]
      })

      // Calculate next reward (sum of daily rewards from staked NFTs)
      const stakedNFTs = nfts.filter(nft => nft.staked)
      const nextReward = stakedNFTs.reduce((sum, nft) => sum + nft.dailyReward, 0)

      setStakingInfo({
        totalStaked: Number(totalStaked as bigint),
        totalRewards: Number(formatEther(totalRewards as bigint)),
        nextReward
      })
    } catch (err: any) {
      console.error('Failed to get staking info:', err)
    }
  }

  // Stake NFTs
  const stakeNFTs = async (tokenIds: bigint[], duration: number) => {
    if (!address || !isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const hash = await writeContract(config, {
        address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
        abi: ['function stake(uint256[] tokenIds, uint256 duration)'],
        functionName: 'stake',
        args: [tokenIds, BigInt(duration * 24 * 60 * 60)] // Convert days to seconds
      })

      await waitForTransactionReceipt(config, { hash })
      
      // Refresh data
      await getUserNFTs()
      await getStakingInfo()
    } catch (err: any) {
      setError(err.message || 'Failed to stake NFTs')
    } finally {
      setIsLoading(false)
    }
  }

  // Unstake NFT
  const unstakeNFT = async (tokenId: bigint) => {
    if (!address || !isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const hash = await writeContract(config, {
        address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
        abi: ['function unstake(uint256 tokenId)'],
        functionName: 'unstake',
        args: [tokenId]
      })

      await waitForTransactionReceipt(config, { hash })
      
      // Refresh data
      await getUserNFTs()
      await getStakingInfo()
    } catch (err: any) {
      setError(err.message || 'Failed to unstake NFT')
    } finally {
      setIsLoading(false)
    }
  }

  // Claim rewards
  const claimRewards = async (tokenId?: bigint) => {
    if (!address || !isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      let hash: any

      if (tokenId) {
        // Claim specific NFT rewards
        hash = await writeContract(config, {
          address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
          abi: ['function claimRewards(uint256 tokenId)'],
          functionName: 'claimRewards',
          args: [tokenId]
        })
      } else {
        // Claim all rewards
        hash = await writeContract(config, {
          address: CONTRACTS.STAKING_CONTRACT as `0x${string}`,
          abi: ['function claimAllRewards()'],
          functionName: 'claimAllRewards'
        })
      }

      await waitForTransactionReceipt(config, { hash })
      
      // Refresh data
      await getUserNFTs()
      await getStakingInfo()
    } catch (err: any) {
      setError(err.message || 'Failed to claim rewards')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh data when connected
  useEffect(() => {
    if (isConnected && address) {
      getUserNFTs()
      getStakingInfo()
    }
  }, [isConnected, address])

  return {
    // Connection state
    isConnected,
    address,
    balance,
    isCorrectNetwork,
    isLoading,
    error,
    
    // Data
    nfts,
    stakingInfo,
    
    // Actions
    connectWallet,
    disconnectWallet,
    getUserNFTs,
    getStakingInfo,
    stakeNFTs,
    unstakeNFT,
    claimRewards,
    
    // Clear error
    clearError: () => setError(null)
  }
}