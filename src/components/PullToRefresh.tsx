'use client'

import { useState, useEffect, useRef } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
}

export default function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing) return
      
      const touch = e.touches[0]
      if (!touch) return
      startY.current = touch.clientY
      
      // Only enable pull-to-refresh at the top of the page
      if (window.scrollY === 0) {
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return
      
      const touch = e.touches[0]
      if (!touch) return
      currentY.current = touch.clientY
      
      const distance = currentY.current - startY.current
      
      // Only allow pulling down (positive distance)
      if (distance > 0) {
        e.preventDefault()
        setPullDistance(Math.min(distance, 120)) // Max pull distance
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling || disabled || isRefreshing) return
      
      if (pullDistance > 60) { // Threshold for refresh
        setIsRefreshing(true)
        setPullDistance(0)
        
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh failed:', error)
        } finally {
          setIsRefreshing(false)
        }
      } else {
        setPullDistance(0)
      }
      
      setIsPulling(false)
    }

    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled])

  const pullIndicatorOpacity = Math.min(pullDistance / 60, 1)
  const pullScale = 0.5 + (pullDistance / 120) * 0.5

  return (
    <div ref={containerRef} className="relative">
      {/* Pull-to-refresh indicator */}
      <div 
        className="pull-to-refresh flex items-center justify-center"
        style={{
          opacity: pullIndicatorOpacity,
          height: `${Math.min(pullDistance, 60)}px`,
          transform: `scale(${pullScale})`
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center gap-2 text-green-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400 border-t-transparent"></div>
            <span className="text-sm">Refreshing...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-400">
            <span className="text-sm">Pull to refresh</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: isPulling ? `translateY(${Math.min(pullDistance, 60)}px)` : 'translateY(0)'
        }}
      >
        {children}
      </div>
    </div>
  )
}