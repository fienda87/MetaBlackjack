"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { verifyMessage } from 'ethers'

type AuthSession = {
  address: string
  signature: string
  message: string
  timestamp: string
}

const STORAGE_KEY = 'mb_web3_auth'

export function useWeb3Auth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()

  const [session, setSession] = useState<AuthSession | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Load session from storage and validate signature
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return
    try {
      const parsed: AuthSession = JSON.parse(raw)
      const recovered = verifyMessage(parsed.message, parsed.signature)
      if (recovered.toLowerCase() === parsed.address.toLowerCase()) {
        setSession(parsed)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const signIn = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    setIsAuthenticating(true)
    try {
      const nonce = Math.floor(Math.random() * 1e9).toString()
      const timestamp = new Date().toISOString()
      const message = `MetaBlackJack Authentication\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${timestamp}`

      const signature = await signMessageAsync({ message })
      const recovered = verifyMessage(message, signature)
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signature verification failed')
      }

      const newSession: AuthSession = { address, signature, message, timestamp }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession))
      setSession(newSession)

      // Call backend to verify signature and set session cookie
      try {
        const backendResponse = await fetch('/api/auth/web3-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSession),
        })
        if (!backendResponse.ok) {
          console.warn('Backend verification failed, but local session valid')
        }
      } catch (e) {
        console.warn('Backend verification error (local session still valid):', e)
      }

      return newSession
    } finally {
      setIsAuthenticating(false)
    }
  }, [address, isConnected, signMessageAsync])

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
    // keep wallet connected or disconnect depending on caller's intent
    try { disconnect() } catch (_) {}
  }, [disconnect])

  return {
    session,
    isAuthenticated: !!session,
    isAuthenticating,
    signIn,
    signOut,
  }
}

export default useWeb3Auth
