import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeSubscriptionConfig {
  channelName: string
  table: string
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  onUpdate: () => void
  enabled?: boolean
}

/**
 * Custom hook for managing Supabase Realtime subscriptions with automatic reconnection
 * Handles page visibility changes and network reconnection
 */
export const useRealtimeSubscription = ({
  channelName,
  table,
  filter,
  event = '*',
  onUpdate,
  enabled = true
}: RealtimeSubscriptionConfig) => {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isSubscribedRef = useRef(false)

  const subscribe = () => {
    // Don't subscribe if disabled or already subscribed
    if (!enabled || isSubscribedRef.current) return

    // Create unique channel with timestamp to prevent duplicates
    const timestamp = Date.now()
    const uniqueChannelName = `${channelName}-${timestamp}`

    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        () => {
          onUpdate()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true
          console.log(`✅ Subscribed to ${table}`)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`⚠️ Subscription error for ${table}, will retry...`)
          isSubscribedRef.current = false
        }
      })

    channelRef.current = channel
  }

  const unsubscribe = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
      isSubscribedRef.current = false
      console.log(`🔌 Unsubscribed from ${table}`)
    }
  }

  useEffect(() => {
    if (!enabled) return

    // Initial subscription
    subscribe()

    // Handle page visibility changes (tab becomes active again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Page visible, checking connection...')
        // Trigger data refresh when page becomes visible
        onUpdate()
      }
    }

    // Handle network reconnection
    const handleOnline = () => {
      console.log('🌐 Network reconnected, resubscribing...')
      unsubscribe().then(() => {
        subscribe()
        onUpdate()
      })
    }

    // Handle network disconnection
    const handleOffline = () => {
      console.log('📡 Network disconnected')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [enabled, channelName, table, filter, event])

  return { subscribe, unsubscribe }
}
