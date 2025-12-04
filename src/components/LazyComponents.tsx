'use client'

import React from 'react'
import dynamic from 'next/dynamic'
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

// Lazy loaded components with dynamic imports (client-side only)
export const LazyGameHistory = dynamic(() => import('@/components/GameHistory'), {
  loading: ComponentLoader,
  ssr: false,
})

export const LazyRulesGuide = dynamic(() => import('@/components/RulesGuide'), {
  loading: ComponentLoader,
  ssr: false,
})

export const LazySettings = dynamic(() => import('@/components/Settings'), {
  loading: ComponentLoader,
  ssr: false,
})

export const LazyWallet = dynamic(() => import('@/components/Wallet'), {
  loading: ComponentLoader,
  ssr: false,
})

export const LazyStoreView = dynamic(() => import('@/components/StoreView'), {
  loading: ComponentLoader,
  ssr: false,
})

// Wrapper components (aliases for consistency)
export const SuspenseGameHistory = LazyGameHistory
export const SuspenseRulesGuide = LazyRulesGuide
export const SuspenseSettings = LazySettings
export const SuspenseWallet = LazyWallet
export const SuspenseStoreView = LazyStoreView