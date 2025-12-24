/**
 * Performance monitoring and metrics collection
 * Tracks query execution times, API response times, and system performance
 */

export class PerformanceMetrics {
  private startTimes = new Map<string, number>()
  private metrics = new Map<string, number[]>()
  private slowQueryThreshold = 100 // ms
  private maxSamples = 1000

  start(label: string): void {
    this.startTimes.set(label, performance.now())
  }

  end(label: string): number | null {
    const start = this.startTimes.get(label)
    if (!start) {
      console.warn(`[Perf] No start time found for label: ${label}`)
      return null
    }

    const duration = performance.now() - start
    this.recordMetric(label, duration)
    this.startTimes.delete(label)
    
    return duration
  }

  private recordMetric(label: string, duration: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    
    const samples = this.metrics.get(label)!
    samples.push(duration)
    
    // Keep only recent samples to prevent memory leaks
    if (samples.length > this.maxSamples) {
      samples.splice(0, samples.length - this.maxSamples)
    }

    // Log slow operations
    if (duration > this.slowQueryThreshold) {
      console.warn(`⚠️ [SLOW] ${label}: ${duration.toFixed(2)}ms`)
    }
  }

  getStats(label: string): {
    count: number
    avg: number
    min: number
    max: number
    p95: number
    p99: number
    slowCount: number
    status: 'good' | 'warning' | 'critical'
  } | null {
    const durations = this.metrics.get(label) || []
    if (durations.length === 0) {
      return null
    }

    const sorted = [...durations].sort((a, b) => a - b)
    const count = durations.length
    const sum = durations.reduce((a, b) => a + b, 0)
    const avg = sum / count
    const min = sorted[0]!
    const max = sorted[sorted.length - 1]!

    const p95Index = Math.ceil(sorted.length * 0.95) - 1
    const p99Index = Math.ceil(sorted.length * 0.99) - 1
    const p95 = sorted[p95Index] ?? max
    const p99 = sorted[p99Index] ?? max

    const slowCount = durations.filter(d => d > this.slowQueryThreshold).length
    const slowPercentage = (slowCount / count) * 100

    let status: 'good' | 'warning' | 'critical'
    if (avg < 50 && slowPercentage < 5) {
      status = 'good'
    } else if (avg < 100 && slowPercentage < 15) {
      status = 'warning'
    } else {
      status = 'critical'
    }

    return {
      count,
      avg: parseFloat(avg.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      p95: parseFloat(p95.toFixed(2)),
      p99: parseFloat(p99.toFixed(2)),
      slowCount,
      status
    }
  }

  getAllStats(): Record<string, ReturnType<PerformanceMetrics['getStats']>> {
    const allStats: Record<string, ReturnType<PerformanceMetrics['getStats']>> = {}
    
    for (const [label] of this.metrics) {
      const stats = this.getStats(label)
      if (stats) {
        allStats[label] = stats
      }
    }
    
    return allStats
  }

  // Reset metrics for a specific label
  reset(label: string): void {
    this.metrics.delete(label)
    this.startTimes.delete(label)
  }

  // Reset all metrics
  resetAll(): void {
    this.metrics.clear()
    this.startTimes.clear()
  }

  // Set custom slow query threshold
  setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThreshold = thresholdMs
  }

  // Get slow query count for a label
  getSlowQueryCount(label: string): number {
    const durations = this.metrics.get(label) || []
    return durations.filter(d => d > this.slowQueryThreshold).length
  }

  // Check if performance is acceptable
  isPerformanceAcceptable(label: string, maxAvgMs = 100, maxSlowPercentage = 10): boolean {
    const stats = this.getStats(label)
    if (!stats) return true

    const slowPercentage = (stats.slowCount / stats.count) * 100
    return stats.avg <= maxAvgMs && slowPercentage <= maxSlowPercentage
  }
}

// Global performance metrics instance
export const perfMetrics = new PerformanceMetrics()

// Performance monitoring decorators/helpers
export const withPerformanceTracking = async <T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> => {
  perfMetrics.start(label)
  try {
    const result = await operation()
    const duration = perfMetrics.end(label)
    console.log(`[Perf] ${label}: ${duration?.toFixed(2)}ms`)
    return result
  } catch (error) {
    perfMetrics.end(label)
    throw error
  }
}

export const trackDatabaseQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  return withPerformanceTracking(`db:${queryName}`, queryFn)
}

export const trackCacheOperation = async <T>(
  operation: string,
  cacheFn: () => Promise<T>
): Promise<T> => {
  return withPerformanceTracking(`cache:${operation}`, cacheFn)
}

export const trackApiEndpoint = async <T>(
  endpoint: string,
  apiFn: () => Promise<T>
): Promise<T> => {
  return withPerformanceTracking(`api:${endpoint}`, apiFn)
}

// Performance monitoring middleware
export const createPerformanceMiddleware = (label: string) => {
  return {
    start: () => perfMetrics.start(label),
    end: () => perfMetrics.end(label),
    getStats: () => perfMetrics.getStats(label)
  }
}

// Performance alerts
export const checkPerformanceAlerts = (): {
  alerts: Array<{ label: string; message: string; severity: 'warning' | 'critical' }>
  overall: 'good' | 'warning' | 'critical'
} => {
  const alerts: Array<{ label: string; message: string; severity: 'warning' | 'critical' }> = []
  const stats = perfMetrics.getAllStats()

  for (const [label, stat] of Object.entries(stats)) {
    if (!stat) continue

    if (stat.status === 'critical') {
      alerts.push({
        label,
        message: `Critical performance issue: avg ${stat.avg}ms, ${stat.slowCount}/${stat.count} slow queries`,
        severity: 'critical'
      })
    } else if (stat.status === 'warning') {
      alerts.push({
        label,
        message: `Performance warning: avg ${stat.avg}ms, ${stat.slowCount}/${stat.count} slow queries`,
        severity: 'warning'
      })
    }
  }

  const overall = alerts.some(a => a.severity === 'critical') ? 'critical' :
                  alerts.some(a => a.severity === 'warning') ? 'warning' : 'good'

  return { alerts, overall }
}

// Performance summary for logging
export const getPerformanceSummary = (): {
  timestamp: string
  totalMetrics: number
  topSlowOperations: Array<{ label: string; avg: number; count: number }>
  systemStatus: 'good' | 'warning' | 'critical'
} => {
  const stats = perfMetrics.getAllStats()
  const metrics = Object.entries(stats)
  
  const topSlowOperations = metrics
    .filter(([_, stat]) => stat && stat.avg > 50)
    .map(([label, stat]) => ({
      label,
      avg: stat!.avg,
      count: stat!.count
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  const { alerts, overall } = checkPerformanceAlerts()

  return {
    timestamp: new Date().toISOString(),
    totalMetrics: metrics.length,
    topSlowOperations,
    systemStatus: overall
  }
}

// Auto-reporting timer (every 5 minutes)
let reportingInterval: NodeJS.Timeout | null = null

export const startPerformanceReporting = (intervalMs = 300000): void => {
  if (reportingInterval) {
    clearInterval(reportingInterval)
  }

  reportingInterval = setInterval(() => {
    const summary = getPerformanceSummary()
    console.log('[Perf] Summary:', JSON.stringify(summary, null, 2))
    
    if (summary.systemStatus !== 'good') {
      const { alerts } = checkPerformanceAlerts()
      console.warn('[Perf] Performance alerts:', alerts)
    }
  }, intervalMs)
}

export const stopPerformanceReporting = (): void => {
  if (reportingInterval) {
    clearInterval(reportingInterval)
    reportingInterval = null
  }
}

// Performance benchmarks
export const PERFORMANCE_BENCHMARKS = {
  DATABASE_QUERY: { good: 50, warning: 100, critical: 200 },
  CACHE_OPERATION: { good: 5, warning: 10, critical: 25 },
  API_ENDPOINT: { good: 100, warning: 200, critical: 500 },
  GAME_ACTION: { good: 80, warning: 150, critical: 300 }
}

export const validatePerformance = (
  label: string,
  duration: number,
  benchmark: { good: number; warning: number; critical: number }
): 'good' | 'warning' | 'critical' => {
  if (duration <= benchmark.good) return 'good'
  if (duration <= benchmark.warning) return 'warning'
  return 'critical'
}