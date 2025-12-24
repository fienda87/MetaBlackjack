/**
 * Performance testing script for query optimization and caching
 * Tests API endpoints and measures performance improvements
 */

import { performance } from 'perf_hooks'
import { perfMetrics } from '@/lib/performance-monitor'
import { cacheGetOrFetch, CACHE_STRATEGIES, getCacheStats } from '@/lib/cache-operations'
import { executeParallel, USER_SELECT, GAME_SELECT } from '@/lib/query-helpers'
import { db } from '@/lib/db'

interface PerformanceTest {
  name: string
  run: () => Promise<void>
  expectedMaxMs: number
}

interface TestResult {
  name: string
  duration: number
  status: 'PASS' | 'FAIL' | 'WARN'
  details?: string
}

class PerformanceTester {
  private results: TestResult[] = []

  async runTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Performance Tests...')
    
    const tests: PerformanceTest[] = [
      {
        name: 'Database Query Performance',
        run: () => this.testDatabaseQueries(),
        expectedMaxMs: 100
      },
      {
        name: 'Cache Performance',
        run: () => this.testCachePerformance(),
        expectedMaxMs: 50
      },
      {
        name: 'Parallel Query Performance',
        run: () => this.testParallelQueries(),
        expectedMaxMs: 80
      },
      {
        name: 'Cursor Pagination Performance',
        run: () => this.testCursorPagination(),
        expectedMaxMs: 60
      },
      {
        name: 'Field Selection Optimization',
        run: () => this.testFieldSelection(),
        expectedMaxMs: 30
      }
    ]

    for (const test of tests) {
      await this.runSingleTest(test)
    }

    return this.results
  }

  private async runSingleTest(test: PerformanceTest): Promise<void> {
    console.log(`\n📊 Testing: ${test.name}`)
    
    const startTime = performance.now()
    
    try {
      await test.run()
      const duration = performance.now() - startTime
      
      let status: 'PASS' | 'FAIL' | 'WARN' = 'PASS'
      let details = `Duration: ${duration.toFixed(2)}ms`
      
      if (duration > test.expectedMaxMs * 1.5) {
        status = 'FAIL'
        details += ` (Expected: <${test.expectedMaxMs}ms)`
      } else if (duration > test.expectedMaxMs) {
        status = 'WARN'
        details += ` (Target: <${test.expectedMaxMs}ms)`
      }

      this.results.push({
        name: test.name,
        duration,
        status,
        details
      })

      console.log(`✅ ${status}: ${test.name} - ${details}`)
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error)
      this.results.push({
        name: test.name,
        duration: performance.now() - startTime,
        status: 'FAIL',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async testDatabaseQueries(): Promise<void> {
    perfMetrics.start('test:db:query')
    
    // Test user query with explicit fields
    const user = await db.user.findFirst({
      select: USER_SELECT.MINIMAL
    })
    
    perfMetrics.end('test:db:query')
  }

  private async testCachePerformance(): Promise<void> {
    const testKey = 'test:cache:performance'
    const testData = { timestamp: Date.now(), data: 'test' }
    
    perfMetrics.start('test:cache:write')
    await cacheGetOrFetch(
      testKey,
      { key: testKey, ttl: 5000, tags: ['test'] },
      async () => testData
    )
    perfMetrics.end('test:cache:write')
    
    perfMetrics.start('test:cache:read')
    await cacheGetOrFetch(
      testKey,
      { key: testKey, ttl: 5000, tags: ['test'] },
      async () => testData
    )
    perfMetrics.end('test:cache:read')
  }

  private async testParallelQueries(): Promise<void> {
    perfMetrics.start('test:parallel:queries')
    
    await executeParallel(
      db.user.findFirst({ select: USER_SELECT.MINIMAL }),
      db.game.findFirst({ select: GAME_SELECT.ACTION })
    )
    
    perfMetrics.end('test:parallel:queries')
  }

  private async testCursorPagination(): Promise<void> {
    perfMetrics.start('test:cursor:pagination')
    
    const games = await db.game.findMany({
      select: GAME_SELECT.HISTORY,
      take: 20,
      orderBy: { createdAt: 'desc' }
    })
    
    // Simulate cursor pagination
    if (games.length > 0) {
      const lastGame = games[games.length - 1]
      await db.game.findMany({
        select: GAME_SELECT.HISTORY,
        take: 20,
        skip: 1,
        cursor: lastGame ? { id: lastGame.id } : undefined,
        orderBy: { createdAt: 'desc' }
      })
    }
    
    perfMetrics.end('test:cursor:pagination')
  }

  private async testFieldSelection(): Promise<void> {
    perfMetrics.start('test:field:selection')
    
    // Test different field selection patterns
    await Promise.all([
      db.user.findMany({
        select: { id: true, balance: true },
        take: 10
      }),
      db.game.findMany({
        select: { id: true, result: true, netProfit: true },
        take: 10
      }),
      db.game.findMany({
        select: { id: true, playerId: true, createdAt: true },
        take: 10
      })
    ])
    
    perfMetrics.end('test:field:selection')
  }

  generateReport(): string {
    const passCount = this.results.filter(r => r.status === 'PASS').length
    const warnCount = this.results.filter(r => r.status === 'WARN').length
    const failCount = this.results.filter(r => r.status === 'FAIL').length
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length
    
    let report = '\n🎯 PERFORMANCE TEST REPORT\n'
    report += '=====================================\n\n'
    
    report += `📊 Summary:\n`
    report += `  ✅ PASS: ${passCount}\n`
    report += `  ⚠️  WARN: ${warnCount}\n`
    report += `  ❌ FAIL: ${failCount}\n`
    report += `  ⏱️  Avg Duration: ${avgDuration.toFixed(2)}ms\n\n`
    
    report += `📋 Test Details:\n`
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌'
      report += `  ${icon} ${result.name}: ${result.duration.toFixed(2)}ms\n`
      if (result.details) {
        report += `     ${result.details}\n`
      }
    })
    
    const performance = perfMetrics.getAllStats()
    if (Object.keys(performance).length > 0) {
      report += `\n📈 Performance Metrics:\n`
      Object.entries(performance).forEach(([label, stats]) => {
        if (stats) {
          const status = stats.status === 'good' ? '✅' : stats.status === 'warning' ? '⚠️' : '❌'
          report += `  ${status} ${label}: avg ${stats.avg}ms (${stats.count} samples)\n`
        }
      })
    }
    
    const cacheStats = getCacheStats()
    report += `\n💾 Cache Status:\n`
    report += `  Connected: ${cacheStats.connected ? '✅' : '❌'}\n`
    report += `  Total Keys: ${cacheStats.totalKeys}\n`
    report += `  Hit Rate: ${cacheStats.hitRate}%\n`
    
    return report
  }
}

// Export for use in API routes or testing
export const runPerformanceTests = async (): Promise<TestResult[]> => {
  const tester = new PerformanceTester()
  return await tester.runTests()
}

export const generatePerformanceReport = async (): Promise<string> => {
  const tester = new PerformanceTester()
  await tester.runTests()
  return tester.generateReport()
}

// Quick performance check for monitoring
export const quickPerformanceCheck = async (): Promise<{
  status: 'good' | 'warning' | 'critical'
  metrics: any
  recommendations: string[]
}> => {
  const stats = perfMetrics.getAllStats()
  const cacheStats = await getCacheStats()
  const recommendations: string[] = []
  
  let overallStatus: 'good' | 'warning' | 'critical' = 'good'
  
  // Check average response times
  Object.entries(stats).forEach(([label, stat]) => {
    if (stat) {
      if (stat.avg > 200 || stat.status === 'critical') {
        overallStatus = 'critical'
        recommendations.push(`Critical performance issue with ${label}: avg ${stat.avg}ms`)
      } else if (stat.avg > 100 || stat.status === 'warning') {
        if (overallStatus !== 'critical') {
          overallStatus = 'warning'
        }
        recommendations.push(`Performance warning with ${label}: avg ${stat.avg}ms`)
      }
    }
  })
  
  // Check cache health
  if (!cacheStats.connected) {
    recommendations.push('Redis cache not connected - performance may be degraded')
    if (overallStatus === 'good') overallStatus = 'warning'
  } else if (cacheStats.hitRate < 50) {
    recommendations.push(`Low cache hit rate: ${cacheStats.hitRate}% - consider reviewing cache strategies`)
    if (overallStatus === 'good') overallStatus = 'warning'
  }
  
  return {
    status: overallStatus,
    metrics: {
      performance: stats,
      cache: cacheStats
    },
    recommendations
  }
}