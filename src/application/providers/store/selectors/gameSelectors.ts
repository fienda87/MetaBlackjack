import { createSelector } from 'reselect'
import { RootState } from '../index'

const selectGameSlice = (state: RootState) => state.game

export const selectCurrentGame = createSelector(
  [selectGameSlice],
  (gameState) => gameState.currentGame
)

export const selectGameBalance = createSelector(
  [selectGameSlice],
  (gameState) => gameState.balance
)

export const selectGameLoading = createSelector(
  [selectGameSlice],
  (gameState) => gameState.isLoading
)

export const selectGameError = createSelector(
  [selectGameSlice],
  (gameState) => gameState.error
)

export const selectPlayerHand = createSelector(
  [selectCurrentGame],
  (game) => game?.playerHand || null
)

export const selectDealerHand = createSelector(
  [selectCurrentGame],
  (game) => game?.dealerHand || null
)

export const selectCurrentGameState = createSelector(
  [selectCurrentGame],
  (game) => game?.state || null
)

export const selectCurrentBet = createSelector(
  [selectCurrentGame],
  (game) => game?.currentBet || 0
)

export const selectGameResult = createSelector(
  [selectCurrentGame],
  (game) => game?.result || null
)

export const selectNetProfit = createSelector(
  [selectCurrentGame],
  (game) => game?.netProfit || 0
)

export const selectGameHistory = createSelector(
  [selectGameSlice],
  (gameState) => gameState.gameHistory
)

export const selectRecentGames = createSelector(
  [selectGameHistory],
  (history) => history.slice(0, 10)
)

export const selectGameStats = createSelector(
  [selectGameHistory],
  (history) => {
    if (history.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        winRate: 0,
        totalProfit: 0
      }
    }

    const stats = history.reduce((acc, game) => {
      acc.totalGames++
      const result = game.result?.toUpperCase()
      if (result === 'WIN' || result === 'BLACKJACK' || result === 'SPLIT_WIN' || result === 'BONUS_WIN') {
        acc.wins++
      } else if (result === 'LOSE' || result === 'SPLIT_LOSE' || result === 'SURRENDER') {
        acc.losses++
      } else if (result === 'PUSH' || result === 'SPLIT_PUSH') {
        acc.pushes++
      }
      acc.totalProfit += game.netProfit || 0
      return acc
    }, {
      totalGames: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalProfit: 0
    })

    return {
      ...stats,
      winRate: stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0
    }
  }
)

export const selectCanHit = createSelector(
  [selectCurrentGame, selectGameLoading],
  (game, isLoading) => {
    if (!game || isLoading || game.state !== 'PLAYING') return false
    const playerHand = game.playerHand as any
    return !playerHand?.isBust && playerHand?.value < 21
  }
)

export const selectCanStand = createSelector(
  [selectCurrentGame, selectGameLoading],
  (game, isLoading) => {
    if (!game || isLoading || game.state !== 'PLAYING') return false
    return true
  }
)

export const selectCanDoubleDown = createSelector(
  [selectCurrentGame, selectGameLoading, selectGameBalance],
  (game, isLoading, balance) => {
    if (!game || isLoading || game.state !== 'PLAYING') return false
    const playerHand = game.playerHand as any
    const hasExactlyTwoCards = playerHand?.cards?.length === 2
    const hasEnoughBalance = balance >= (game.currentBet || 0)
    return hasExactlyTwoCards && hasEnoughBalance
  }
)
