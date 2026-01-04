import { useEffect, useRef, useCallback } from 'react'
import { RealtimeManager } from '../lib/RealtimeManager'

interface RealtimeSubscriptionConfig {
  channelName: string
  table: string
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  onUpdate: () => void
  enabled?: boolean
}

/**
 * Custom hook for managing Supabase Realtime subscriptions
 * Uses singleton RealtimeManager for proper deduplication and React Strict Mode compatibility
 */
export const useRealtimeSubscription = ({
  channelName,
  table,
  filter,
  event = '*',
  onUpdate,
  enabled = true
}: RealtimeSubscriptionConfig) => {
  const callbackRef = useRef(onUpdate)
  const isMountedRef = useRef(true)

  // Update callback ref when onUpdate changes (without triggering resubscription)
  useEffect(() => {
    callbackRef.current = onUpdate
  }, [onUpdate])

  // Stable callback wrapper that always calls the latest onUpdate
  const stableCallback = useCallback(() => {
    if (isMountedRef.current) {
      callbackRef.current()
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    isMountedRef.current = true
    let subscribed = false

    // Subscribe through RealtimeManager
    const doSubscribe = async () => {
      try {
        await RealtimeManager.subscribe({
          channelName,
          table,
          filter,
          event,
          callback: stableCallback
        })
        subscribed = true
      } catch (error) {
        // Error already logged by RealtimeManager
        if (import.meta.env.DEV) {
          console.error(`Failed to subscribe to ${channelName}:`, error)
        }
      }
    }

    doSubscribe()

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      if (subscribed) {
        RealtimeManager.unsubscribe(channelName, stableCallback)
      }
    }
  }, [enabled, channelName, table, filter, event, stableCallback])

  return {
    // Expose manager stats for debugging
    getStats: () => RealtimeManager.getStats()
  }
}
