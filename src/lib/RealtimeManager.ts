import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface SubscriptionConfig {
  channelName: string
  table: string
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  callback: () => void
}

interface ChannelInfo {
  channel: RealtimeChannel
  refCount: number
  callbacks: Set<() => void>
  config: SubscriptionConfig
  isSubscribing: boolean
  isSubscribed: boolean
  subscriptionPromise: Promise<void> | null
}

/**
 * Simple logger that only logs in development mode
 */
class Logger {
  private isDev = import.meta.env.DEV

  log(...args: any[]) {
    if (this.isDev) console.log(...args)
  }

  warn(...args: any[]) {
    if (this.isDev) console.warn(...args)
  }

  error(...args: any[]) {
    // Always log errors
    console.error(...args)
  }
}

/**
 * Singleton service for managing Supabase Realtime subscriptions
 * Handles channel lifecycle, deduplication, and React Strict Mode compatibility
 */
class RealtimeManagerService {
  private static instance: RealtimeManagerService
  private channels: Map<string, ChannelInfo> = new Map()
  private readonly SUBSCRIPTION_TIMEOUT = 15000 // 15 seconds (increased from 10)
  private readonly CLEANUP_DELAY = 100 // 100ms delay before removing unused channels
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_BASE_DELAY = 1000 // 1 second base delay
  private logger = new Logger()

  private constructor() {
    // Private constructor for singleton
    this.setupNetworkListeners()
    this.setupVisibilityListener()
  }

  static getInstance(): RealtimeManagerService {
    if (!RealtimeManagerService.instance) {
      RealtimeManagerService.instance = new RealtimeManagerService()
    }
    return RealtimeManagerService.instance
  }

  /**
   * Subscribe to a channel with automatic deduplication and reference counting
   */
  async subscribe(config: SubscriptionConfig): Promise<void> {
    const { channelName, table, filter, event = '*', callback } = config

    // Get or create channel info
    let channelInfo = this.channels.get(channelName)

    if (channelInfo) {
      // Channel already exists - increment ref count and add callback
      channelInfo.refCount++
      channelInfo.callbacks.add(callback)
      
      // If already subscribed or subscribing, just wait for it
      if (channelInfo.isSubscribed) {
        this.logger.log(`♻️ Reusing existing channel: ${channelName} (refCount: ${channelInfo.refCount})`)
        return
      }
      
      if (channelInfo.subscriptionPromise) {
        this.logger.log(`⏳ Waiting for existing subscription: ${channelName}`)
        await channelInfo.subscriptionPromise
        return
      }
    }

    // Create new channel info
    if (!channelInfo) {
      // Check if channel exists globally in Supabase
      const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName)
      
      if (existingChannel) {
        const state = existingChannel.state
        
        // Always remove existing channels and create fresh ones to avoid "subscribe called multiple times" error
        this.logger.log(`🗑️ Removing existing channel to create fresh: ${channelName} (${state})`)
        await this.removeChannelSafely(existingChannel)
        await this.delay(50) // Small delay for cleanup
      }

      // Create new channel
      channelInfo = {
        channel: null as any, // Will be created below
        refCount: 1,
        callbacks: new Set([callback]),
        config,
        isSubscribing: true,
        isSubscribed: false,
        subscriptionPromise: null
      }
      this.channels.set(channelName, channelInfo)
    }

    // Create subscription promise with retry logic
    const subscriptionPromise = this.subscribeWithRetry(channelInfo, config)
    channelInfo.subscriptionPromise = subscriptionPromise

    try {
      await subscriptionPromise
    } catch (error) {
      this.logger.error(`❌ Subscription failed for ${channelName} after retries:`, error)
      // Clean up failed channel
      this.channels.delete(channelName)
      throw error
    } finally {
      channelInfo.subscriptionPromise = null
    }
  }

  /**
   * Subscribe with exponential backoff retry
   */
  private async subscribeWithRetry(
    channelInfo: ChannelInfo,
    config: SubscriptionConfig,
    attempt: number = 1
  ): Promise<void> {
    try {
      await this.createSubscription(channelInfo, config)
    } catch (error) {
      if (attempt >= this.MAX_RETRY_ATTEMPTS) {
        throw error
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = this.RETRY_BASE_DELAY * Math.pow(2, attempt - 1)
      this.logger.warn(`⚠️ Retry ${attempt}/${this.MAX_RETRY_ATTEMPTS} for ${config.channelName} in ${delay}ms...`)
      
      await this.delay(delay)
      
      // Retry
      return this.subscribeWithRetry(channelInfo, config, attempt + 1)
    }
  }

  /**
   * Unsubscribe from a channel with reference counting
   */
  async unsubscribe(channelName: string, callback: () => void): Promise<void> {
    const channelInfo = this.channels.get(channelName)
    if (!channelInfo) return

    // Remove callback
    channelInfo.callbacks.delete(callback)
    channelInfo.refCount--

    this.logger.log(`🔻 Unsubscribe: ${channelName} (refCount: ${channelInfo.refCount})`)

    // If still has references, keep channel alive
    if (channelInfo.refCount > 0) {
      return
    }

    // No more references - schedule cleanup
    await this.delay(this.CLEANUP_DELAY)

    // Double-check refCount after delay (component might have resubscribed)
    const currentInfo = this.channels.get(channelName)
    if (!currentInfo || currentInfo.refCount > 0) {
      return
    }

    // Remove channel
    this.logger.log(`🧹 Cleaning up unused channel: ${channelName}`)
    await this.removeChannelSafely(currentInfo.channel)
    this.channels.delete(channelName)
  }

  /**
   * Create and subscribe to a new channel
   */
  private async createSubscription(
    channelInfo: ChannelInfo,
    config: SubscriptionConfig
  ): Promise<void> {
    const { channelName, table, filter, event } = config

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout
      let isSettled = false

      try {
        // Create channel
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event,
              schema: 'public',
              table,
              ...(filter && { filter })
            },
            () => {
              // Trigger all registered callbacks
              const info = this.channels.get(channelName)
              if (info) {
                info.callbacks.forEach(cb => {
                  try {
                    cb()
                  } catch (error) {
                    this.logger.error(`Error in callback for ${channelName}:`, error)
                  }
                })
              }
            }
          )

        channelInfo.channel = channel

        // Set timeout for subscription
        timeoutId = setTimeout(async () => {
          if (isSettled) return
          isSettled = true
          
          this.logger.error(`⏱️ Subscription timeout for ${channelName}`)
          
          // Clean up the channel on timeout
          channelInfo.isSubscribing = false
          channelInfo.isSubscribed = false
          await this.removeChannelSafely(channel)
          this.channels.delete(channelName)
          
          reject(new Error(`Subscription timeout for ${channelName}`))
        }, this.SUBSCRIPTION_TIMEOUT)

        // Subscribe
        channel.subscribe((status, err) => {
          if (isSettled) return // Ignore callbacks after settlement
          
          if (status === 'SUBSCRIBED') {
            isSettled = true
            clearTimeout(timeoutId)
            channelInfo.isSubscribing = false
            channelInfo.isSubscribed = true
            this.logger.log(`✅ Subscribed: ${channelName}`)
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            isSettled = true
            clearTimeout(timeoutId)
            channelInfo.isSubscribing = false
            channelInfo.isSubscribed = false
            this.logger.error(`❌ Subscription error for ${channelName}:`, err)
            
            // Clean up the failed channel
            this.removeChannelSafely(channel).then(() => {
              this.channels.delete(channelName)
            })
            
            reject(err || new Error(`Subscription failed: ${status}`))
          } else if (status === 'CLOSED') {
            if (!isSettled) {
              isSettled = true
              clearTimeout(timeoutId)
            }
            channelInfo.isSubscribing = false
            channelInfo.isSubscribed = false
            this.logger.log(`🔌 Channel closed: ${channelName}`)
          }
        })
      } catch (error) {
        if (!isSettled) {
          isSettled = true
          if (timeoutId!) clearTimeout(timeoutId)
        }
        reject(error)
      }
    })
  }

  /**
   * Safely remove a channel, handling closed WebSocket states
   */
  private async removeChannelSafely(channel: RealtimeChannel): Promise<void> {
    if (!channel) return

    try {
      // Check channel state before attempting removal
      const state = channel.state
      
      if (state === 'closed' || state === 'errored') {
        // Already closed, just remove from Supabase's internal registry
        this.logger.log(`⏭️ Channel already ${state}, skipping disconnect`)
        return
      }

      await supabase.removeChannel(channel)
    } catch (error: any) {
      // Ignore WebSocket closed errors
      if (!error?.message?.includes('WebSocket is closed')) {
        this.logger.error('Error removing channel:', error)
      }
    }
  }

  /**
   * Wait for a channel to reach a specific state
   */
  private async waitForChannelState(
    channel: RealtimeChannel,
    targetState: string,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now()

    while (channel.state !== targetState) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for channel state: ${targetState}`)
      }
      await this.delay(100)
    }
  }

  /**
   * Setup network reconnection handler
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.logger.log('🌐 Network reconnected - resubscribing channels...')
      this.resubscribeAll()
    })

    window.addEventListener('offline', () => {
      this.logger.log('📡 Network disconnected')
    })
  }

  /**
   * Setup visibility change handler
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.logger.log('👀 Page visible - refreshing data...')
        // Trigger all callbacks to refresh data
        this.channels.forEach(info => {
          info.callbacks.forEach(cb => {
            try {
              cb()
            } catch (error) {
              this.logger.error('Error in visibility callback:', error)
            }
          })
        })
      }
    })
  }

  /**
   * Resubscribe all channels (for network reconnection)
   */
  private async resubscribeAll(): Promise<void> {
    const entries = Array.from(this.channels.entries())

    for (const [channelName, info] of entries) {
      try {
        // Remove old channel
        await this.removeChannelSafely(info.channel)
        
        // Create new subscription
        info.isSubscribed = false
        info.isSubscribing = true
        await this.createSubscription(info, info.config)
        
        // Trigger callbacks to refresh data
        info.callbacks.forEach(cb => {
          try {
            cb()
          } catch (error) {
            this.logger.error(`Error in resubscribe callback for ${channelName}:`, error)
          }
        })
      } catch (error) {
        this.logger.error(`Failed to resubscribe ${channelName}:`, error)
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get stats for debugging
   */
  getStats(): { channelCount: number; channels: string[] } {
    return {
      channelCount: this.channels.size,
      channels: Array.from(this.channels.keys())
    }
  }

  /**
   * Cleanup all channels (for testing/cleanup)
   */
  async cleanup(): Promise<void> {
    this.logger.log('🧹 Cleaning up all channels...')
    const promises = Array.from(this.channels.values()).map(info =>
      this.removeChannelSafely(info.channel)
    )
    await Promise.all(promises)
    this.channels.clear()
  }
}

// Export singleton instance
export const RealtimeManager = RealtimeManagerService.getInstance()
