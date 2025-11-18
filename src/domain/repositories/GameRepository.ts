import { Game, GameResult, GameMove } from '../entities/Game'

export interface IGameRepository {
  // Game CRUD operations
  createGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game>
  getGame(gameId: string): Promise<Game | null>
  updateGame(gameId: string, updates: Partial<Game>): Promise<Game>
  deleteGame(gameId: string): Promise<void>
  
  // Game history
  getPlayerGames(playerId: string, limit?: number): Promise<Game[]>
  saveGameResult(gameId: string, result: GameResult): Promise<void>
  
  // Game state validation
  validateMove(gameId: string, move: GameMove): Promise<boolean>
}

export class GameRepository implements IGameRepository {
  // In-memory implementation for now, can be swapped with database later
  private games: Map<string, Game> = new Map()
  private gameHistory: Game[] = []

  async createGame(gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const game: Game = {
      ...gameData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.games.set(game.id, game)
    return game
  }

  async getGame(gameId: string): Promise<Game | null> {
    return this.games.get(gameId) || null
  }

  async updateGame(gameId: string, updates: Partial<Game>): Promise<Game> {
    const game = this.games.get(gameId)
    if (!game) {
      throw new Error(`Game ${gameId} not found`)
    }
    
    const updatedGame = {
      ...game,
      ...updates,
      updatedAt: new Date()
    }
    
    this.games.set(gameId, updatedGame)
    return updatedGame
  }

  async deleteGame(gameId: string): Promise<void> {
    this.games.delete(gameId)
  }

  async getPlayerGames(playerId: string, limit = 50): Promise<Game[]> {
    return this.gameHistory
      .filter(game => game.playerId === playerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async saveGameResult(gameId: string, result: GameResult): Promise<void> {
    const game = this.games.get(gameId)
    if (game) {
      this.gameHistory.push({ ...game })
    }
  }

  async validateMove(gameId: string, move: GameMove): Promise<boolean> {
    const game = this.games.get(gameId)
    if (!game) return false
    
    // Basic validation logic
    switch (move.type) {
      case 'HIT':
        return game.state === 'PLAYING' && !game.playerHand.isBust
      case 'STAND':
        return game.state === 'PLAYING'
      case 'DOUBLE_DOWN':
        return game.state === 'PLAYING' && 
               game.playerHand.cards.length === 2 && 
               game.currentBet <= 1000 // Assuming balance check
      case 'DEAL':
        return game.state === 'BETTING' && game.betAmount > 0
      default:
        return false
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}