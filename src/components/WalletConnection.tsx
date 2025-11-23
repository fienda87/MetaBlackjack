'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wallet, AlertCircle, RefreshCw, Network } from 'lucide-react'
import { useWallet } from '@/web3/useWallet'
import { switchToPolygonAmoy } from '@/web3/config'

export default function WalletConnection() {
  const router = useRouter()
  const {
    isConnected,
    address,
    balance,
    isCorrectNetwork,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    syncBalance,
    clearError,
  } = useWallet()

  // Auto-redirect to game after successful connection
  useEffect(() => {
    if (isConnected && isCorrectNetwork && address) {
      // Small delay to show success state before redirect
      const timer = setTimeout(() => {
        router.push('/')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isConnected, isCorrectNetwork, address, router])

  const handleConnect = async () => {
    try {
      clearError()
      await connectWallet()
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      clearError()
      await switchToPolygonAmoy()
    } catch (err) {
      console.error('Failed to switch network:', err)
    }
  }

  // Connected state with wrong network
  if (isConnected && !isCorrectNetwork) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black border border-yellow-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-yellow-400">
            <Network className="h-6 w-6" />
            Wrong Network
          </CardTitle>
          <CardDescription className="text-yellow-300">
            Please switch to Polygon Amoy Testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-yellow-900/50 border-yellow-700 text-yellow-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're connected to the wrong network. Switch to Polygon Amoy Testnet to continue.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label className="text-yellow-300 text-sm font-medium">Wallet Address</Label>
            <div className="p-3 bg-black/50 rounded-lg text-sm font-mono text-yellow-400 border border-yellow-500/30">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
            </div>
          </div>
          
          <Button 
            onClick={handleSwitchNetwork} 
            disabled={isLoading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold shadow-lg transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <Network className="mr-2 h-4 w-4" />
                Switch to Polygon Amoy
              </>
            )}
          </Button>

          <Button 
            onClick={disconnectWallet} 
            variant="outline" 
            className="w-full bg-black/20 hover:bg-black/30 text-yellow-400 border-yellow-500/50 hover:border-yellow-400/70 transition-all duration-200"
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Connected state with correct network - show success and redirect
  if (isConnected && isCorrectNetwork && address) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black border border-green-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-400">
            <Wallet className="h-6 w-6" />
            ✅ Wallet Connected!
          </CardTitle>
          <CardDescription className="text-green-300">
            Redirecting to game...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-green-300 text-sm font-medium">Wallet Address</Label>
            <div className="p-3 bg-black/50 rounded-lg text-sm font-mono text-green-400 border border-green-500/30">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-green-300 text-sm font-medium">MATIC Balance</Label>
            <div className="p-3 bg-black/50 rounded-lg text-green-400 border border-green-500/30">
              {balance.matic} MATIC
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-green-300 text-sm font-medium">GBC Balance</Label>
              <Button
                onClick={syncBalance}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/20"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-3 bg-black rounded-lg text-green-400 font-bold text-lg border border-green-500/50">
              {parseFloat(balance.gbc).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} GBC
            </div>
          </div>
          
          <Button 
            onClick={disconnectWallet} 
            variant="outline" 
            className="w-full bg-black/20 hover:bg-black/30 text-green-400 border-green-500/50 hover:border-green-400/70 transition-all duration-200"
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Not connected state
  return (
    <Card className="w-full max-w-md mx-auto bg-black border border-green-500/30 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-green-400">
          <Wallet className="h-6 w-6" />
          Connect MetaMask
        </CardTitle>
        <CardDescription className="text-green-300">
          Connect your MetaMask wallet to start playing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-900/50 border-red-700 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3 p-4 bg-green-900/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-300 font-medium">Requirements:</p>
          <ul className="text-xs text-green-300 space-y-1">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              MetaMask browser extension installed
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              Polygon Amoy Testnet configured
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              Some testnet MATIC for gas fees
            </li>
          </ul>
        </div>

        <Button 
          onClick={handleConnect} 
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect MetaMask
            </>
          )}
        </Button>

        <div className="text-xs text-green-300/70 text-center space-y-1">
          <p>Make sure MetaMask is unlocked</p>
          <p className="text-green-400 font-medium">
            Network will auto-switch to Polygon Amoy
          </p>
        </div>
      </CardContent>
    </Card>
  )
}