/**
 * Database Profiler - Phase 1 DB Tuning
 * 
 * Runs EXPLAIN ANALYZE against hot queries to establish baseline metrics
 * and track performance improvements over time.
 * 
 * Usage:
 *   npx tsx scripts/perf/db-profiler.ts [options]
 * 
 * Options:
 *   --baseline    Save results as baseline
 *   --compare     Compare with baseline
 *   --output      Output file (default: console)
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient({
  log: ['query']
})

interface QueryProfile {
  name: string
  query: string
  params?: any
  executionTime: number
  explainAnalyze?: string
}

interface ProfileResult {
  timestamp: string
  queries: QueryProfile[]
  summary: {
    totalQueries: number
    averageTime: number
    slowestQuery: string
    fastestQuery: string
  }
}

/**
 * Profile a query with EXPLAIN ANALYZE
 */
async function profileQuery(
  name: string,
  queryFn: () => Promise<any>,
  explainQuery?: string
): Promise<QueryProfile> {
  const start = performance.now()
  
  try {
    await queryFn()
  } catch (error) {
    console.error(`Error executing ${name}:`, error)
  }
  
  const executionTime = performance.now() - start
  
  let explainAnalyze: string | undefined
  if (explainQuery) {
    try {
      const result = await prisma.$queryRawUnsafe<any[]>(`EXPLAIN ANALYZE ${explainQuery}`)
      explainAnalyze = result.map((r: any) => r['QUERY PLAN']).join('\n')
    } catch (error) {
      console.error(`Error getting EXPLAIN ANALYZE for ${name}:`, error)
    }
  }
  
  return {
    name,
    query: explainQuery || 'N/A',
    executionTime: Math.round(executionTime * 100) / 100,
    explainAnalyze
  }
}

/**
 * Run all performance profiles
 */
async function runProfiler(): Promise<ProfileResult> {
  console.log('🚀 Starting Database Profiler...\n')
  
  const queries: QueryProfile[] = []
  
  // 1. User transaction history (hot query)
  console.log('📊 Profiling: User transaction history...')
  queries.push(await profileQuery(
    'User Transaction History',
    async () => {
      const users = await prisma.user.findMany({ take: 10, select: { id: true } })
      if (users.length > 0) {
        await prisma.transaction.findMany({
          where: { userId: users[0].id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            createdAt: true
          }
        })
      }
    },
    `SELECT id, type, amount, status, "createdAt" FROM transactions WHERE "userId" = (SELECT id FROM users LIMIT 1) ORDER BY "createdAt" DESC LIMIT 20`
  ))
  
  // 2. Player game history (hot query)
  console.log('📊 Profiling: Player game history...')
  queries.push(await profileQuery(
    'Player Game History',
    async () => {
      const users = await prisma.user.findMany({ take: 10, select: { id: true } })
      if (users.length > 0) {
        await prisma.game.findMany({
          where: { playerId: users[0].id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            betAmount: true,
            result: true,
            createdAt: true
          }
        })
      }
    },
    `SELECT id, "betAmount", result, "createdAt" FROM games WHERE "playerId" = (SELECT id FROM users LIMIT 1) ORDER BY "createdAt" DESC LIMIT 20`
  ))
  
  // 3. Active games query
  console.log('📊 Profiling: Active games...')
  queries.push(await profileQuery(
    'Active Games Query',
    async () => {
      await prisma.game.findMany({
        where: { state: 'PLAYING' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          playerId: true,
          state: true,
          createdAt: true
        }
      })
    },
    `SELECT id, "playerId", state, "createdAt" FROM games WHERE state = 'PLAYING' ORDER BY "createdAt" DESC LIMIT 50`
  ))
  
  // 4. User lookup by wallet address (authentication)
  console.log('📊 Profiling: User lookup by wallet...')
  queries.push(await profileQuery(
    'User Wallet Lookup',
    async () => {
      const users = await prisma.user.findMany({ take: 1, select: { walletAddress: true } })
      if (users.length > 0) {
        await prisma.user.findUnique({
          where: { walletAddress: users[0].walletAddress },
          select: {
            id: true,
            username: true,
            walletAddress: true,
            balance: true
          }
        })
      }
    },
    `SELECT id, username, "walletAddress", balance FROM users WHERE "walletAddress" = (SELECT "walletAddress" FROM users LIMIT 1)`
  ))
  
  // 5. Audit log query
  console.log('📊 Profiling: Audit logs...')
  queries.push(await profileQuery(
    'Audit Logs Query',
    async () => {
      const users = await prisma.user.findMany({ take: 1, select: { id: true } })
      if (users.length > 0) {
        await prisma.auditLog.findMany({
          where: { userId: users[0].id },
          orderBy: { timestamp: 'desc' },
          take: 50,
          select: {
            id: true,
            action: true,
            resource: true,
            timestamp: true
          }
        })
      }
    },
    `SELECT id, action, resource, timestamp FROM audit_logs WHERE "userId" = (SELECT id FROM users LIMIT 1) ORDER BY timestamp DESC LIMIT 50`
  ))
  
  // 6. Transaction status query (pending withdrawals)
  console.log('📊 Profiling: Pending transactions...')
  queries.push(await profileQuery(
    'Pending Transactions',
    async () => {
      await prisma.transaction.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          userId: true,
          type: true,
          amount: true,
          status: true,
          createdAt: true
        }
      })
    },
    `SELECT id, "userId", type, amount, status, "createdAt" FROM transactions WHERE status = 'PENDING' ORDER BY "createdAt" DESC LIMIT 100`
  ))
  
  // Calculate summary
  const times = queries.map(q => q.executionTime)
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const slowest = queries.reduce((prev, curr) => prev.executionTime > curr.executionTime ? prev : curr)
  const fastest = queries.reduce((prev, curr) => prev.executionTime < curr.executionTime ? prev : curr)
  
  return {
    timestamp: new Date().toISOString(),
    queries,
    summary: {
      totalQueries: queries.length,
      averageTime: Math.round(avgTime * 100) / 100,
      slowestQuery: `${slowest.name} (${slowest.executionTime}ms)`,
      fastestQuery: `${fastest.name} (${fastest.executionTime}ms)`
    }
  }
}

/**
 * Save results to file
 */
function saveResults(results: ProfileResult, filename: string) {
  const outputPath = path.join(process.cwd(), 'scripts', 'perf', filename)
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Results saved to: ${outputPath}`)
}

/**
 * Compare with baseline
 */
function compareWithBaseline(current: ProfileResult, baseline: ProfileResult) {
  console.log('\n📊 Comparison with Baseline:\n')
  console.log(`${'Query'.padEnd(30)} | ${'Baseline'.padEnd(12)} | ${'Current'.padEnd(12)} | ${'Diff'.padEnd(12)} | Change`)
  console.log('-'.repeat(90))
  
  baseline.queries.forEach((baseQuery, idx) => {
    const currentQuery = current.queries[idx]
    if (currentQuery && currentQuery.name === baseQuery.name) {
      const diff = currentQuery.executionTime - baseQuery.executionTime
      const percentChange = ((diff / baseQuery.executionTime) * 100).toFixed(1)
      const arrow = diff < 0 ? '⬇️' : diff > 0 ? '⬆️' : '➡️'
      const color = diff < 0 ? '\x1b[32m' : diff > 0 ? '\x1b[31m' : '\x1b[33m'
      const reset = '\x1b[0m'
      
      console.log(
        `${currentQuery.name.padEnd(30)} | ${baseQuery.executionTime.toFixed(2).padEnd(10)}ms | ${currentQuery.executionTime.toFixed(2).padEnd(10)}ms | ${color}${diff.toFixed(2).padEnd(10)}ms${reset} | ${arrow} ${percentChange}%`
      )
    }
  })
  
  const avgDiff = current.summary.averageTime - baseline.summary.averageTime
  const avgPercent = ((avgDiff / baseline.summary.averageTime) * 100).toFixed(1)
  console.log('-'.repeat(90))
  console.log(`\n📈 Average: ${baseline.summary.averageTime.toFixed(2)}ms → ${current.summary.averageTime.toFixed(2)}ms (${avgPercent}% change)`)
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const isBaseline = args.includes('--baseline')
  const isCompare = args.includes('--compare')
  
  try {
    const results = await runProfiler()
    
    // Print results
    console.log('\n\n📊 Profile Results:\n')
    results.queries.forEach(q => {
      console.log(`${q.name}: ${q.executionTime}ms`)
    })
    
    console.log(`\n📈 Summary:`)
    console.log(`  Total Queries: ${results.summary.totalQueries}`)
    console.log(`  Average Time: ${results.summary.averageTime}ms`)
    console.log(`  Slowest: ${results.summary.slowestQuery}`)
    console.log(`  Fastest: ${results.summary.fastestQuery}`)
    
    // Save baseline
    if (isBaseline) {
      saveResults(results, 'baseline.json')
    }
    
    // Compare with baseline
    if (isCompare) {
      const baselinePath = path.join(process.cwd(), 'scripts', 'perf', 'baseline.json')
      if (fs.existsSync(baselinePath)) {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'))
        compareWithBaseline(results, baseline)
      } else {
        console.log('\n⚠️  No baseline found. Run with --baseline first.')
      }
    }
    
    // Save current results
    saveResults(results, `profile-${Date.now()}.json`)
    
  } catch (error) {
    console.error('Error running profiler:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
