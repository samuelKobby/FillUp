import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UseAgentLocationTrackingOptions {
  enabled: boolean // Only track when agent has active order
  updateInterval?: number // Update frequency in milliseconds (default: 10 seconds)
}

export const useAgentLocationTracking = ({ 
  enabled, 
  updateInterval = 10000 
}: UseAgentLocationTrackingOptions) => {
  const { user, userProfile } = useAuth()
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!enabled || !user || userProfile?.role !== 'agent') {
      stopTracking()
      return
    }

    startTracking()

    return () => {
      stopTracking()
    }
  }, [enabled, user, userProfile?.role])

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    console.log('🚗 Starting GPS tracking...')
    setIsTracking(true)
    setError(null)

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        console.error('GPS error:', err)
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    // Watch for position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        
        // Store latest position
        lastPositionRef.current = { lat: latitude, lng: longitude }
        
        console.log('📍 GPS position updated:', latitude, longitude)
      },
      (err) => {
        console.error('GPS watch error:', err)
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    // Set up periodic updates to database
    updateTimerRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        updateLocation(lastPositionRef.current.lat, lastPositionRef.current.lng)
      }
    }, updateInterval)
  }

  const stopTracking = () => {
    console.log('🛑 Stopping GPS tracking...')
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current)
      updateTimerRef.current = null
    }

    setIsTracking(false)
    lastPositionRef.current = null
  }

  const updateLocation = async (latitude: number, longitude: number) => {
    if (!user) return

    try {
      // Get agent ID
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (agentError || !agentData) {
        console.error('Failed to get agent ID:', agentError)
        return
      }

      // Update location using PostGIS function with RPC call
      const { error: updateError } = await supabase.rpc('update_agent_location', {
        agent_id: agentData.id,
        lat: latitude,
        lng: longitude
      })

      if (updateError) {
        console.error('Failed to update location:', updateError)
        setError('Failed to update location')
      } else {
        console.log('✅ Location updated in database:', latitude, longitude)
        setLastUpdate(new Date())
        setError(null)
      }
    } catch (err) {
      console.error('Error updating location:', err)
      setError('Failed to update location')
    }
  }

  return {
    isTracking,
    error,
    lastUpdate,
    startTracking,
    stopTracking
  }
}
