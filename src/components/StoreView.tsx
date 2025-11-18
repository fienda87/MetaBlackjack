'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUpDown, TrendingUp, TrendingDown, Wallet, History, RefreshCw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface CryptoPrice {
  symbol: string
  name: string
  icon: string
  priceGBC: number
  priceUSD: number
  change24h: number
  volume24h: number
}

interface PriceResponse {
  prices: CryptoPrice[]
  lastUpdated: string
  source: 'live' | 'cached'
}

interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  fromCurrency?: string
  toCurrency?: string
  rate?: number
  status: string
  description: string
  createdAt: string
}

interface WalletData {
  id: string
  currency: string
  balance: number
  address?: string
}

interface User {
  id: string
  balance: number
  wallets: WalletData[]
  transactions: Transaction[]
}

interface StoreViewProps {
  onNavigateToGame?: () => void
}

export default function StoreView({ onNavigateToGame }: StoreViewProps = {}) {
  const [prices, setPrices] = useState<CryptoPrice[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedFrom, setSelectedFrom] = useState('GBC')
  const [selectedTo, setSelectedTo] = useState('BTC')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [priceSource, setPriceSource] = useState<'live' | 'cached'>('cached')

  // Fetch crypto prices
  const fetchPrices = async () => {
    try {
      const response = await fetch('/api/store/prices')
      if (response.ok) {
        const data: PriceResponse = await response.json()
        setPrices(data.prices)
        setLastUpdated(new Date(data.lastUpdated))
        setPriceSource(data.source)
      }
    } catch (error) {
      console.error('Error fetching prices:', error)
      toast({
        title: "Error",
        description: "Failed to fetch crypto prices",
        variant: "destructive"
      })
    }
  }

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/store/purchase')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  // Handle purchase/conversion
  const handlePurchase = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      })
      return
    }

    if (selectedFrom === selectedTo) {
      toast({
        title: "Invalid Conversion",
        description: "Cannot convert to the same currency",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromCurrency: selectedFrom,
          toCurrency: selectedTo,
          amount: parseFloat(amount)
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Transaction Successful",
          description: `Converted ${amount} ${selectedFrom} to ${data.conversionDetails.toAmount.toFixed(6)} ${selectedTo}`
        })
        setUser(data.user)
        setAmount('')
        await fetchPrices()
      } else {
        toast({
          title: "Transaction Failed",
          description: data.error || "Failed to process transaction",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error processing purchase:', error)
      toast({
        title: "Error",
        description: "Failed to process transaction",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate conversion result
  const calculateConversion = () => {
    if (!amount || parseFloat(amount) <= 0) return 0

    const fromPrice = prices.find(p => p.symbol === selectedFrom)
    const toPrice = prices.find(p => p.symbol === selectedTo)

    if (!fromPrice || !toPrice) return 0

    let result: number
    if (selectedFrom === 'GBC') {
      result = (parseFloat(amount) * fromPrice.priceUSD) / toPrice.priceUSD
    } else if (selectedTo === 'GBC') {
      result = (parseFloat(amount) * fromPrice.priceGBC) / toPrice.priceGBC
    } else {
      result = (parseFloat(amount) * fromPrice.priceGBC) / toPrice.priceGBC
    }

    return result
  }

  // API calls with proper lifecycle management
  useEffect(() => {
    // Start API calls when component mounts
    fetchPrices()
    fetchUserData()

    // Set up interval for price updates (only when page is active)
    const interval = setInterval(() => {
      fetchPrices()
    }, 60000) // Refresh every minute

    // Cleanup function - stop API calls when component unmounts
    return () => {
      clearInterval(interval)
    }
  }, []) // Empty dependency array - only run once on mount

  const formatNumber = (num: number, decimals: number = 6) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    }).format(num)
  }

  const formatCurrency = (num: number, currency: string) => {
    if (currency === 'GBC') {
      return `${formatNumber(num, 2)} GBC`
    } else if (currency === 'USDT') {
      return `$${formatNumber(num, 2)}`
    } else {
      return `${formatNumber(num, 6)} ${currency}`
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-400 mb-2">Gobocoin Store</h1>
          <p className="text-green-300">Trade GBC with major cryptocurrencies</p>
          {lastUpdated && (
            <div className="flex items-center gap-2 mt-2 text-sm text-green-300">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <Badge 
                variant={priceSource === 'live' ? 'default' : 'secondary'}
                className={`text-xs ${
                  priceSource === 'live' 
                    ? 'bg-green-500 text-black' 
                    : 'bg-yellow-600 text-black'
                }`}
              >
                {priceSource === 'live' ? '🔴 Live' : '📡 Cached'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPrices}
                className="h-6 w-6 p-0 text-green-300 hover:text-green-400"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* User Balance */}
        {user && (
          <Card className="mb-6 bg-black border border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <span className="text-lg font-semibold text-green-400">GBC Balance</span>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-500/50 text-lg px-3 py-1">
                  {formatNumber(user.balance, 2)} GBC
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trading Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-black border border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5" />
                  Exchange
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* From Currency */}
                <div className="space-y-2">
                  <Label htmlFor="from" className="text-green-400">From</Label>
                  <div className="flex gap-2">
                    <Select value={selectedFrom} onValueChange={setSelectedFrom}>
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-green-500/30">
                        <SelectItem value="GBC" className="text-green-400">GBC (Gobocoin)</SelectItem>
                        {prices.map((crypto) => (
                          <SelectItem key={crypto.symbol} value={crypto.symbol} className="text-green-400">
                            {crypto.icon} {crypto.symbol} - {crypto.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="from"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-black/50 border-green-500/30 text-green-400 placeholder-green-500/50"
                    />
                  </div>
                </div>

                {/* To Currency */}
                <div className="space-y-2">
                  <Label htmlFor="to" className="text-green-400">To</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTo} onValueChange={setSelectedTo}>
                      <SelectTrigger className="bg-black/50 border-green-500/30 text-green-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-green-500/30">
                        <SelectItem value="GBC" className="text-green-400">GBC (Gobocoin)</SelectItem>
                        {prices.map((crypto) => (
                          <SelectItem key={crypto.symbol} value={crypto.symbol} className="text-green-400">
                            {crypto.icon} {crypto.symbol} - {crypto.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="to"
                      type="number"
                      placeholder="0.00"
                      value={calculateConversion() ? formatNumber(calculateConversion()) : ''}
                      readOnly
                      className="bg-black/50 border-green-500/30 text-green-400 placeholder-green-500/50"
                    />
                  </div>
                </div>

                {/* Conversion Info */}
                {amount && calculateConversion() > 0 && (
                  <div className="p-3 bg-black/50 rounded-lg border border-green-500/30">
                    <div className="text-sm text-green-400">
                      You will receive approximately {formatNumber(calculateConversion())} {selectedTo}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={handlePurchase}
                  disabled={isLoading || !amount || parseFloat(amount) <= 0}
                  className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Convert Now'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <Card className="bg-black border border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400">About GBC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-green-300">
                  <p className="mb-2"><strong>GBC (Gobocoin)</strong> is our gaming cryptocurrency.</p>
                  <ul className="space-y-1 text-xs">
                    <li>• 1 GBC = $0.01 USD</li>
                    <li>• Instant deposits</li>
                    <li>• No transaction fees</li>
                    <li>• Convertible to major crypto</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {user && (
              <Card className="bg-black border-green-900/30">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-2 bg-green-900/10 rounded">
                        <div>
                          <p className="text-sm text-green-400">{transaction.description}</p>
                          <p className="text-xs text-green-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    ))}
                    {user.transactions.length === 0 && (
                      <p className="text-sm text-green-600">No transactions yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}