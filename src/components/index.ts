/**
 * Component exports
 * Heavy components should use dynamic imports, not barrel exports
 */

// ✅ Lightweight components - safe to export
export { default as Navigation } from '@/components/Navigation'
export { default as GameTable } from '@/components/GameTable'
export { default as WalletConnection } from '@/components/WalletConnection'
export { default as AudioControls } from '@/components/AudioControls'
export { default as CardDeck } from '@/components/CardDeck'
export { default as ConnectWalletButton } from '@/components/ConnectWalletButton'
export { default as ErrorBoundary } from '@/components/ErrorBoundary'
export { default as GameErrorBoundary } from '@/components/GameErrorBoundary'
export { default as WalletButton } from '@/components/WalletButton'
export { default as PullToRefresh } from '@/components/PullToRefresh'

// ❌ Heavy components - use dynamic imports in consuming components
// DON'T export these here:
// - GameHistory
// - GameResultModal
// - Wallet
// - StoreView
// - Settings
// - RulesGuide
// - AdminPanel
// - DepositWithdrawModal
// Import via LazyComponents instead

// ✅ Dynamic component exports from LazyComponents
export * from '@/components/LazyComponents'
