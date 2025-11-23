'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw,
  ExternalLink,
  Wallet as WalletIcon,
  Network,
  Info
} from 'lucide-react'
import { useGameBalance } from '@/hooks/useGameBalance'
import { useWallet } from '@/web3/useWallet'
import { switchToPolygonAmoy } from '@/web3/config'

interface WalletProps {
  onNavigateToStore: () => void
}

export default function Wallet({ onNavigateToStore }: WalletProps) {
  const {
    isConnected,
    address,
    walletBalance,
    onChainGBC,
    offChainGBC,
    isCorrectNetwork,
    syncBothBalances,
    isLoadingGameBalance,
  } = useGameBalance()
  
  const { disconnectWallet: disconnectWeb3Wallet } = useWallet()
  
  const [isSyncing, setIsSyncing] = useState(false)

  const handleDeposit = () => {
    // Navigate to store/blockchain page
    onNavigateToStore()
  }

  const handleWithdraw = () => {
    // Navigate to store/blockchain page for withdrawal
    onNavigateToStore()
  }

  const handleSyncBalance = async () => {
    setIsSyncing(true)
    try {
      await syncBothBalances() // Sync both on-chain and off-chain
    } catch (error) {
      console.error('Failed to sync balance:', error)
    } finally {
      setTimeout(() => setIsSyncing(false), 500)
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchToPolygonAmoy()
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      disconnectWeb3Wallet()
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  if (!isConnected || !address) {
    return (
      <Card className="bg-black border border-red-500/30 shadow-2xl">
        <CardContent className="p-6 text-center">
          <Alert className="bg-red-900/50 border-red-700 text-red-100">
            <AlertDescription>
              Wallet not connected. Please connect your wallet to view this page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Wrong Network Warning */}
      {!isCorrectNetwork && (
        <Alert className="bg-yellow-900/50 border-yellow-700 text-yellow-100">
          <Network className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Wrong network. Switch to Polygon Amoy to use wallet features.</span>
            <Button
              size="sm"
              onClick={handleSwitchNetwork}
              className="bg-yellow-500 hover:bg-yellow-400 text-black"
            >
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Wallet Address Card */}
      <Card className="bg-black border border-green-500/30 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-green-400 flex items-center justify-center gap-2">
            <WalletIcon className="w-5 h-5" />
            Connected Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-green-300 font-medium">Wallet Address</p>
            <div className="p-3 bg-black/50 rounded-lg text-sm font-mono text-green-400 border border-green-500/30 flex items-center justify-between">
              <span>{address.slice(0, 10)}...{address.slice(-8)}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`https://amoy.polygonscan.com/address/${address}`, '_blank')}
                className="text-green-400 hover:text-green-300 hover:bg-green-900/20 p-1 h-auto"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-green-300 font-medium">Network</p>
            <div className="p-3 bg-black/50 rounded-lg text-green-400 border border-green-500/30">
              {isCorrectNetwork ? (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Polygon Amoy Testnet
                </span>
              ) : (
                <span className="flex items-center gap-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  Wrong Network
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Card - Dual Balance System */}
      <Card className="bg-black border border-green-500/30 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-green-400">Balances</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSyncBalance}
              disabled={isSyncing || isLoadingGameBalance}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
            >
              <RefreshCw className={`w-4 h-4 ${(isSyncing || isLoadingGameBalance) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* MATIC Balance */}
          <div className="space-y-2">
            <p className="text-sm text-green-300 font-medium">MATIC Balance (Gas Fee)</p>
            <div className="p-3 bg-black/50 rounded-lg text-green-400 border border-green-500/30">
              {walletBalance.matic} MATIC
            </div>
          </div>
          
          {/* On-chain GBC (Wallet) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-300 font-medium">💎 Wallet Balance (On-chain)</p>
              <span className="text-xs text-blue-400/70 bg-blue-900/30 px-2 py-1 rounded">Blockchain</span>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-lg text-blue-400 font-bold text-lg border border-blue-500/50">
              {onChainGBC.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} GBC
            </div>
            <p className="text-xs text-blue-300/60">
              Use this for Deposit → Game Balance
            </p>
          </div>

          {/* Off-chain GBC (Game) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-300 font-medium">🎮 Game Balance (Off-chain)</p>
              <span className="text-xs text-green-400/70 bg-green-900/30 px-2 py-1 rounded">Database</span>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg text-green-400 font-bold text-lg border border-green-500/50">
              {offChainGBC.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} GBC
            </div>
            <p className="text-xs text-green-300/60">
              Available for betting in game
            </p>
          </div>

          {/* Info Alert - Balance Flow */}
          <Alert className="bg-blue-900/30 border-blue-700/50 text-blue-100">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Balance Flow:</strong> Wallet (On-chain) → Deposit → Game Balance (Off-chain) → Play → Withdraw → Wallet
            </AlertDescription>
          </Alert>

          {/* Low Balance Warning */}
          {offChainGBC < 10 && (
            <Alert className="bg-yellow-900/50 border-yellow-700 text-yellow-100">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Low game balance! Deposit from your wallet or claim from faucet to play.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="bg-black border border-green-500/30 shadow-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={handleDeposit}
              disabled={!isCorrectNetwork}
              className="bg-green-600 hover:bg-green-500 text-black font-semibold gap-2 h-12 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownCircle className="w-5 h-5" />
              Deposit GBC
            </Button>
            <Button 
              onClick={handleWithdraw}
              disabled={!isCorrectNetwork || offChainGBC < 1}
              className="bg-green-600 hover:bg-green-500 text-black font-semibold gap-2 h-12 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpCircle className="w-5 h-5" />
              Withdraw to Wallet
            </Button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-green-500/30">
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-red-600/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 gap-2 h-12 transition-all duration-200"
            >
              Disconnect Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Get Free GBC from Faucet */}
      {(onChainGBC === 0 && offChainGBC === 0) && (
        <Card className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/40 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <WalletIcon className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-green-400">Get Free GBC Tokens</h3>
              </div>
              <p className="text-green-300 text-sm">
                You need GBC tokens to play. Claim free testnet GBC from faucet then deposit to game!
              </p>
              <Button 
                onClick={handleDeposit}
                disabled={!isCorrectNetwork}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold gap-2 w-full sm:w-auto shadow-lg transition-all duration-200"
              >
                <ExternalLink className="w-5 h-5" />
                Go to Faucet & Deposit
              </Button>
              <p className="text-xs text-green-300/70">
                Faucet gives you wallet balance, then deposit to game balance to play
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}