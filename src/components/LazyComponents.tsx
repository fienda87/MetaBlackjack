'use client'

import React, { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Loading component
const ComponentLoader = () => (
  <Card className="bg-black border-green-900/30">
    <CardContent className="p-8 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
    </CardContent>
  </Card>
)

// Lazy loaded components
export const LazyGameHistory = lazy(() => import('@/components/GameHistory'))
export const LazyGameHistoryStats = lazy(() => import('@/components/GameHistoryStats'))
export const LazyRulesGuide = lazy(() => import('@/components/RulesGuide'))
export const LazySettings = lazy(() => import('@/components/Settings'))
export const LazyWallet = lazy(() => import('@/components/Wallet'))
export const LazyStoreView = lazy(() => import('@/components/StoreView'))
export const LazyAdminPanel = lazy(() => import('@/components/AdminPanel'))

// Wrapper components with Suspense
export const SuspenseGameHistory = () => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyGameHistory />
  </Suspense>
)

export const SuspenseRulesGuide = () => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyRulesGuide />
  </Suspense>
)

export const SuspenseSettings = () => (
  <Suspense fallback={<ComponentLoader />}>
    <LazySettings />
  </Suspense>
)

export const SuspenseWallet = (props: any) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyWallet {...props} />
  </Suspense>
)

export const SuspenseStoreView = (props: any) => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyStoreView {...props} />
  </Suspense>
)

export const SuspenseAdminPanel = () => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyAdminPanel />
  </Suspense>
)