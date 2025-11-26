'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Coins,
  BarChart3
} from 'lucide-react'
import { formatGBC, getResultColor } from '@/lib/ui-helpers'

interface OverallStats {
  totalHands: number
  totalBet: number
  totalWin: number
  netProfit: number
  winRate: number
  blackjacks: number
  busts: number
}

interface Props {
  stats: OverallStats
}

export default function GameHistoryStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card className="bg-black border border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-green-300">Total Hands</p>
              <p className="text-xl font-bold text-green-400">{stats.totalHands.toLocaleString()}</p>
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
              <p className="text-xl font-bold text-green-400">{stats.winRate.toFixed(1)}%</p>
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
              <p className="text-xl font-bold text-green-400">{stats.totalBet.toLocaleString()} GBC</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {stats.netProfit >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-xs text-green-300">Net Profit</p>
              <span className={`text-xl font-bold ${getResultColor(stats.netProfit >= 0 ? 'win' : 'lose')}`}>
                {formatGBC(stats.netProfit)}
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
              <p className="text-xl font-bold text-green-400">{stats.blackjacks}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
