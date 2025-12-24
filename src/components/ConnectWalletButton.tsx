'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, Loader2, Check } from 'lucide-react'
import { useAccount, useConnect } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import useWeb3Auth from '@/hooks/useWeb3Auth'

export function ConnectWalletButton() {
  const [isClient, setIsClient] = useState(false)
  const [backendValidated, setBackendValidated] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { isAuthenticated, isAuthenticating, signIn, signOut } = useWeb3Auth()

  useEffect(() => setIsClient(true), [])

  // Auto sign-in when wallet connects
  useEffect(() => {
    if (isConnected && !isAuthenticated && !isAuthenticating) {
      signIn().catch(err => console.error('Auto sign-in failed:', err))
    }
  }, [isConnected, isAuthenticated, isAuthenticating, signIn])

  // Check backend session validity
  useEffect(() => {
    if (!isAuthenticated) {
      setBackendValidated(false)
      return
    }
    fetch('/api/auth/web3-login')
      .then(res => res.json())
      .then(data => setBackendValidated(data.authenticated ?? false))
      .catch(() => setBackendValidated(false))
  }, [isAuthenticated])

  if (!isClient) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  const handleConnect = async () => {
    try {
      await connect({ connector: metaMask() })
    } catch (e) {
      console.error('connect failed', e)
    }
  }

  const handleSignIn = async () => {
    try {
      await signIn()
    } catch (e) {
      console.error('sign in failed', e)
    }
  }

  if (!isConnected) {
    return (
      <Button onClick={handleConnect} disabled={isConnecting} variant="outline" className="gap-2">
        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        Connect Wallet
      </Button>
    )
  }

  // Connected but not authenticated
  if (!isAuthenticated) {
    return (
      <Button onClick={handleSignIn} disabled={isAuthenticating} variant="default" className="gap-2">
        {isAuthenticating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        Sign In
      </Button>
    )
  }

  // Authenticated
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" className="gap-2" onClick={signOut} title="Sign out">
        <Check className="h-4 w-4 text-green-400" />
        <span className="hidden sm:inline">{address?.slice(0,6)}...{address?.slice(-4)}</span>
      </Button>
      {backendValidated && (
        <div title="Verified by backend" className="flex items-center gap-1 text-xs text-green-400">
          ✓
        </div>
      )}
    </div>
  )
}

export default ConnectWalletButton
