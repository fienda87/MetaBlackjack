'use client'

import { useState, useEffect } from 'react'
import { Wallet, LogOut, AlertCircle, Loader2, Coins } from 'lucide-react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { switchToPolygonAmoy, POLYGON_AMOY } from '@/lib/web3-config'
import { useGBCBalance } from '@/hooks/useGBCBalance'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export default function WalletButton() {
  const [isClient, setIsClient] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const chainId = useChainId()
  
  // Get GBC token balance
  const { formatted: gbcBalance, isLoading: isLoadingGBC } = useGBCBalance(address)

  // Check if we're on the correct network
  const isCorrectNetwork = chainId === POLYGON_AMOY.chainId

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleConnect = async () => {
    try {
      // First switch to Polygon Amoy
      const networkSwitched = await switchToPolygonAmoy()
      if (!networkSwitched) {
        console.error('Failed to switch to Polygon Amoy testnet')
        return
      }

      // Then connect wallet
      connect({ connector: metaMask() })
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setIsOpen(false)
  }

  const handleSwitchNetwork = async () => {
    await switchToPolygonAmoy()
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        variant="outline"
        className="gap-2"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">
            {formatAddress(address || '')}
          </span>
          {!isCorrectNetwork && (
            <Badge variant="destructive" className="ml-2">
              Wrong Network
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Wallet Details</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-3 space-y-2">
          {/* Address */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Address:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {formatAddress(address || '')}
            </code>
          </div>

          {/* Network Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Network:</span>
            <Badge variant={isCorrectNetwork ? "default" : "destructive"}>
              {isCorrectNetwork ? 'Polygon Amoy' : 'Wrong Network'}
            </Badge>
          </div>

          {/* MATIC Balance */}
          {balance && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{balance.symbol}:</span>
              <span className="font-mono font-semibold">
                {parseFloat(balance.formatted).toFixed(4)}
              </span>
            </div>
          )}

          {/* GBC Token Balance */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              GBC:
            </span>
            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
              {isLoadingGBC ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${parseFloat(gbcBalance).toLocaleString()} GBC`
              )}
            </span>
          </div>

          {/* Wrong Network Warning */}
          {!isCorrectNetwork && (
            <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded text-xs text-yellow-600 dark:text-yellow-500">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Please switch to Polygon Amoy Testnet in MetaMask</span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        
        {/* Actions */}
        {!isCorrectNetwork && (
          <DropdownMenuItem onClick={handleSwitchNetwork}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Switch to Polygon Amoy
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handleDisconnect}>
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
