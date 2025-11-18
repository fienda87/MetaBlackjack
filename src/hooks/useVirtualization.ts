import { useMemo, useState, useEffect, useRef, useCallback } from 'react'

interface VirtualizationOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  const totalHeight = useMemo(() => {
    return items.length * itemHeight
  }, [items.length, itemHeight])

  const offsetY = useMemo(() => {
    return visibleRange.startIndex * itemHeight
  }, [visibleRange.startIndex, itemHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    scrollElementRef,
    handleScroll
  }
}

// Hook for infinite scrolling
export function useInfiniteScroll(
  fetchMore: () => Promise<void>,
  hasMore: boolean,
  threshold = 100
) {
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - threshold
      ) {
        if (!isLoading && hasMore) {
          setIsLoading(true)
          fetchMore().finally(() => setIsLoading(false))
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [fetchMore, hasMore, isLoading, threshold])

  return { containerRef, isLoading }
}