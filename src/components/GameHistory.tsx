'use client'

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Coins,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { RootState } from '@/application/providers/store'
import { formatGameResult, formatGBC, getResultColor, getResultBadgeClass } from '@/lib/ui-helpers'

interface Game {
  id: string
  date: string
  time: string
  betAmount: number
  result: string
  winAmount: number
  playerValue: number
  dealerValue: number
  isBlackjack: boolean
  isBust: boolean
  sessionId: string
  sessionDate: string
}

interface OverallStats {
  totalHands: number
  totalBet: number
  totalWin: number
  netProfit: number
  winRate: number
  blackjacks: number
  busts: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function GameHistory() {
  const { user } = useSelector((state: RootState) => state.wallet)
  const [games, setGames] = useState<Game[]>([])
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null)
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [resultFilter, setResultFilter] = useState('all')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const fetchHistory = async (page = 1, filter = 'all') => {
    if (!user) return
    
    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: page.toString(),
        limit: '20',
        resultFilter: filter
      })
      
      const response = await fetch(`/api/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setGames(data.games)
        setOverallStats(data.overallStats)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchHistory(1, resultFilter)
    }
  }, [user, resultFilter])

  useEffect(() => {
    let filtered = [...games]
    
    if (resultFilter !== 'all') {
      filtered = filtered.filter(game => game.result.toLowerCase() === resultFilter.toLowerCase())
    }
    
    setFilteredGames(filtered)
  }, [games, resultFilter])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchHistory(newPage, resultFilter)
  }

  const handleFilterChange = (newFilter: string) => {
    setResultFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchHistory(1, newFilter)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-8">
          <p className="text-green-400">Loading game history...</p>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-8">
          <p className="text-green-400">No game history yet. Start playing to see your statistics!</p>
        </div>
      </div>
    )
  }

  const displayStats = overallStats || {
    totalHands: filteredGames.length,
    totalBet: filteredGames.reduce((sum, game) => sum + game.betAmount, 0),
    totalWin: filteredGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK')
      .reduce((sum, game) => sum + (game.winAmount || 0), 0),
    netProfit: filteredGames.reduce((sum, game) => sum + ((game as any).netProfit || 0), 0),
    winRate: filteredGames.length > 0 ? 
      (filteredGames.filter(g => g.result === 'WIN' || g.result === 'BLACKJACK').length / filteredGames.length) * 100 : 0,
    blackjacks: filteredGames.filter(g => g.isBlackjack).length,
    busts: filteredGames.filter(g => g.isBust).length
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-black border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-green-300">Total Hands</p>
                <p className="text-xl font-bold text-green-400">{displayStats.totalHands.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-green-300">Win Rate</p>
                <p className="text-xl font-bold text-green-400">{displayStats.winRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-green-300">Total Bet</p>
                <p className="text-xl font-bold text-green-400">{displayStats.totalBet.toLocaleString()} GBC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {displayStats.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className="text-xs text-green-300">Net Profit</p>
                <span className={`text-xl font-bold ${getResultColor(displayStats.netProfit >= 0 ? 'win' : 'lose')}`}>
                  {formatGBC(displayStats.netProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-green-300">Blackjacks</p>
                <p className="text-xl font-bold text-green-400">{displayStats.blackjacks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game History */}
      <Card className="bg-black border border-green-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-green-400 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Game History
              <Badge variant="outline" className="ml-2 text-green-400 border-green-500/50">
                {filteredGames.length} games
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-green-300" />
              <Select value={resultFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-32 bg-black/50 border-green-500/30 text-green-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-green-500/30">
                  <SelectItem value="all" className="text-green-400">All</SelectItem>
                  <SelectItem value="win" className="text-green-400">Win</SelectItem>
                  <SelectItem value="lose" className="text-green-400">Lose</SelectItem>
                  <SelectItem value="push" className="text-green-400">Push</SelectItem>
                  <SelectItem value="blackjack" className="text-green-400">Blackjack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <table className="w-full">
                <thead className="sticky top-0 bg-black border-b border-green-500/30">
                  <tr>
                    <th className="text-left p-3 text-green-300 font-semibold">Date</th>
                    <th className="text-left p-3 text-green-300 font-semibold">Time</th>
                    <th className="text-left p-3 text-green-300 font-semibold">Bet</th>
                    <th className="text-left p-3 text-green-300 font-semibold">Result</th>
                    <th className="text-left p-3 text-green-300 font-semibold">Net</th>
                    <th className="text-left p-3 text-green-300 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game) => (
                    <tr 
                      key={game.id} 
                      className="border-b border-green-500/20 hover:bg-black/50 transition-colors"
                    >
                      <td className="p-3 text-green-400">{game.date}</td>
                      <td className="p-3 text-green-400">{game.time}</td>
                      <td className="p-3 text-green-400">{game.betAmount.toLocaleString()} GBC</td>
                      <td className="p-3">
                        <Badge className={getResultBadgeClass(game.result)}>
                          {formatGameResult(game.result)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className={getResultColor(game.result)}>
                          {formatGBC(game.winAmount - game.betAmount)}
                        </span>
                      </td>
                      <td className="p-3 text-green-400">
                        {game.playerValue} vs {game.dealerValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-500/30">
              <div className="text-sm text-green-300">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} games
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="border-green-500/50 text-green-400 hover:bg-black/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-green-400 px-3">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="border-green-500/50 text-green-400 hover:bg-black/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.5);
        }
      `}</style>
    </div>
  )
}