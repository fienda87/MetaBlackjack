import { Game, GameResult, GameMove } from '@/domain/entities/Game'
import { IGameRepository } from '@/domain/repositories/GameRepository'
import { db } from '@/lib/db'
import { GameEngine } from '@/domain/usecases/GameEngine'

export class PrismaGameRepository implements IGameRepository {
  async createGame(gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const dbGame = await db.game.create({
      data: {
        playerId: gameData.playerId,
        betAmount: gameData.betAmount,
        insuranceBet: gameData.insuranceBet,
        currentBet: gameData.currentBet,
        state: this.mapGameStateToDb(gameData.state),
        playerHand: gameData.playerHand as any,
        dealerHand: gameData.dealerHand as any,
        deck: gameData.deck as any,
        gameStats: gameData.gameStats as any,
      }
    })

    return this.mapDbGameToGame(dbGame)
  }

  async getGame(gameId: string): Promise<Game | null> {
    const dbGame = await db.game.findUnique({
      where: { id: gameId },
      include: {
        moves: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    return dbGame ? this.mapDbGameToGame(dbGame) : null
  }

  async updateGame(gameId: string, updates: Partial<Game>): Promise<Game> {
    const dbGame = await db.game.update({
      where: { id: gameId },
      data: {
        ...(updates.betAmount !== undefined && { betAmount: updates.betAmount }),
        ...(updates.insuranceBet !== undefined && { insuranceBet: updates.insuranceBet }),
        ...(updates.currentBet !== undefined && { currentBet: updates.currentBet }),
        ...(updates.state !== undefined && { state: this.mapGameStateToDb(updates.state) }),
        ...(updates.playerHand !== undefined && { playerHand: updates.playerHand as any }),
        ...(updates.dealerHand !== undefined && { dealerHand: updates.dealerHand as any }),
        ...(updates.deck !== undefined && { deck: updates.deck as any }),
        ...(updates.gameStats !== undefined && { gameStats: updates.gameStats as any }),
        ...(updates.result !== undefined && { 
          result: typeof updates.result === 'string' ? updates.result : this.mapGameResultToDb(updates.result.result),
          winAmount: updates.winAmount,
          insuranceWin: updates.insuranceWin,
          netProfit: updates.netProfit,
          endedAt: new Date()
        }),
        updatedAt: new Date()
      }
    })

    return this.mapDbGameToGame(dbGame)
  }

  async deleteGame(gameId: string): Promise<void> {
    await db.game.delete({
      where: { id: gameId }
    })
  }

  async getPlayerGames(playerId: string, limit = 50): Promise<Game[]> {
    const dbGames = await db.game.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        moves: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    return dbGames.map(game => this.mapDbGameToGame(game))
  }

  async saveGameResult(gameId: string, result: GameResult): Promise<void> {
    await db.game.update({
      where: { id: gameId },
      data: {
        result: this.mapGameResultToDb(result.result),
        winAmount: result.winAmount,
        insuranceWin: result.insuranceWin,
        netProfit: result.netProfit,
        endedAt: new Date(),
        state: 'ENDED'
      }
    })
  }

  async validateMove(gameId: string, move: GameMove): Promise<boolean> {
    const game = await this.getGame(gameId)
    if (!game) return false

    // Basic validation logic (same as in-memory implementation)
    switch (move.type) {
      case 'HIT':
        return game.state === 'PLAYING' && !game.playerHand.isBust
      case 'STAND':
        return game.state === 'PLAYING'
      case 'DOUBLE_DOWN':
        return game.state === 'PLAYING' && 
               game.playerHand.cards.length === 2
      case 'DEAL':
        return game.state === 'BETTING' && game.betAmount > 0
      default:
        return false
    }
  }

  async createGameMove(gameId: string, move: GameMove): Promise<void> {
    await db.gameMove.create({
      data: {
        gameId,
        moveType: this.mapMoveTypeToDb(move.type),
        payload: move.payload
      }
    })
  }

  async getPlayerStats(playerId: string): Promise<{
    totalGames: number
    wins: number
    losses: number
    pushes: number
    blackjacks: number
    totalBet: number
    totalWin: number
    netProfit: number
  }> {
    const stats = await db.game.groupBy({
      by: ['result'],
      where: { playerId },
      _count: { id: true },
      _sum: {
        betAmount: true,
        winAmount: true,
        netProfit: true
      }
    })

    const totalGames = stats.reduce((sum, stat) => sum + stat._count.id, 0)
    const wins = stats.find(s => s.result === 'WIN')?._count.id || 0
    const losses = stats.find(s => s.result === 'LOSE')?._count.id || 0
    const pushes = stats.find(s => s.result === 'PUSH')?._count.id || 0
    const blackjacks = stats.find(s => s.result === 'BLACKJACK')?._count.id || 0
    const totalBet = stats.reduce((sum, stat) => sum + (stat._sum.betAmount || 0), 0)
    const totalWin = stats.reduce((sum, stat) => sum + (stat._sum.winAmount || 0), 0)
    const netProfit = stats.reduce((sum, stat) => sum + (stat._sum.netProfit || 0), 0)

    return {
      totalGames,
      wins,
      losses,
      pushes,
      blackjacks,
      totalBet,
      totalWin,
      netProfit
    }
  }

  // Helper mapping functions
  private mapGameStateToDb(state: Game['state']): any {
    const stateMap: Record<string, string> = {
      'BETTING': 'BETTING',
      'PLAYING': 'PLAYING',
      'DEALER': 'DEALER',
      'ENDED': 'ENDED',
      'INSURANCE': 'INSURANCE',
      'SPLIT_PLAYING': 'SPLIT_PLAYING',
      'SURRENDERED': 'SURRENDERED'
    }
    return stateMap[state] || 'BETTING'
  }

  private mapGameResultToDb(result: GameResult['result']): any {
    const resultMap: Record<string, string> = {
      'WIN': 'WIN',
      'LOSE': 'LOSE',
      'PUSH': 'PUSH',
      'BLACKJACK': 'BLACKJACK',
      'BONUS_WIN': 'BONUS_WIN',
      'SURRENDER': 'SURRENDER',
      'SPLIT_WIN': 'SPLIT_WIN',
      'SPLIT_LOSE': 'SPLIT_LOSE',
      'SPLIT_PUSH': 'SPLIT_PUSH'
    }
    return resultMap[result] || null
  }

  private mapMoveTypeToDb(moveType: GameMove['type']): any {
    const moveMap: Record<string, string> = {
      'HIT': 'HIT',
      'STAND': 'STAND',
      'DOUBLE_DOWN': 'DOUBLE_DOWN',
      'DEAL': 'DEAL',
      'INSURANCE_ACCEPT': 'INSURANCE_ACCEPT',
      'INSURANCE_DECLINE': 'INSURANCE_DECLINE',
      'SPLIT': 'SPLIT',
      'SURRENDER': 'SURRENDER'
    }
    return moveMap[moveType] || 'HIT'
  }

  private mapDbGameToGame(dbGame: any): Game {
    return {
      id: dbGame.id,
      playerId: dbGame.playerId,
      state: this.mapDbStateToGame(dbGame.state),
      playerHand: dbGame.playerHand,
      dealerHand: dbGame.dealerHand,
      betAmount: dbGame.betAmount,
      insuranceBet: dbGame.insuranceBet,
      currentBet: dbGame.currentBet,
      deck: dbGame.deck,
      gameStats: dbGame.gameStats,
      createdAt: dbGame.createdAt,
      updatedAt: dbGame.updatedAt,
      result: dbGame.result as any,
      winAmount: dbGame.winAmount || undefined,
      insuranceWin: dbGame.insuranceWin || undefined,
      netProfit: dbGame.netProfit || undefined
    }
  }

  private mapDbStateToGame(state: any): Game['state'] {
    const stateMap: Record<string, Game['state']> = {
      'BETTING': 'BETTING',
      'PLAYING': 'PLAYING',
      'DEALER': 'DEALER',
      'ENDED': 'ENDED',
      'INSURANCE': 'INSURANCE',
      'SPLIT_PLAYING': 'SPLIT_PLAYING',
      'SURRENDERED': 'SURRENDERED'
    }
    return stateMap[state] || 'BETTING'
  }

  private mapDbResultToGame(result: any): GameResult['result'] {
    const resultMap: Record<string, GameResult['result']> = {
      'WIN': 'WIN',
      'LOSE': 'LOSE',
      'PUSH': 'PUSH',
      'BLACKJACK': 'BLACKJACK',
      'BONUS_WIN': 'BONUS_WIN',
      'SURRENDER': 'SURRENDER',
      'SPLIT_WIN': 'SPLIT_WIN',
      'SPLIT_LOSE': 'SPLIT_LOSE',
      'SPLIT_PUSH': 'SPLIT_PUSH'
    }
    return resultMap[result] || 'PUSH'
  }
}