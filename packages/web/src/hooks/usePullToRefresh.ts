import { useState, useRef, useCallback } from "react"

type PullToRefreshOpts = {
  onRefresh: () => Promise<void>
  threshold?: number
  debounceMs?: number
}

export function usePullToRefresh(opts: PullToRefreshOpts) {
  const { onRefresh, threshold = 60, debounceMs = 2000 } = opts
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const lastRefresh = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget
    if (el.scrollTop > 0) return // only trigger at top
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === 0 || refreshing) return
    const delta = Math.max(0, e.touches[0].clientY - startY.current)
    setPullDistance(Math.min(delta * 0.5, threshold * 2)) // damping
  }, [refreshing, threshold])

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing && Date.now() - lastRefresh.current > debounceMs) {
      setRefreshing(true)
      lastRefresh.current = Date.now()
      try { await onRefresh() } finally { setRefreshing(false) }
    }
    setPullDistance(0)
    startY.current = 0
  }, [pullDistance, threshold, refreshing, debounceMs, onRefresh])

  return {
    containerProps: { onTouchStart, onTouchMove, onTouchEnd },
    refreshing,
    pullDistance,
  }
}
