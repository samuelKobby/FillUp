import { useState, useEffect, useRef } from 'react'
import { getCache, setCache } from '../lib/cache'
import { useAuth } from '../contexts/AuthContext'

interface UseCachedDataOptions<T> {
  cacheKey: string
  fetchFn: () => Promise<T>
  enabled?: boolean
  ttl?: number // Time to live in milliseconds
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
}

interface UseCachedDataReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isStale: boolean
}

/**
 * Custom hook for managing cached data with automatic refresh on visibility change
 * Implements stale-while-revalidate pattern
 */
export function useCachedData<T>({
  cacheKey,
  fetchFn,
  enabled = true,
  ttl = 5 * 60 * 1000, // 5 minutes default
  refetchOnMount = true,
  refetchOnWindowFocus = true
}: UseCachedDataOptions<T>): UseCachedDataReturn<T> {
  const { user } = useAuth()
  const [data, setData] = useState<T | null>(() => {
    // Initialize with cached data if available
    return user ? getCache<T>(cacheKey, user.id, { ttl }) : null
  })
  const [loading, setLoading] = useState(!data) // Only show loading if no cached data
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  const isMountedRef = useRef(true)
  const hasFetchedRef = useRef(false)

  const fetchData = async (showLoading = true) => {
    if (!enabled || !user) return

    try {
      if (showLoading && !data) {
        setLoading(true)
      } else if (data) {
        // Show stale indicator if we have data
        setIsStale(true)
      }

      const result = await fetchFn()

      if (!isMountedRef.current) return

      setData(result)
      setError(null)
      setIsStale(false)

      // Cache the result
      if (user?.id) {
        setCache(cacheKey, result, user.id, { ttl })
      }

      hasFetchedRef.current = true
    } catch (err) {
      if (!isMountedRef.current) return

      const error = err instanceof Error ? err : new Error('Failed to fetch data')
      setError(error)
      setIsStale(false)

      // Keep cached data on error (stale-while-revalidate)
      if (!data) {
        console.error(`Error fetching ${cacheKey}:`, error)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    if (!enabled || !user) return

    isMountedRef.current = true

    // Load from cache immediately
    const cached = getCache<T>(cacheKey, user.id, { ttl })
    if (cached) {
      setData(cached)
      setLoading(false)
    }

    // Fetch fresh data if needed
    if (refetchOnMount || !cached) {
      fetchData(!cached) // Show loading only if no cached data
    }

    return () => {
      isMountedRef.current = false
    }
  }, [enabled, user?.id, cacheKey])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        // Reload cache first
        if (user) {
          const cached = getCache<T>(cacheKey, user.id, { ttl })
          if (cached) {
            setData(cached)
          }
        }
        
        // Then fetch fresh data in background
        fetchData(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refetchOnWindowFocus, enabled, user?.id, cacheKey])

  const refetch = async () => {
    hasFetchedRef.current = false
    await fetchData(true)
  }

  return {
    data,
    loading,
    error,
    refetch,
    isStale
  }
}
