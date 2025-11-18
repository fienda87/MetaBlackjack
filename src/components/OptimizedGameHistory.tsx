'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

interface Session {
  id: string
  date: string
  hands: number
  totalBet: number
  result: number
  duration: string
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

// Memoized statistics component
const GameStats = ({ games }: { games: Game[] }) => {
  const stats = useMemo(() => {
    const totalHands = games.length
    const totalBet = games.reduce((sum, game) => sum + game.betAmount, 0)
    const totalResult = games.reduce((sum, game) => sum + game.winAmount - game.betAmount, 0)
    const wins = games.filter(g => g.result === 'win' || g.result === 'blackjack').length
    const winRate = totalHands > 0 ? (wins / totalHands) * 100 : 0
    const blackjacks = games.filter(g => g.isBlackjack).length

    return {
      totalHands,
      totalBet,
      totalResult,
      winRate,
      blackjacks
    }
  }, [games])

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-green-600">Total Hands</p>
              <p className="text-xl font-bold text-green-400">{stats.totalHands.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-green-600">Win Rate</p>
              <p className="text-xl font-bold text-green-400">{stats.winRate.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-green-600">Total Bet</p>
              <p className="text-xl font-bold text-green-400">{stats.totalBet.toLocaleString()} GBC</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {stats.totalResult >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-xs text-green-600">Net Profit</p>
              <span className={`text-xl font-bold ${getResultColor(stats.totalResult >= 0 ? 'win' : 'lose')}`}>
                {formatGBC(stats.totalResult)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border-green-900/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-green-600">Blackjacks</p>
              <p className="text-xl font-bold text-green-400">{stats.blackjacks}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Memoized game row component
const GameRow = ({ game }: { game: Game }) => (
  <tr className="border-b border-green-900/20 hover:bg-green-900/10 transition-colors">
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
)

// Memoized pagination component
const Pagination = ({ pagination, onPageChange }: { 
  pagination: Pagination
  onPageChange: (page: number) => void 
}) => (
  <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-900/30">
    <div className="text-sm text-green-600">
      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} games
    </div>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="border-green-600 text-green-400 hover:bg-green-900/20"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-green-400 px-3">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.totalPages}
        className="border-green-600 text-green-400 hover:bg-green-900/20"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
)

export default function GameHistory() {
  const [games, setGames] = useState<Game[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [resultFilter, setResultFilter] = useState('all')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      const response = await fetch(`/api/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setGames(data.games)
        setSessions(data.sessions)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Memoized filtered games
  const filteredGames = useMemo(() => {
    if (resultFilter === 'all') return games
    return games.filter(game => game.result === resultFilter)
  }, [games, resultFilter])

  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchHistory(newPage)
  }, [fetchHistory])

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <GameStats games={filteredGames} />

      <Card className="bg-black border-green-900/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-green-400 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Game History
              <Badge variant="outline" className="ml-2 text-green-400 border-green-600">
                {filteredGames.length} games
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-green-600" />
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-32 bg-black/50 border-green-600 text-green-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-green-600">
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
                <thead className="sticky top-0 bg-black border-b border-green-900/30">
                  <tr>
                    <th className="text-left p-3 text-green-600 font-semibold">Date</th>
                    <th className="text-left p-3 text-green-600 font-semibold">Time</th>
                    <th className="text-left p-3 text-green-600 font-semibold">Bet</th>
                    <th className="text-left p-3 text-green-600 font-semibold">Result</th>
                    <th className="text-left p-3 text-green-600 font-semibold">Net</th>
                    <th className="text-left p-3 text-green-600 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game) => (
                    <GameRow key={game.id} game={game} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {pagination.totalPages > 1 && (
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
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