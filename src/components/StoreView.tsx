'use client'

import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Coins,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useGameBalance } from '@/hooks/useGameBalance'
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { readContract, waitForTransactionReceipt } from 'wagmi/actions'
import { config } from '@/web3/config'
import { parseUnits, formatUnits, maxUint256 } from 'viem'

// Initialize Socket.IO singleton for StoreView
// Use NEXT_PUBLIC_APP_URL if set, otherwise use current origin (auto-detects domain)
const socketUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
const storeSocket = typeof window !== 'undefined' ? io(socketUrl, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  autoConnect: true
}) : null

// Contract addresses - hardcoded for client-side reliability
const GBC_TOKEN_ADDRESS = '0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a' as `0x${string}`
const DEPOSIT_ESCROW_ADDRESS = '0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22' as `0x${string}`
const FAUCET_ADDRESS = '0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7' as `0x${string}`
const WITHDRAW_ADDRESS = '0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3' as `0x${string}`

// Debug: Log addresses on mount
if (typeof window !== 'undefined') {
  console.log('🔍 Contract Addresses:', {
    GBC_TOKEN_ADDRESS,
    DEPOSIT_ESCROW_ADDRESS,
    FAUCET_ADDRESS,
    WITHDRAW_ADDRESS
  })
}

// ERC20 ABI for approve and allowance
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Deposit Escrow ABI
const DEPOSIT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const

// Faucet ABI
const FAUCET_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'CLAIM_AMOUNT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'CLAIM_COOLDOWN',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastClaimTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'canClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// GameWithdraw ABI
const WITHDRAW_ABI = [
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'finalBalance', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

type TransactionStep = 'idle' | 'approving' | 'approved' | 'depositing' | 'success' | 'error'
type WithdrawStep = 'idle' | 'requesting' | 'signing' | 'withdrawing' | 'success' | 'error'

export default function StoreView() {
  const { address: wagmiAddress } = useAccount()
  const address = wagmiAddress // Alias untuk kompatibilitas
  
  const { 
    walletBalance, 
    gameBalance,
    onChainGBC,
    offChainGBC,
    syncBothBalances, 
    fetchGameBalance,
    isConnected, 
    isCorrectNetwork 
  } = useGameBalance()
  
  // Wagmi hooks for contract interactions
  const { writeContractAsync } = useWriteContract()
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState('')
  const [depositStep, setDepositStep] = useState<TransactionStep>('idle')
  const [depositTxHash, setDepositTxHash] = useState<string>('')
  const [allowance, setAllowance] = useState<bigint>(BigInt(0))
  
  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>('idle')
  const [withdrawTxHash, setWithdrawTxHash] = useState<string>('')
  
  // Faucet state
  const [isClaiming, setIsClaiming] = useState(false)
  const [faucetAmount, setFaucetAmount] = useState<string>('0')
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)

  // Fetch allowance
  const fetchAllowance = useCallback(async () => {
    if (!address) return
    try {
      const result = await readContract(config, {
        address: GBC_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, DEPOSIT_ESCROW_ADDRESS],
      })
      setAllowance(result)
    } catch (error) {
      console.error('Error fetching allowance:', error)
    }
  }, [address])

  // Fetch faucet info
  const fetchFaucetInfo = useCallback(async () => {
    if (!address) return
    try {
      const [claimAmt, lastClaim, cooldown] = await Promise.all([
        readContract(config, {
          address: FAUCET_ADDRESS,
          abi: FAUCET_ABI,
          functionName: 'CLAIM_AMOUNT',
        }),
        readContract(config, {
          address: FAUCET_ADDRESS,
          abi: FAUCET_ABI,
          functionName: 'lastClaimTime',
          args: [address as `0x${string}`],
        }),
        readContract(config, {
          address: FAUCET_ADDRESS,
          abi: FAUCET_ABI,
          functionName: 'CLAIM_COOLDOWN',
        }),
      ])
      
      setFaucetAmount(formatUnits(claimAmt, 18))
      
      const now = Math.floor(Date.now() / 1000)
      const nextClaimTime = Number(lastClaim) + Number(cooldown)
      const remaining = Math.max(0, nextClaimTime - now)
      setCooldownRemaining(remaining)
    } catch (error) {
      console.error('Error fetching faucet info:', error)
    }
  }, [address])

  // Approve tokens
  const handleApprove = async () => {
    if (!address) return
    
    setDepositStep('approving')
    try {
      const hash = await writeContractAsync({
        address: GBC_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [DEPOSIT_ESCROW_ADDRESS, maxUint256],
      })

      toast({
        title: "Approval Submitted",
        description: "Waiting for confirmation...",
      })

      await waitForTransactionReceipt(config, { hash })
      
      setDepositStep('approved')
      await fetchAllowance()
      
      toast({
        title: "✅ Approved!",
        description: "You can now deposit GBC tokens",
      })
    } catch (error: any) {
      console.error('Approval error:', error)
      setDepositStep('error')
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve tokens",
        variant: "destructive"
      })
    }
  }

  // Deposit tokens
  const handleDeposit = async () => {
    if (!address || !depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      })
      return
    }

    const amountWei = parseUnits(depositAmount, 18)
    
    // Check allowance
    if (allowance < amountWei) {
      toast({
        title: "Approval Required",
        description: "Please approve tokens first",
        variant: "destructive"
      })
      return
    }

    setDepositStep('depositing')
    try {
      const hash = await writeContractAsync({
        address: DEPOSIT_ESCROW_ADDRESS,
        abi: DEPOSIT_ABI,
        functionName: 'deposit',
        args: [amountWei],
      })

      setDepositTxHash(hash)
      
      toast({
        title: "Deposit Submitted",
        description: "Waiting for confirmation...",
      })

      await waitForTransactionReceipt(config, { hash })
      
      setDepositStep('success')
      
      toast({
        title: "✅ Deposit Successful!",
        description: `Deposited ${depositAmount} GBC - Updating balance...`,
      })

      // Wait for backend to process (blockchain listener takes a few seconds)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Refresh both balances (bypasses cache)
      setDepositAmount('')
      await syncBothBalances()
      await fetchAllowance()
      
      toast({
        title: "✅ Balance Updated!",
        description: "Your game balance has been updated",
      })
      
      // Reset after 3 seconds
      setTimeout(() => {
        setDepositStep('idle')
        setDepositTxHash('')
      }, 3000)
    } catch (error: any) {
      console.error('Deposit error:', error)
      setDepositStep('error')
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to deposit tokens",
        variant: "destructive"
      })
    }
  }

  // Handle faucet claim
  const handleFaucetClaim = async () => {
    if (!address) return
    
    if (cooldownRemaining > 0) {
      toast({
        title: "Cooldown Active",
        description: `Please wait ${formatTime(cooldownRemaining)} before claiming again`,
        variant: "destructive"
      })
      return
    }

    setIsClaiming(true)
    try {
      const hash = await writeContractAsync({
        address: FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'claim',
      })

      toast({
        title: "Claim Submitted",
        description: "Waiting for confirmation...",
      })

      await waitForTransactionReceipt(config, { hash })
      
      toast({
        title: "✅ Claimed Successfully!",
        description: `Received ${faucetAmount} GBC from faucet`,
      })

      // Refresh both balances after faucet claim
      await syncBothBalances()
      await fetchGameBalance()
      await fetchFaucetInfo()
    } catch (error: any) {
      console.error('Faucet claim error:', error)
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim from faucet",
        variant: "destructive"
      })
    } finally {
      setIsClaiming(false)
    }
  }

  // Handle withdrawal with signature from backend
  const handleWithdraw = async () => {
    if (!address || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      })
      return
    }

    const withdrawAmountFloat = parseFloat(withdrawAmount)

    // Check game balance (off-chain)
    if (withdrawAmountFloat > offChainGBC) {
      toast({
        title: "Insufficient Game Balance",
        description: `Your game balance is ${gameBalance} GBC. You can only withdraw from game balance.`,
        variant: "destructive"
      })
      return
    }

    setWithdrawStep('requesting')
    try {
      // Step 1: Request signature from backend
      toast({
        title: "Requesting Signature",
        description: "Getting authorization from server...",
      })

      const response = await fetch('/api/withdrawal/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          amount: withdrawAmount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get signature')
      }

      const { signature, nonce, finalBalance, signerAddress } = await response.json()

      console.log('🔐 Withdrawal Signature Received:', {
        signature,
        nonce,
        finalBalance,
        signerAddress,
        withdrawAmount,
      })

      setWithdrawStep('signing')
      toast({
        title: "Signature Received",
        description: "Submitting withdrawal transaction...",
      })

      // Step 2: Submit withdrawal to blockchain with signature
      const amountWei = parseUnits(withdrawAmount, 18)
      const finalBalanceWei = parseUnits(finalBalance, 18)

      console.log('📤 Submitting withdrawal to contract:', {
        contract: WITHDRAW_ADDRESS,
        player: address,
        amount: withdrawAmount + ' GBC (' + amountWei.toString() + ' wei)',
        finalBalance: finalBalance + ' GBC (' + finalBalanceWei.toString() + ' wei)',
        nonce,
        signature,
      })

      setWithdrawStep('withdrawing')
      
      // Normalize address to lowercase for contract call (must match signature)
      const normalizedAddress = address.toLowerCase() as `0x${string}`
      
      const hash = await writeContractAsync({
        address: WITHDRAW_ADDRESS,
        abi: WITHDRAW_ABI,
        functionName: 'withdraw',
        args: [
          normalizedAddress,
          amountWei,
          finalBalanceWei,
          BigInt(nonce),
          signature as `0x${string}`,
        ],
        gas: 300000n, // Explicit gas limit to prevent estimation issues
      })

      setWithdrawTxHash(hash)

      toast({
        title: "Withdrawal Submitted",
        description: "Waiting for confirmation...",
      })

      // Step 3: Wait for confirmation
      await waitForTransactionReceipt(config, { hash })

      setWithdrawStep('success')

      toast({
        title: "✅ Withdrawal Successful!",
        description: `Withdrew ${withdrawAmount} GBC to your wallet`,
      })

      // Reset and refresh both balances
      setWithdrawAmount('')
      await syncBothBalances()
      await fetchGameBalance()

      // Reset after 3 seconds
      setTimeout(() => {
        setWithdrawStep('idle')
        setWithdrawTxHash('')
      }, 3000)
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      setWithdrawStep('error')
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw tokens",
        variant: "destructive"
      })
      
      // Reset error state after 5 seconds
      setTimeout(() => {
        setWithdrawStep('idle')
      }, 5000)
    }
  }

  // Format time remaining
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  // Update cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [cooldownRemaining])

  // Initial data fetch
  useEffect(() => {
    if (address && isConnected) {
      fetchAllowance()
      fetchFaucetInfo()
      fetchGameBalance() // Fetch game balance on load
    }
  }, [address, isConnected, fetchAllowance, fetchFaucetInfo, fetchGameBalance])

  // Socket.IO real-time balance updates
  useEffect(() => {
    if (!address || !storeSocket) return

    // Listen for blockchain balance updates (wallet balance)
    const handleBlockchainUpdate = (data: any) => {
      if (data.walletAddress.toLowerCase() === address.toLowerCase()) {
        console.log(`📡 Received blockchain balance update:`, data)
        syncBothBalances() // Refresh both balances
        
        toast({
          title: `✅ ${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Confirmed!`,
          description: `${data.amount} GBC - Transaction completed`,
        })
      }
    }

    // Listen for game balance updates (off-chain/database)
    const handleGameBalanceUpdate = (data: any) => {
      if (data.walletAddress.toLowerCase() === address.toLowerCase()) {
        console.log(`🎮 Received game balance update:`, data)
        fetchGameBalance() // Refresh game balance only
      }
    }

    storeSocket.on('blockchain:balance-updated', handleBlockchainUpdate)
    storeSocket.on('game:balance-updated', handleGameBalanceUpdate)

    // Cleanup
    return () => {
      storeSocket.off('blockchain:balance-updated', handleBlockchainUpdate)
      storeSocket.off('game:balance-updated', handleGameBalanceUpdate)
    }
  }, [address, syncBothBalances, fetchGameBalance, toast])

  if (!isConnected || !address) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert className="bg-red-900/50 border-red-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to access deposit, withdraw, and faucet features.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-green-400 mb-2">GBC Store</h1>
        <p className="text-green-300">Deposit, Withdraw & Claim Free GBC Tokens</p>
      </div>

      {/* Network Warning */}
      {!isCorrectNetwork && (
        <Alert className="bg-yellow-900/50 border-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Wrong network. Please switch to Polygon Amoy Testnet to use these features.
          </AlertDescription>
        </Alert>
      )}

      {/* Balance Display - Dual Balance System */}
      <Card className="bg-black border border-green-500/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* On-chain Wallet Balance */}
            <div>
              <p className="text-xs text-blue-300/70 mb-1">💎 Wallet (On-chain)</p>
              <p className="text-2xl font-bold text-blue-400">
                {onChainGBC.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} GBC
              </p>
              <p className="text-xs text-blue-300/50 mt-1">For deposit</p>
            </div>
            
            {/* Off-chain Game Balance */}
            <div>
              <p className="text-xs text-green-300/70 mb-1">🎮 Game (Off-chain)</p>
              <p className="text-2xl font-bold text-green-400">
                {offChainGBC.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} GBC
              </p>
              <p className="text-xs text-green-300/50 mt-1">For betting</p>
            </div>
            
            {/* MATIC Balance */}
            <div>
              <p className="text-xs text-green-300/70 mb-1">MATIC for Gas</p>
              <p className="text-xl text-green-400">{walletBalance.matic} MATIC</p>
              <p className="text-xs text-green-300/50 mt-1">For transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black border border-green-500/30">
          <TabsTrigger value="deposit" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Deposit
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Withdraw
          </TabsTrigger>
          <TabsTrigger value="faucet" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            <Coins className="w-4 h-4 mr-2" />
            Faucet
          </TabsTrigger>
        </TabsList>

        {/* DEPOSIT TAB */}
        <TabsContent value="deposit">
          <Card className="bg-black border border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Deposit GBC Tokens</CardTitle>
              <CardDescription className="text-green-300">
                Transfer GBC tokens from your wallet to the game balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="depositAmount" className="text-green-400">
                  Amount (GBC)
                </Label>
                <Input
                  id="depositAmount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={depositStep === 'approving' || depositStep === 'depositing'}
                  className="bg-black/50 border-green-500/30 text-green-400 text-lg"
                />
                <p className="text-xs text-blue-300">
                  Available in wallet: {walletBalance.gbc} GBC (On-chain)
                </p>
              </div>

              {/* Transaction Progress */}
              {depositStep !== 'idle' && (
                <Alert className={`
                  ${depositStep === 'success' ? 'bg-green-900/30 border-green-700' : ''}
                  ${depositStep === 'error' ? 'bg-red-900/30 border-red-700' : ''}
                  ${['approving', 'approved', 'depositing'].includes(depositStep) ? 'bg-blue-900/30 border-blue-700' : ''}
                `}>
                  {depositStep === 'approving' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {depositStep === 'approved' && (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  )}
                  {depositStep === 'depositing' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {depositStep === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  )}
                  {depositStep === 'error' && (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  
                  <AlertDescription>
                    {depositStep === 'approving' && 'Approving tokens... Please confirm in MetaMask'}
                    {depositStep === 'approved' && 'Tokens approved! You can now deposit'}
                    {depositStep === 'depositing' && 'Depositing tokens... Please wait'}
                    {depositStep === 'success' && (
                      <div>
                        <p className="font-medium">Deposit Successful! 🎉</p>
                        {depositTxHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${depositTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
                          >
                            View on PolygonScan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                    {depositStep === 'error' && 'Transaction failed. Please try again'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleApprove}
                  disabled={
                    !isCorrectNetwork || 
                    depositStep === 'approving' || 
                    depositStep === 'depositing' ||
                    allowance > BigInt(0)
                  }
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {depositStep === 'approving' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : allowance > BigInt(0) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approved
                    </>
                  ) : (
                    'Approve Tokens'
                  )}
                </Button>

                <Button
                  onClick={handleDeposit}
                  disabled={
                    !isCorrectNetwork ||
                    !depositAmount ||
                    parseFloat(depositAmount) <= 0 ||
                    allowance === BigInt(0) ||
                    depositStep === 'approving' ||
                    depositStep === 'depositing'
                  }
                  className="bg-green-600 hover:bg-green-500 text-black font-semibold"
                >
                  {depositStep === 'depositing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="w-4 h-4 mr-2" />
                      Deposit
                    </>
                  )}
                </Button>
              </div>

              {/* Help Text */}
              <Alert className="bg-green-900/10 border-green-500/30">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs text-green-300">
                  <p className="font-medium mb-1">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Click "Approve Tokens" to allow deposits (one-time)</li>
                    <li>Enter amount and click "Deposit"</li>
                    <li>Confirm transaction in MetaMask</li>
                    <li>Wait for confirmation (~5-10 seconds)</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAW TAB */}
        <TabsContent value="withdraw">
          <Card className="bg-black border border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Withdraw GBC Tokens</CardTitle>
              <CardDescription className="text-green-300">
                Transfer GBC tokens from game balance to your wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Game Balance Display */}
              <Alert className="bg-green-900/30 border-green-700">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">🎮 Your Game Balance (Off-chain):</p>
                    <p className="text-xl text-green-400 font-bold">
                      {offChainGBC.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} GBC
                    </p>
                    <p className="text-xs text-green-300 mt-2">
                      This is your in-game balance from database. Withdraw to move funds to your wallet (on-chain).
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount" className="text-green-400">
                  Amount (GBC)
                </Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={withdrawStep === 'requesting' || withdrawStep === 'signing' || withdrawStep === 'withdrawing'}
                  className="bg-black/50 border-green-500/30 text-green-400 text-lg"
                />
                <p className="text-xs text-green-300">
                  Available in game: {gameBalance} GBC (Off-chain)
                </p>
              </div>

              {/* Transaction Progress */}
              {withdrawStep !== 'idle' && (
                <Alert className={`
                  ${withdrawStep === 'success' ? 'bg-green-900/30 border-green-700' : ''}
                  ${withdrawStep === 'error' ? 'bg-red-900/30 border-red-700' : ''}
                  ${['requesting', 'signing', 'withdrawing'].includes(withdrawStep) ? 'bg-blue-900/30 border-blue-700' : ''}
                `}>
                  {['requesting', 'signing', 'withdrawing'].includes(withdrawStep) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {withdrawStep === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  )}
                  {withdrawStep === 'error' && (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  
                  <AlertDescription>
                    {withdrawStep === 'requesting' && 'Requesting signature from server...'}
                    {withdrawStep === 'signing' && 'Signature received! Preparing transaction...'}
                    {withdrawStep === 'withdrawing' && 'Withdrawing tokens... Please confirm in MetaMask'}
                    {withdrawStep === 'success' && (
                      <div>
                        <p className="font-medium">Withdrawal Successful! 🎉</p>
                        <p className="text-xs mt-1">Your GBC has been transferred to your wallet</p>
                        {withdrawTxHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${withdrawTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
                          >
                            View on PolygonScan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                    {withdrawStep === 'error' && 'Withdrawal failed. Please try again'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Withdraw Button */}
              <Button
                onClick={handleWithdraw}
                disabled={
                  !isCorrectNetwork ||
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  parseFloat(withdrawAmount) > offChainGBC ||
                  withdrawStep === 'requesting' ||
                  withdrawStep === 'signing' ||
                  withdrawStep === 'withdrawing'
                }
                className="w-full bg-green-600 hover:bg-green-500 text-black font-semibold h-12"
              >
                {withdrawStep === 'requesting' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Requesting Signature...
                  </>
                ) : withdrawStep === 'signing' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing Transaction...
                  </>
                ) : withdrawStep === 'withdrawing' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Withdraw to Wallet
                  </>
                )}
              </Button>

              {/* Help Text */}
              <Alert className="bg-green-900/10 border-green-500/30">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs text-green-300">
                  <p className="font-medium mb-1">How withdrawal works:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Enter amount to withdraw from game balance</li>
                    <li>Backend generates authorized signature</li>
                    <li>Confirm withdrawal transaction in MetaMask</li>
                    <li>GBC tokens transferred to your wallet</li>
                  </ol>
                  <p className="mt-2 text-yellow-400">
                    💡 Tip: Make sure you have enough MATIC for gas fees
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAUCET TAB */}
        <TabsContent value="faucet">
          <Card className="bg-black border border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Free GBC Faucet</CardTitle>
              <CardDescription className="text-green-300">
                New players can claim free GBC tokens to start playing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Faucet Info */}
              <Card className="bg-green-900/10 border-green-500/30">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-green-300 mb-2">Welcome Bonus</p>
                  <p className="text-3xl font-bold text-green-400">{faucetAmount} GBC</p>
                  <p className="text-xs text-green-300 mt-2">One-time claim per wallet</p>
                </CardContent>
              </Card>

              {/* Claim Button */}
              <Button
                onClick={handleFaucetClaim}
                disabled={!isCorrectNetwork || cooldownRemaining > 0 || isClaiming}
                className="w-full bg-green-600 hover:bg-green-500 text-black font-semibold h-14 text-lg"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : cooldownRemaining > 0 ? (
                  <>Already Claimed</>
                ) : (
                  <>
                    <Coins className="w-5 h-5 mr-2" />
                    Claim {faucetAmount} GBC Free
                  </>
                )}
              </Button>

              {/* Info */}
              <Alert className="bg-blue-900/30 border-blue-700">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm text-green-300">
                  <p className="font-medium mb-2">Faucet Rules:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>One-time claim of {faucetAmount} GBC per wallet address</li>
                    <li>Testnet tokens only (no real value)</li>
                    <li>Use for testing and playing games</li>
                    <li>Each wallet can only claim once</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}