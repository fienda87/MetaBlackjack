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
import { RootState, AppDispatch } from '@/application/store'
import { getGameHistory } from '@/application/store/gameSlice'

export default function Home() {
  const [currentView, setCurrentView] = useState('game')
  const dispatch = useDispatch<AppDispatch>()
  const { isConnected, user } = useSelector((state: RootState) => state.wallet)

  // Load game history when user connects
  useEffect(() => {
    if (isConnected && user) {
      dispatch(getGameHistory(user.id))
    }
  }, [isConnected, user, dispatch])

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
    // Show wallet connection if not connected
    if (!isConnected) {
      return <WalletConnection />
    }

    switch (currentView) {
      case 'game':
        return <GameTable />
      case 'wallet':
        return <SuspenseWallet onNavigateToStore={handleNavigateToStore} />
      case 'store':
        return <SuspenseStoreView onNavigateToGame={handleNavigateToGame} />
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