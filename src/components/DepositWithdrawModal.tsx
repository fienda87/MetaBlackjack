'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useGBCDeposit } from '@/hooks/useGBCDeposit'
import { useGBCWithdraw } from '@/hooks/useGBCWithdraw'
import { useGBCFaucet } from '@/hooks/useGBCFaucet'
import { useGBCBalance } from '@/hooks/useGBCBalance'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

type Tab = 'faucet' | 'deposit' | 'withdraw'

export default function DepositWithdrawModal() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const { balance: gbcBalance } = useGBCBalance(address)

  // Faucet
  const {
    canClaim,
    formattedClaimAmount,
    isClaiming,
    isClaimConfirmed,
    claim,
  } = useGBCFaucet(address)

  // Deposit
  const [depositAmount, setDepositAmount] = useState('')
  const {
    allowance,
    formattedAllowance,
    isApproving,
    isApprovalConfirmed,
    isDepositing,
    isDepositConfirmed,
    formattedEscrowBalance,
    approve,
    deposit,
    refetchAllowance,
  } = useGBCDeposit(address)

  // Parse input amount safely
  const inputAmount = useMemo(() => {
    if (!depositAmount || depositAmount === '0') return 0n
    try {
      return parseEther(depositAmount)
    } catch {
      return 0n
    }
  }, [depositAmount])

  // ✅ CORRECT: Check if allowance is ENOUGH for deposit amount
  const isApproved = useMemo(() => {
    const result = allowance >= inputAmount && inputAmount > 0n
    console.log('💰 Approval Status:', {
      depositAmount,
      inputAmount: inputAmount.toString(),
      currentAllowance: allowance.toString(),
      isApproved,
      needsApproval: inputAmount > allowance,
    })
    return result
  }, [allowance, inputAmount])

  // Log when deposit amount changes
  useEffect(() => {
    console.log('📝 Deposit amount changed:', depositAmount)
  }, [depositAmount])

  // Refresh allowance after approval is confirmed
  useEffect(() => {
    if (isApprovalConfirmed) {
      console.log('✅ Approval confirmed, refreshing allowance...')
      refetchAllowance()
    }
  }, [isApprovalConfirmed, refetchAllowance])

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const {
    isWithdrawing,
    isWithdrawConfirmed,
    withdraw,
  } = useGBCWithdraw(address)

  const [activeTab, setActiveTab] = useState<Tab>('faucet')
  const [isProcessing, setIsProcessing] = useState(false)

  // Format balance for display
  const formattedGBCBalance = gbcBalance 
    ? (Number(gbcBalance) / 1e18).toFixed(2)
    : '0.00'

  // Handle faucet claim
  const handleClaimFaucet = async () => {
    if (!address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    try {
      await claim()
      toast({
        title: 'Faucet Claimed! 🎉',
        description: `${formattedClaimAmount} GBC tokens will be added to your wallet`,
      })
    } catch (error: any) {
      toast({
        title: 'Claim Failed',
        description: error?.message || 'Failed to claim faucet',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle approve
  const handleApprove = async () => {
    if (!depositAmount || !address) return

    setIsProcessing(true)
    try {
      const amountToApprove = parseEther(depositAmount)

      console.log('🔐 Requesting approval for:', {
        amount: depositAmount,
        amountInWei: amountToApprove.toString(),
      })

      await approve(depositAmount)

      console.log('✅ Approval TX sent')

      // Wait for confirmation (handled by hook)
      toast({
        title: 'Approval Submitted! 🔐',
        description: `${depositAmount} GBC tokens are being approved`,
      })

      // Refresh allowance after confirmation
      if (isApprovalConfirmed) {
        await refetchAllowance()
        console.log('✅ Allowance refreshed')
      }
    } catch (error: any) {
      console.error('❌ Approval failed:', error)
      toast({
        title: 'Approval Failed',
        description: error?.message || 'Failed to approve GBC',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle deposit
  const handleDeposit = async () => {
    if (!address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      })
      return
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid deposit amount',
        variant: 'destructive',
      })
      return
    }

    // ✅ PRE-FLIGHT CHECK: Validate allowance BEFORE calling smart contract
    if (allowance < inputAmount) {
      console.error('❌ Pre-flight check failed:', {
        required: inputAmount.toString(),
        current: allowance.toString(),
        shortfall: (inputAmount - allowance).toString(),
      })

      toast({
        title: 'Insufficient Allowance',
        description: `Need ${depositAmount} GBC, allowed only ${formattedAllowance} GBC. Please approve first.`,
        variant: 'destructive',
      })
      return // Don't call smart contract!
    }

    const gbcBalanceNum = Number(gbcBalance) / 1e18
    if (parseFloat(depositAmount) > gbcBalanceNum) {
      toast({
        title: 'Insufficient Balance',
        description: `You have ${formattedGBCBalance} GBC available`,
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    try {
      console.log('💰 Depositing:', {
        amount: depositAmount,
        allowance: formattedAllowance,
      })

      await deposit(depositAmount)

      toast({
        title: 'Deposit Submitted! 💎',
        description: `${depositAmount} GBC tokens are being deposited to escrow`,
      })

      // Reset form after success
      if (isDepositConfirmed) {
        setDepositAmount('')
      }
    } catch (error: any) {
      console.error('❌ Deposit failed:', error)
      toast({
        title: 'Deposit Failed',
        description: error?.message || 'Failed to deposit GBC',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      })
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive',
      })
      return
    }

    if (parseFloat(withdrawAmount) > parseFloat(formattedEscrowBalance)) {
      toast({
        title: 'Insufficient Escrow Balance',
        description: `You have ${formattedEscrowBalance} GBC in escrow`,
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    try {
      await withdraw(withdrawAmount)
      
      toast({
        title: 'Withdrawal Submitted! 🚀',
        description: `${withdrawAmount} GBC tokens are being withdrawn`,
      })
      
      // Reset form after success
      if (isWithdrawConfirmed) {
        setWithdrawAmount('')
      }
    } catch (error: any) {
      toast({
        title: 'Withdrawal Failed',
        description: error?.message || 'Failed to withdraw GBC',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isConnected || !address) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Wallet Not Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Please connect your wallet to manage deposits and withdrawals.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Wallet Management</span>
          <span className="text-sm font-normal text-gray-600">
            Balance: {formattedGBCBalance} GBC
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="faucet" className="gap-2">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Faucet</span>
            </TabsTrigger>
            <TabsTrigger value="deposit" className="gap-2">
              <ArrowDownCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Deposit</span>
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-2">
              <ArrowUpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Withdraw</span>
            </TabsTrigger>
          </TabsList>

          {/* FAUCET TAB */}
          <TabsContent value="faucet" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Claim Initial Tokens</h3>
              <p className="text-sm text-gray-600">
                Receive {formattedClaimAmount} GBC tokens for free (one-time only)
              </p>
            </div>

            {isClaimConfirmed ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Claimed!</p>
                  <p className="text-sm text-green-700">
                    {formattedClaimAmount} GBC tokens added to your wallet
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleClaimFaucet}
                disabled={!canClaim || isClaiming || isProcessing}
                className="w-full"
                size="lg"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Claim {formattedClaimAmount} GBC
                  </>
                )}
              </Button>
            )}

            {!canClaim && (
              <p className="text-sm text-yellow-600">
                ⏳ You've already claimed the faucet. Please try again tomorrow.
              </p>
            )}
          </TabsContent>

          {/* DEPOSIT TAB */}
          <TabsContent value="deposit" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Deposit GBC Tokens</h3>
              <p className="text-sm text-gray-600">
                Deposit tokens to escrow for gameplay
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (GBC)</label>
              <Input
                type="number"
                placeholder="Enter amount to deposit"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={isApproving || isDepositing || isProcessing}
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500">
                Available: {formattedGBCBalance} GBC | Allowance: {formattedAllowance} GBC
              </p>
            </div>

            {isDepositConfirmed ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Deposit Confirmed!</p>
                  <p className="text-sm text-green-700">
                    {depositAmount} GBC tokens deposited to escrow
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* APPROVE BUTTON */}
                <Button
                  onClick={handleApprove}
                  disabled={
                    isApproved ||
                    isApproving ||
                    !depositAmount ||
                    depositAmount === '0' ||
                    isProcessing
                  }
                  className="w-full"
                  size="lg"
                  variant={isApproved ? "default" : "outline"}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isApproved ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      ✅ Approved ({formattedAllowance} GBC)
                    </>
                  ) : (
                    <>
                      🔓 1. Approve {depositAmount || '0'} GBC
                    </>
                  )}
                </Button>

                {/* DEPOSIT BUTTON */}
                <Button
                  onClick={handleDeposit}
                  disabled={
                    !isApproved ||
                    isDepositing ||
                    !depositAmount ||
                    isProcessing
                  }
                  className="w-full"
                  size="lg"
                  variant={isApproved && depositAmount ? "default" : "secondary"}
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="w-4 h-4 mr-2" />
                      💰 2. Deposit {depositAmount || '0'} GBC
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* WITHDRAW TAB */}
          <TabsContent value="withdraw" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Withdraw GBC Tokens</h3>
              <p className="text-sm text-gray-600">
                Withdraw tokens from escrow to your wallet
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (GBC)</label>
              <Input
                type="number"
                placeholder="Enter amount to withdraw"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={isWithdrawing || isProcessing}
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500">
                Available in escrow: {formattedEscrowBalance} GBC
              </p>
            </div>

            {isWithdrawConfirmed ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Withdrawal Confirmed!</p>
                  <p className="text-sm text-green-700">
                    {withdrawAmount} GBC tokens withdrawn to your wallet
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || isWithdrawing || isProcessing}
                className="w-full"
                size="lg"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Withdraw {withdrawAmount || '0'} GBC
                  </>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-2">ℹ️ How it works:</p>
          <ul className="space-y-1 text-xs">
            <li>1. <strong>Faucet:</strong> Claim initial tokens (one-time only)</li>
            <li>2. <strong>Deposit:</strong> Move tokens to escrow for gameplay</li>
            <li>3. <strong>Play:</strong> Bet and win/lose tokens off-chain (instant, no gas)</li>
            <li>4. <strong>Withdraw:</strong> Return tokens to your wallet</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
