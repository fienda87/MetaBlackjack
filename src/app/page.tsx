'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Navigation from '@/components/Navigation'
import GameTable from '@/components/GameTable'
import WalletConnection from '@/components/WalletConnection'
import PullToRefresh from '@/components/PullToRefresh'
import AudioControls from '@/components/AudioControls'
import { 
  SuspenseGameHistory, 
  SuspenseRulesGuide, 
  SuspenseSettings, 
  SuspenseStoreView, 
  SuspenseWallet 
} from '@/components/LazyComponents'
import { useWallet } from '@/web3/useWallet'
import { fetchUserByWallet } from '@/application/providers/store/walletSlice'
import { AppDispatch, RootState } from '@/application/providers/store'

export default function Home() {
  const [currentView, setCurrentView] = useState('game')
  const dispatch = useDispatch<AppDispatch>()
  const { isConnected, address } = useWallet()
  const { user } = useSelector((state: RootState) => state.wallet)

  // Sync Redux user with Web3 wallet (fallback if WalletConnection skipped)
  useEffect(() => {
    if (isConnected && address && !user) {
      console.log('🔄 [Page] Syncing Redux user with wallet:', address)
      dispatch(fetchUserByWallet(address))
    }
  }, [isConnected, address, user, dispatch])

  // 🚀 OPTIMIZATION: Don't load game history on mount - load only when user opens history tab
  // This reduces initial page load from 120s to <1s
  // useEffect(() => {
  //   if (isConnected && user) {
  //     dispatch(getGameHistory(user.id))
  //   }
  // }, [isConnected, user, dispatch])

  const handleNavigateToStore = () => {
    setCurrentView('store')
  }

  const handleNavigateToGame = () => {
    setCurrentView('game')
  }

  const handleRefresh = async () => {
    // Refresh logic based on current view
    window.location.reload()
  }

  const renderCurrentView = () => {
    // Show wallet connection if not connected (using wagmi state)
    if (!isConnected || !address) {
      return <WalletConnection />
    }

    switch (currentView) {
      case 'game':
        return <GameTable />
      case 'wallet':
        return <SuspenseWallet onNavigateToStore={handleNavigateToStore} />
      case 'store':
        return <SuspenseStoreView />
      case 'history':
        return <SuspenseGameHistory />
      case 'rules':
        return <SuspenseRulesGuide />
      case 'settings':
        return <SuspenseSettings />
      default:
        return <GameTable />
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <PullToRefresh 
          onRefresh={handleRefresh}
          disabled={currentView === 'game'} // Disable in game view
        >
          {renderCurrentView()}
        </PullToRefresh>
      </main>
      
      {/* Audio Controls - Always visible */}
      {isConnected && <AudioControls />}
    </div>
  )
}