import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/application/store'

interface GameStats {
  wins: number
  losses: number
  pushes: number
  blackjacks: number
}

export const useGameStats = () => {
  const { gameHistory } = useSelector((state: RootState) => state.game)
  const [stats, setStats] = useState<GameStats>({
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0
  })

  useEffect(() => {
    const newStats = gameHistory.reduce((acc, game) => {
      const result = game.result.toLowerCase()
      
      if (result === 'win') {
        acc.wins++
      } else if (result === 'lose') {
        acc.losses++
      } else if (result === 'push') {
        acc.pushes++
      } else if (result === 'blackjack') {
        acc.blackjacks++
        acc.wins++ // Blackjack is also a win
      }
      
      return acc
    }, { wins: 0, losses: 0, pushes: 0, blackjacks: 0 } as GameStats)

    setStats(newStats)
  }, [gameHistory])

  return stats
}