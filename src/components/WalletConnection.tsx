'use client'

import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wallet, AlertCircle } from 'lucide-react'
import { connectWallet, getMockWallets, disconnectWallet } from '@/application/providers/store/walletSlice'
import { RootState, AppDispatch } from '@/application/providers/store'

export default function WalletConnection() {
  const dispatch = useDispatch<AppDispatch>()
  const { isConnected, isConnecting, user, error, mockWallets } = useSelector((state: RootState) => state.wallet)
  const [selectedWallet, setSelectedWallet] = useState('')

  useEffect(() => {
    // Load mock wallets on component mount
    dispatch(getMockWallets())
  }, [dispatch])

  const handleConnect = async () => {
    if (!selectedWallet) {
      return
    }
    
    await dispatch(connectWallet(selectedWallet))
  }

  const handleDisconnect = async () => {
    await dispatch(disconnectWallet())
    setSelectedWallet('')
  }

  if (isConnected && user) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black border border-green-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-400">
            <Wallet className="h-6 w-6" />
            Wallet Connected
          </CardTitle>
          <CardDescription className="text-green-300">
            Your crypto wallet is connected and ready to play
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-green-300 text-sm font-medium">Wallet Address</Label>
            <div className="p-3 bg-black/50 rounded-lg text-sm font-mono text-green-400 border border-green-500/30">
              {user.walletAddress}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-green-300 text-sm font-medium">Username</Label>
            <div className="p-3 bg-black/50 rounded-lg text-green-400 border border-green-500/30">
              {user.username || 'Anonymous Player'}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-green-300 text-sm font-medium">GBC Balance</Label>
            <div className="p-3 bg-black rounded-lg text-green-400 font-bold border border-green-500/50">
              {user.balance.toLocaleString()} GBC
            </div>
          </div>
          
          <Button 
            onClick={handleDisconnect} 
            variant="outline" 
            className="w-full bg-black/20 hover:bg-black/30 text-green-400 border-green-500/50 hover:border-green-400/70 transition-all duration-200"
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-black border border-green-500/30 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-green-400">
          <Wallet className="h-6 w-6" />
          Connect Wallet
        </CardTitle>
        <CardDescription className="text-green-300">
          Connect your crypto wallet to start playing with GBC coins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-900/50 border-red-700 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label className="text-green-300 text-sm font-medium">Select Test Wallet</Label>
          <Select value={selectedWallet} onValueChange={setSelectedWallet}>
            <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400 focus:border-green-400/70">
              <SelectValue placeholder="Choose a test wallet" />
            </SelectTrigger>
            <SelectContent className="bg-black border-green-500/30">
              {mockWallets.map((wallet) => (
                <SelectItem key={wallet.address} value={wallet.address} className="text-green-400 hover:bg-green-900/50">
                  {wallet.username} ({wallet.balance} GBC)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleConnect} 
          disabled={isConnecting || !selectedWallet}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>

        <div className="text-xs text-green-300 text-center space-y-1">
          <p>Select a test wallet to start playing.</p>
          <p>In production, this will connect to your MetaMask wallet.</p>
        </div>
      </CardContent>
    </Card>
  )
}