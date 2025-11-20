'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  History, 
  BookOpen, 
  Settings,
  Store,
  Wallet,
  Menu,
  X
} from 'lucide-react'
import ConnectWalletButton from './ConnectWalletButton'

interface NavigationProps {
  currentView: string
  setCurrentView: (view: string) => void
}

export default function Navigation({ currentView, setCurrentView }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const navItems = [
    { id: 'game', label: 'Game Table', icon: LayoutDashboard },
    { id: 'wallet', label: 'Account', icon: Wallet },
    { id: 'store', label: 'GBC Store', icon: Store },
    { id: 'history', label: 'Game History', icon: History },
    { id: 'rules', label: 'Rules Guide', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId)
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-green-500/30 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">♠</span>
            <h1 className="text-2xl font-bold text-green-400">MetaBlackJack</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  className={`gap-2 ${
                    currentView === item.id 
                      ? 'bg-green-500 text-black hover:bg-green-400' 
                      : 'text-green-400 hover:text-green-300 hover:bg-black/20'
                  }`}
                  onClick={() => setCurrentView(item.id)}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              )
            })}
            {/* Connect Wallet Button */}
            <div className="ml-2">
              <ConnectWalletButton />
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-green-400 hover:text-green-300 hover:bg-black/20"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-green-500/30 bg-black/95 backdrop-blur-sm">
            <nav className="py-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={currentView === item.id ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 rounded-none ${
                      currentView === item.id 
                        ? 'bg-green-500 text-black hover:bg-green-400' 
                        : 'text-green-400 hover:text-green-300 hover:bg-black/20'
                    }`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                )
              })}
              <div className="px-4 py-2">
                <ConnectWalletButton />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}