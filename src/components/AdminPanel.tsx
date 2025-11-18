'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Config {
  STARTING_BALANCE: number
  MIN_BET: number
  MAX_BET: number
  DAILY_BONUS: number
}

interface User {
  id: string
  username: string
  email: string
  balance: number
  startingBalance: number
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  stats: {
    totalGames: number
    totalSessions: number
    totalTransactions: number
  }
}

export default function AdminPanel() {
  const [config, setConfig] = useState<Config>({
    STARTING_BALANCE: 1000,
    MIN_BET: 0.01,
    MAX_BET: 10,
    DAILY_BONUS: 10
  })
  
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load configuration
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/config')
      const data = await response.json()
      if (data.success) {
        setConfig(data.configs)
      }
    } catch (error) {
      setError('Failed to load configuration')
    }
  }

  // Load users
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      setError('Failed to load users')
    }
  }

  useEffect(() => {
    loadConfig()
    loadUsers()
  }, [])

  // Update configuration
  const updateConfig = async () => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      const data = await response.json()
      if (data.success) {
        setMessage('Configuration updated successfully!')
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Failed to update configuration')
    } finally {
      setIsLoading(false)
    }
  }

  // Update user balance
  const updateUserBalance = async (userId: string, amount: number, type: string) => {
    try {
      const response = await fetch(`/api/user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          type,
          description: `Admin ${type.replace('_', ' ')} - ${amount} GBC`
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`User balance updated: ${data.newBalance} GBC`)
        loadUsers() // Refresh users list
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Failed to update user balance')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎰 BlackJack Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage game configuration and user accounts</p>
        </div>

        {message && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-700">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Game Configuration</CardTitle>
                <CardDescription>
                  Configure game settings and starting balance for new users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="starting-balance">Starting Balance (GBC)</Label>
                    <Input
                      id="starting-balance"
                      type="number"
                      value={config.STARTING_BALANCE}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        STARTING_BALANCE: parseFloat(e.target.value) || 0 
                      }))}
                      min="0"
                      max="10000"
                      step="100"
                    />
                    <p className="text-sm text-gray-500">
                      New users will receive this amount when they register
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-bet">Minimum Bet (GBC)</Label>
                    <Input
                      id="min-bet"
                      type="number"
                      value={config.MIN_BET}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        MIN_BET: parseFloat(e.target.value) || 0 
                      }))}
                      min="0.01"
                      max="100"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500">
                      Minimum bet amount per game
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-bet">Maximum Bet (GBC)</Label>
                    <Input
                      id="max-bet"
                      type="number"
                      value={config.MAX_BET}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        MAX_BET: parseFloat(e.target.value) || 0 
                      }))}
                      min="0.01"
                      max="1000"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500">
                      Maximum bet amount per game
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="daily-bonus">Daily Bonus (GBC)</Label>
                    <Input
                      id="daily-bonus"
                      type="number"
                      value={config.DAILY_BONUS}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        DAILY_BONUS: parseFloat(e.target.value) || 0 
                      }))}
                      min="0"
                      max="1000"
                      step="1"
                    />
                    <p className="text-sm text-gray-500">
                      Daily login bonus for users
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Current Settings Impact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">New User Bonus:</span>
                      <Badge variant="secondary" className="ml-2">
                        {config.STARTING_BALANCE} GBC
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Betting Range:</span>
                      <Badge variant="secondary" className="ml-2">
                        {config.MIN_BET} - {config.MAX_BET} GBC
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={updateConfig}
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Updating...' : 'Update Configuration'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage user accounts and balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{user.username}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {user.balance.toLocaleString()} GBC
                          </div>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Starting:</span>
                          <div className="font-medium">{user.startingBalance} GBC</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Games:</span>
                          <div className="font-medium">{user.stats.totalGames}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Sessions:</span>
                          <div className="font-medium">{user.stats.totalSessions}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Joined:</span>
                          <div className="font-medium">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserBalance(user.id, 100, 'ADMIN_BONUS')}
                        >
                          +100 GBC
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserBalance(user.id, 500, 'ADMIN_BONUS')}
                        >
                          +500 GBC
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserBalance(user.id, 1000, 'ADMIN_BONUS')}
                        >
                          +1000 GBC
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateUserBalance(user.id, 100, 'ADMIN_DEDUCTION')}
                        >
                          -100 GBC
                        </Button>
                      </div>
                    </div>
                  ))}

                  {users.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No users found. Users will appear here after they register.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}