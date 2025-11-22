'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  User, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Gift,
  Edit2,
  Check,
  X,
  LogOut
} from 'lucide-react'
import { RootState, AppDispatch } from '@/application/providers/store'
import { disconnectWallet, updateUser } from '@/application/providers/store/walletSlice'

interface WalletProps {
  onNavigateToStore: () => void
}

export default function Wallet({ onNavigateToStore }: WalletProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { user, isConnected } = useSelector((state: RootState) => state.wallet)
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(user?.username || '')
  const [hasClaimedBonus, setHasClaimedBonus] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (user) {
      setTempName(user.username || '')
    }
  }, [user])

  const handleDeposit = () => {
    onNavigateToStore()
  }

  const handleWithdraw = () => {
    alert('Withdraw feature is temporarily unavailable. Please contact support.')
  }

  const handleClaimBonus = () => {
    if (!hasClaimedBonus) {
      setHasClaimedBonus(true)
      alert('Congratulations! You have claimed 1000 GBC coins!')
    }
  }

  const handleEditName = () => {
    setTempName(user?.username || '')
    setIsEditingName(true)
  }

  const handleSaveName = async () => {
    if (tempName.trim() && user) {
      setIsUpdating(true)
      try {
        await dispatch(updateUser({ userId: user.id, username: tempName.trim() })).unwrap()
        setIsEditingName(false)
      } catch (error) {
        console.error('Failed to update username:', error)
        alert('Failed to update username. Please try again.')
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleCancelEdit = () => {
    setTempName(user?.username || '')
    setIsEditingName(false)
  }

  const handleSignOut = async () => {
    try {
      await dispatch(disconnectWallet()).unwrap()
      // User will be redirected to connect wallet page automatically
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Account Name Card */}
      <Card className="bg-black border border-green-500/30 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-green-400 flex items-center justify-center gap-2">
            <User className="w-5 h-5" />
            Account Name
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {isEditingName ? (
            <div className="flex items-center justify-center gap-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="bg-black/50 border-green-500/30 text-green-400 text-center max-w-xs focus:border-green-400/70"
                placeholder="Enter your name"
                disabled={isUpdating}
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={isUpdating}
                className="bg-green-500 hover:bg-green-400 text-black p-2"
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="border-green-500/50 text-green-400 hover:bg-black/20 p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border border-green-500/30">
                <User className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-400">{user?.username || 'Anonymous Player'}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEditName}
                className="text-green-400 hover:text-green-300 hover:bg-black/20 p-2"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Info Card */}
      <Card className="bg-black border border-green-500/30 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-green-400">Wallet Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-green-300 font-medium">Wallet Address</p>
            <div className="p-3 bg-black/50 rounded-lg text-sm font-mono text-green-400 border border-green-500/30">
              {user?.walletAddress}
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-green-300 font-medium">GBC Balance</p>
            <div className="p-3 bg-black rounded-lg text-green-400 font-bold border border-green-500/50">
              {user?.balance.toLocaleString() || '0'} GBC
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="bg-black border border-green-500/30 shadow-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              onClick={handleDeposit}
              className="bg-green-600 hover:bg-green-500 text-black font-semibold gap-2 h-12 shadow-lg transition-all duration-200"
            >
              <ArrowDownCircle className="w-5 h-5" />
              Deposit
            </Button>
            <Button 
              onClick={handleWithdraw}
              className="bg-green-600 hover:bg-green-500 text-black font-semibold gap-2 h-12 shadow-lg transition-all duration-200"
            >
              <ArrowUpCircle className="w-5 h-5" />
              Withdraw
            </Button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-green-500/30">
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-red-600/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 gap-2 h-12 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* New Player Bonus */}
      {!hasClaimedBonus && (
        <Card className="bg-black/50 border border-green-500/40 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-green-400">New Player Bonus</h3>
              </div>
              <p className="text-green-300">
                Claim your free 1000 GBC coins and start playing!
              </p>
              <Button 
                onClick={handleClaimBonus}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold gap-2 w-full sm:w-auto shadow-lg transition-all duration-200"
              >
                <Gift className="w-5 h-5" />
                Claim 1000 GBC FREE
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bonus Claimed */}
      {hasClaimedBonus && (
        <Card className="bg-black/30 border border-green-500/30 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-green-400" />
              <p className="text-green-300 font-semibold">Bonus claimed successfully!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}