'use client'

import { useState, useEffect } from 'react'
import { 
  RetroWindow, 
  RetroButton, 
  RetroCard, 
  RetroPanel, 
  RetroTabs, 
  RetroAlert,
  RetroProgressBar,
  RetroDesktop
} from '@/components/ui/retro-components'
import { Wallet, TrendingUp, Clock, Star, Gift, Coins, Crown, Zap, Shield, AlertCircle, Loader2, Play } from 'lucide-react'
import { useWeb3 } from '@/hooks/useWeb3'
import { NFTMinting } from '@/components/NFTMinting'
import { NFTCard } from '@/components/NFTCard'
import { OnboardingTutorial, useOnboardingTutorial } from '@/components/OnboardingTutorial'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { NFT_ARTWORK, getRandomNFTArtwork } from '@/lib/nft-artwork'
import { sanitizeInput, isValidEthereumAddress } from '@/lib/security'
import { ErrorSeverity } from '@/lib/error-handling'

export default function NFTStakingGame() {
  const [selectedNFTs, setSelectedNFTs] = useState<bigint[]>([])
  const [stakingPeriod, setStakingPeriod] = useState(24) // hours (default 1 day)
  const [errors, setErrors] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('gallery')
  
  const {
    isOpen: isTutorialOpen,
    isCompleted: isTutorialCompleted,
    startTutorial,
    closeTutorial,
    completeTutorial
  } = useOnboardingTutorial()
  
  const {
    isConnected,
    address,
    balance,
    isCorrectNetwork,
    isLoading,
    error,
    nfts,
    stakingInfo,
    connectWallet,
    disconnectWallet,
    stakeNFTs,
    unstakeNFT,
    claimRewards,
    clearError
  } = useWeb3()

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'normal': return 'bg-gray-500'
      case 'rare': return 'bg-blue-500'
      case 'epic': return 'bg-purple-500'
      case 'legendary': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'normal': return <Shield className="w-4 h-4" />
      case 'rare': return <Star className="w-4 h-4" />
      case 'epic': return <Zap className="w-4 h-4" />
      case 'legendary': return <Crown className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  const handleConnectWallet = async () => {
    try {
      await connectWallet()
      
      if (!isTutorialCompleted) {
        setTimeout(() => {
          startTutorial()
        }, 2000)
      }
    } catch (err: any) {
      const newError = {
        id: `error_${Date.now()}`,
        message: sanitizeInput(err.message || 'Failed to connect wallet'),
        timestamp: Date.now(),
        type: 'wallet_error'
      }
      setErrors(prev => [...prev, newError])
    }
  }

  const handleStakeNFTs = async () => {
    if (selectedNFTs.length === 0) return
    
    try {
      if (!isValidStakingDuration(stakingPeriod)) {
        throw new Error('Invalid staking duration')
      }
      
      await stakeNFTs(selectedNFTs, stakingPeriod)
      setSelectedNFTs([])
    } catch (err: any) {
      const newError = {
        id: `error_${Date.now()}`,
        message: sanitizeInput(err.message || 'Failed to stake NFTs'),
        timestamp: Date.now(),
        type: 'staking_error'
      }
      setErrors(prev => [...prev, newError])
    }
  }

  const handleUnstakeNFT = async (tokenId: bigint) => {
    try {
      await unstakeNFT(tokenId)
    } catch (err: any) {
      const newError = {
        id: `error_${Date.now()}`,
        message: sanitizeInput(err.message || 'Failed to unstake NFT'),
        timestamp: Date.now(),
        type: 'staking_error'
      }
      setErrors(prev => [...prev, newError])
    }
  }

  const handleClaimRewards = async () => {
    try {
      await claimRewards()
    } catch (err: any) {
      const newError = {
        id: `error_${Date.now()}`,
        message: sanitizeInput(err.message || 'Failed to claim rewards'),
        timestamp: Date.now(),
        type: 'claim_error'
      }
      setErrors(prev => [...prev, newError])
    }
  }

  const dismissError = (errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId))
  }

  const clearAllErrors = () => {
    setErrors([])
  }

  const isValidStakingDuration = (hours: number): boolean => {
    return Number.isInteger(hours) && hours >= 1 && hours <= 168 // 1 hour to 7 days (168 hours)
  }

  const formatStakingPeriod = (hours: number): string => {
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      if (remainingHours === 0) {
        return `${days} day${days > 1 ? 's' : ''}`
      } else {
        return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
      }
    }
  }

  const toggleNFTSelection = (tokenId: bigint) => {
    setSelectedNFTs(prev => 
      prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    )
  }

  return (
    <ErrorBoundary>
      <RetroDesktop>
        {/* Tutorial */}
        <OnboardingTutorial
          isOpen={isTutorialOpen}
          onClose={closeTutorial}
          onComplete={completeTutorial}
        />

        {/* Error Notifications */}
        <div className="fixed top-4 right-4 z-40 space-y-2 max-w-sm">
          {errors.slice(0, 3).map((error) => (
            <ErrorDisplay
              key={error.id}
              error={{
                id: error.id,
                type: error.type,
                severity: ErrorSeverity.MEDIUM,
                message: error.message,
                userMessage: error.message,
                timestamp: error.timestamp,
                retryable: true,
                retryCount: 0
              }}
              onDismiss={() => dismissError(error.id)}
              onRetry={() => {
                dismissError(error.id)
                clearError()
              }}
            />
          ))}
        </div>

        {/* Header Window */}
        <RetroWindow 
          title="GCWAN Staking Arena - Control Panel" 
          className="max-w-7xl mx-auto mb-4"
          icon="🪟"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 win98-accent-1 rounded flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">GCWAN Staking Arena</h1>
                <p className="text-xs">Stack your NFTs, Earn GCWAN tokens</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isTutorialCompleted && (
                <RetroButton onClick={startTutorial} className="text-xs">
                  <Play className="w-3 h-3 mr-1" />
                  Tutorial
                </RetroButton>
              )}
              
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="text-right text-xs">
                    <p className="text-xs">Wallet</p>
                    <p className="font-mono text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                    <p className="text-xs font-bold">{parseFloat(balance?.formatted || '0').toFixed(2)} MATIC</p>
                  </div>
                  <RetroButton onClick={disconnectWallet} className="text-xs">
                    Disconnect
                  </RetroButton>
                </div>
              ) : (
                <RetroButton onClick={handleConnectWallet} disabled={isLoading} className="text-xs" data-testid="connect-wallet">
                  {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wallet className="w-3 h-3 mr-1" />}
                  Connect MetaMask
                </RetroButton>
              )}
            </div>
          </div>
        </RetroWindow>

        {/* Error Alert */}
        {error && (
          <div className="max-w-7xl mx-auto mb-4">
            <RetroAlert type="error" message={error} />
          </div>
        )}

        {/* Network Warning */}
        {isConnected && !isCorrectNetwork && (
          <div className="max-w-7xl mx-auto mb-4">
            <RetroAlert type="warning" message="Please switch to Polygon Amoy Testnet to use the application." />
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="max-w-7xl mx-auto mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <RetroCard title="Total Staked" accent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{stakingInfo.totalStaked}</p>
                  <p className="text-xs">NFTs Staked</p>
                </div>
                <div className="w-8 h-8 win98-accent-3 rounded flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
            </RetroCard>

            <RetroCard title="Total Earnings" accent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{stakingInfo.totalRewards.toFixed(2)}</p>
                  <p className="text-xs">GCWAN Tokens</p>
                </div>
                <div className="w-8 h-8 win98-accent-2 rounded flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
            </RetroCard>

            <RetroCard title="APY Rate" accent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">5%</p>
                  <p className="text-xs">Annual Rate</p>
                </div>
                <div className="w-8 h-8 win98-accent-4 rounded flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </RetroCard>

            <RetroCard title="Next Reward" accent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{stakingInfo.nextReward}/day</p>
                  <p className="text-xs">Daily Reward</p>
                </div>
                <div className="w-8 h-8 win98-accent-1 rounded flex items-center justify-center">
                  <Gift className="w-4 h-4 text-white" />
                </div>
              </div>
            </RetroCard>
          </div>
        </div>

        {/* Main Game Interface */}
        <div className="max-w-7xl mx-auto" data-testid="dashboard">
          <RetroWindow title="Main Application" icon="📁">
            <RetroTabs
              tabs={[
                { id: 'gallery', label: 'NFT Gallery', content: null },
                { id: 'minting', label: 'Mint NFTs', content: null },
                { id: 'staking', label: 'Staking Arena', content: null },
                { id: 'marketplace', label: 'Marketplace', content: null }
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="mt-4">
              {activeTab === 'gallery' && (
                !isConnected ? (
                  <RetroPanel title="Wallet Connection Required">
                    <div className="text-center py-8">
                      <Wallet className="w-16 h-16 mx-auto mb-4" />
                      <h3 className="text-lg font-bold mb-2">Connect Your Wallet</h3>
                      <p className="text-sm mb-4">Connect your MetaMask wallet to view your NFT collection</p>
                      <RetroButton onClick={connectWallet} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                        Connect MetaMask
                      </RetroButton>
                    </div>
                  </RetroPanel>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="nft-gallery">
                    {nfts.map((nft) => {
                      const artwork = NFT_ARTWORK.find(a => a.rarity === nft.rarity) || getRandomNFTArtwork(nft.rarity)
                      
                      return (
                        <NFTCard
                          key={nft.tokenId.toString()}
                          artwork={artwork}
                          tokenId={nft.tokenId}
                          staked={nft.staked}
                          selected={selectedNFTs.includes(nft.tokenId)}
                          onSelect={() => !nft.staked && toggleNFTSelection(nft.tokenId)}
                          onUnstake={() => handleUnstakeNFT(nft.tokenId)}
                          loading={isLoading}
                        />
                      )
                    })}
                    {nfts.length === 0 && !isLoading && (
                      <div className="col-span-full text-center py-8">
                        <Shield className="w-16 h-16 mx-auto mb-4" />
                        <p>No NFTs found in your wallet</p>
                        <p className="text-xs mt-2">
                          Deploy the contracts to get your starter NFTs!
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeTab === 'minting' && (
                <NFTMinting />
              )}

              {activeTab === 'staking' && (
                !isConnected ? (
                  <RetroPanel title="Wallet Connection Required">
                    <div className="text-center py-8">
                      <Shield className="w-16 h-16 mx-auto mb-4" />
                      <h3 className="text-lg font-bold mb-2">Connect Your Wallet</h3>
                      <p className="text-sm mb-4">Connect your MetaMask wallet to access the staking arena</p>
                      <RetroButton onClick={connectWallet} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                        Connect MetaMask
                      </RetroButton>
                    </div>
                  </RetroPanel>
                ) : (
                  <div className="space-y-4" data-testid="staking-arena">
                    <RetroPanel title="Staking Controls">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold mb-2">Selected NFTs: {selectedNFTs.length}</label>
                          <RetroProgressBar value={(selectedNFTs.length / 10) * 100} max={100} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2">Staking Period: {formatStakingPeriod(stakingPeriod)}</label>
                          <input
                            type="range"
                            min="1"
                            max="168"
                            value={stakingPeriod}
                            onChange={(e) => setStakingPeriod(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <RetroButton 
                          onClick={handleStakeNFTs} 
                          disabled={selectedNFTs.length === 0 || isLoading}
                          className="win98-accent-1"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                          Stake Selected NFTs
                        </RetroButton>
                        <RetroButton 
                          onClick={handleClaimRewards} 
                          disabled={isLoading || stakingInfo.totalRewards === 0}
                          className="win98-accent-2"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          Claim Rewards
                        </RetroButton>
                      </div>
                    </RetroPanel>

                    <RetroPanel title="Staked NFTs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nfts.filter(nft => nft.staked).map((nft) => {
                          const artwork = NFT_ARTWORK.find(a => a.rarity === nft.rarity) || getRandomNFTArtwork(nft.rarity)
                          
                          return (
                            <NFTCard
                              key={nft.tokenId.toString()}
                              artwork={artwork}
                              tokenId={nft.tokenId}
                              staked={nft.staked}
                              selected={false}
                              onSelect={() => {}}
                              onUnstake={() => handleUnstakeNFT(nft.tokenId)}
                              loading={isLoading}
                            />
                          )
                        })}
                        {nfts.filter(nft => nft.staked).length === 0 && (
                          <div className="col-span-full text-center py-8">
                            <Shield className="w-16 h-16 mx-auto mb-4" />
                            <p>No staked NFTs found</p>
                            <p className="text-xs mt-2">
                              Stake your NFTs to start earning rewards!
                            </p>
                          </div>
                        )}
                      </div>
                    </RetroPanel>
                  </div>
                )
              )}

              {activeTab === 'marketplace' && (
                <RetroPanel title="Marketplace">
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🏪</div>
                    <h3 className="text-lg font-bold mb-2">Marketplace</h3>
                    <p className="text-sm mb-4">Trade your NFTs with other players</p>
                    <RetroAlert type="info" message="Marketplace features coming soon!" />
                  </div>
                </RetroPanel>
              )}
            </div>
          </RetroWindow>
        </div>
      </RetroDesktop>
    </ErrorBoundary>
  )
}