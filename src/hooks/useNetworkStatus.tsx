import { useEffect, useState } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
}

/**
 * Hook to detect and monitor network connectivity status
 * Handles online/offline transitions and provides reconnection state
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    wasOffline: false,
  })

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network reconnected')
      setStatus(prev => ({
        isOnline: true,
        isOffline: false,
        wasOffline: prev.isOffline, // Track if we were offline (for reconnection logic)
      }))
    }

    const handleOffline = () => {
      console.log('📡 Network disconnected')
      setStatus({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
      })
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    setStatus({
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      wasOffline: false,
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
