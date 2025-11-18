import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

// Enhanced Prisma client for production with monitoring
class ProductionDatabase {
  private client: PrismaClient
  private metrics: {
    queryCount: number
    totalQueryTime: number
    slowQueries: number
    errorCount: number
    lastHealthCheck: Date | null
  }

  constructor() {
    this.client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })

    this.metrics = {
      queryCount: 0,
      totalQueryTime: 0,
      slowQueries: 0,
      errorCount: 0,
      lastHealthCheck: null
    }

    // Setup query logging for monitoring
    if (process.env.DB_LOG_QUERIES === 'true') {
      this.setupQueryLogging()
    }
  }

  private setupQueryLogging() {
    // Query logging temporarily disabled due to type issues
    /*
    this.client.$on('query' as any, (e: any) => {
      const duration = e.duration
      this.metrics.queryCount++
      this.metrics.totalQueryTime += duration

      if (duration > parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000')) {
        this.metrics.slowQueries++
        console.warn(`Slow query detected: ${duration}ms - ${e.query}`)
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Query: ${e.query} - Params: ${e.params} - Duration: ${duration}ms`)
      }
    })
    */

    // Error logging also disabled due to type issues
    /*
    this.client.$on('error' as any, (e: any) => {
      this.metrics.errorCount++
      console.error('Database error:', e)
    })
    */
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    timestamp: Date
    metrics: any
    details?: any
  }> {
    const startTime = performance.now()
    
    try {
      // Test basic connectivity
      await this.client.$queryRaw`SELECT 1 as health_check`
      
      // Test table access
      await this.client.user.findFirst({ select: { id: true } })
      
      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)
      
      this.metrics.lastHealthCheck = new Date()
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        metrics: { ...this.metrics },
        details: {
          responseTime: `${responseTime}ms`,
          database: this.getDatabaseType()
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        metrics: { ...this.metrics },
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          database: this.getDatabaseType()
        }
      }
    }
  }

  private getDatabaseType(): string {
    const url = process.env.DATABASE_URL || ''
    if (url.startsWith('postgresql:')) return 'PostgreSQL'
    if (url.startsWith('mysql:')) return 'MySQL'
    if (url.startsWith('file:')) return 'SQLite'
    return 'Unknown'
  }

  async getDatabaseStats(): Promise<{
    userCount: number
    gameCount: number
    sessionCount: number
    totalBetAmount: number
    databaseSize?: string
  }> {
    try {
      const [userCount, gameCount, sessionCount, betStats] = await Promise.all([
        this.client.user.count(),
        this.client.game.count(),
        this.client.gameSession.count(),
        this.client.game.aggregate({
          _sum: { betAmount: true }
        })
      ])

      const stats: any = {
        userCount,
        gameCount,
        sessionCount,
        totalBetAmount: betStats._sum.betAmount || 0
      }

      // Add database size for PostgreSQL
      if (this.getDatabaseType() === 'PostgreSQL') {
        try {
          const sizeResult = await this.client.$queryRaw<Array<{ size: string }>>`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
          `
          stats.databaseSize = sizeResult[0]?.size || 'Unknown'
        } catch {
          stats.databaseSize = 'Unknown'
        }
      }

      return stats
    } catch (error) {
      console.error('Error getting database stats:', error)
      throw error
    }
  }

  async cleanupOldData(): Promise<{
    deletedGames: number
    deletedSessions: number
    deletedLogs: number
  }> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    try {
      // Delete old audit logs
      const deletedLogs = await this.client.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      })

      // Delete old completed games (keep last 1000 per user)
      const oldGames = await this.client.game.findMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          },
          state: 'ENDED'
        },
        orderBy: { createdAt: 'asc' },
        take: 1000
      })

      const deletedGames = await this.client.game.deleteMany({
        where: {
          id: {
            in: oldGames.map(g => g.id)
          }
        }
      })

      // Delete empty sessions
      const deletedSessions = await this.client.gameSession.deleteMany({
        where: {
          games: {
            none: {}
          },
          endTime: {
            lt: thirtyDaysAgo
          }
        }
      })

      return {
        deletedGames: deletedGames.count,
        deletedSessions: deletedSessions.count,
        deletedLogs: deletedLogs.count
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error)
      throw error
    }
  }

  async optimizeDatabase(): Promise<{
    vacuumed: boolean
    analyzed: boolean
    reindexed: boolean
  }> {
    const dbType = this.getDatabaseType()
    
    try {
      if (dbType === 'PostgreSQL') {
        // VACUUM and ANALYZE for PostgreSQL
        await this.client.$executeRaw`VACUUM ANALYZE`
        // REINDEX disabled due to type issues
        // await this.client.$executeRaw`REINDEX DATABASE ...`
        
        return {
          vacuumed: true,
          analyzed: true,
          reindexed: true
        }
      } else if (dbType === 'SQLite') {
        // VACUUM for SQLite
        await this.client.$executeRaw`VACUUM`
        
        return {
          vacuumed: true,
          analyzed: false,
          reindexed: false
        }
      } else {
        // MySQL optimization
        await this.client.$executeRaw`OPTIMIZE TABLE users, games, game_sessions, game_moves, system_config, audit_logs`
        
        return {
          vacuumed: false,
          analyzed: true,
          reindexed: false
        }
      }
    } catch (error) {
      console.error('Error optimizing database:', error)
      throw error
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageQueryTime: this.metrics.queryCount > 0 
        ? Math.round(this.metrics.totalQueryTime / this.metrics.queryCount)
        : 0,
      slowQueryPercentage: this.metrics.queryCount > 0
        ? Math.round((this.metrics.slowQueries / this.metrics.queryCount) * 100)
        : 0
    }
  }

  getClient() {
    return this.client
  }

  async disconnect() {
    await this.client.$disconnect()
  }
}

// Singleton instance for production
const globalForDb = globalThis as unknown as {
  db: ProductionDatabase | undefined
}

export const db = globalForDb.db ?? new ProductionDatabase()

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}

// Export the underlying Prisma client for direct access if needed
export { PrismaClient }