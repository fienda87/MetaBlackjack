// Performance monitoring utilities
import { useCallback } from 'react'

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()
  
  static startTimer(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (!this.metrics.has(name)) {
        this.metrics.set(name, [])
      }
      
      this.metrics.get(name)!.push(duration)
      
      // Keep only last 100 measurements
      const measurements = this.metrics.get(name)!
      if (measurements.length > 100) {
        measurements.shift()
      }
      
      // Log slow operations
      if (duration > 100) {
        console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`)
      }
    }
  }
  
  static getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.metrics.get(name)
    if (!measurements || measurements.length === 0) {
      return null
    }
    
    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)
    
    return { avg, min, max, count: measurements.length }
  }
  
  static getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [name] of this.metrics) {
      const metrics = this.getMetrics(name)
      if (metrics) {
        result[name] = metrics
      }
    }
    
    return result
  }
  
  static clearMetrics(): void {
    this.metrics.clear()
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = (operationName: string) => {
  return useCallback(() => {
    return PerformanceMonitor.startTimer(operationName)
  }, [operationName])
}

// Web Vitals monitoring
export const reportWebVitals = (metric: any) => {
  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: send to analytics
    // gtag('event', metric.name, {
    //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    //   event_category: 'Web Vitals',
    //   event_label: metric.id,
    //   non_interaction: true,
    // })
  } else {
    console.log('Web Vital:', metric)
  }
}

// Memory usage monitoring
export const getMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    }
  }
  return null
}

// Component render time tracking
export const trackRenderTime = (componentName: string) => {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    if (renderTime > 16) { // More than one frame
      console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }
    
    return renderTime
  }
}