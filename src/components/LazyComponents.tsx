'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Loading skeleton component
const SkeletonLoader = () => (
  <div className="space-y-4 p-4">
    <div className="h-12 bg-gray-200 rounded animate-pulse" />
    <div className="h-64 bg-gray-200 rounded animate-pulse" />
  </div>
)

// ========== HEAVY COMPONENTS - Dynamic Load ==========

// Game-related (heavy game logic + UI state)
export const SuspenseGameHistory = dynamic(
  () => import('@/components/GameHistory'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false, // Don't render on server
  }
)

export const SuspenseGameResultModal = dynamic(
  () => import('@/components/GameResultModal'),
  {
    loading: () => null,
    ssr: false,
  }
)

// Wallet-related (Web3 integrations)
export const SuspenseWallet = dynamic(
  () => import('@/components/Wallet'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false,
  }
)

// Store/Shop (large product list + images)
export const SuspenseStoreView = dynamic(
  () => import('@/components/StoreView'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false,
  }
)

// Settings (form-heavy, not critical on load)
export const SuspenseSettings = dynamic(
  () => import('@/components/Settings'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false,
  }
)

// Rules/Guide (large content)
export const SuspenseRulesGuide = dynamic(
  () => import('@/components/RulesGuide'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false,
  }
)

// Admin panel (only for admins)
export const SuspenseAdminPanel = dynamic(
  () => import('@/components/AdminPanel'),
  {
    loading: () => <SkeletonLoader />,
    ssr: false,
  }
)

// Deposit/Withdraw Modal (Web3 heavy)
export const SuspenseDepositWithdrawModal = dynamic(
  () => import('@/components/DepositWithdrawModal'),
  {
    loading: () => null,
    ssr: false,
  }
)

// ========== LIGHTWEIGHT COMPONENTS - Normal Import ==========
// Keep lightweight components in main bundle
export { default as GameTable } from '@/components/GameTable'
export { default as Navigation } from '@/components/Navigation'
export { default as WalletConnection } from '@/components/WalletConnection'
export { default as AudioControls } from '@/components/AudioControls'
export { default as CardDeck } from '@/components/CardDeck'
export { default as ConnectWalletButton } from '@/components/ConnectWalletButton'
export { default as ErrorBoundary } from '@/components/ErrorBoundary'
export { default as GameErrorBoundary } from '@/components/GameErrorBoundary'
export { default as WalletButton } from '@/components/WalletButton'
export { default as PullToRefresh } from '@/components/PullToRefresh'

// Backward compatibility aliases
export const LazyGameHistory = SuspenseGameHistory
export const LazyRulesGuide = SuspenseRulesGuide
export const LazySettings = SuspenseSettings
export const LazyWallet = SuspenseWallet
export const LazyStoreView = SuspenseStoreView