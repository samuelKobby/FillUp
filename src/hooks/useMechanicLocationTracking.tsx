import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface LocationState {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface UseMechanicLocationTrackingOptions {
  enabled?: boolean
  updateInterval?: number // in milliseconds
  highAccuracy?: boolean
}

/**
 * Hook for tracking and updating mechanic location in real-time
 * This enables the auto-assignment system to find nearest mechanics
 * 
 * @param options Configuration options
 * @returns Current location state and tracking status
 */
export const useMechanicLocationTracking = (options: UseMechanicLocationTrackingOptions = {}) => {
  const { user, userRole } = useAuth()
  const {
    enabled = true,
    updateInterval = 30000, // Update every 30 seconds
    highAccuracy = true
  } = options

  const [location, setLocation] = useState<LocationState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Only track location for agents with mechanic service type
  const shouldTrack = enabled && user && (userRole === 'agent')

  const updateLocationInDatabase = async (lat: number, lng: number) => {
    if (!user?.id) return

    try {
      // Update agent's current location
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          current_location: `(${lng},${lat})`, // PostGIS point format (longitude, latitude)
          last_location_update: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('service_type', ['mechanic', 'both'])

      if (updateError) {
        console.error('Failed to update mechanic location:', updateError)
        setError(updateError.message)
      } else {
        console.log('✅ Mechanic location updated:', { lat, lng })
      }
    } catch (err) {
      console.error('Error updating location:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleLocationUpdate = (position: GeolocationPosition) => {
    const newLocation: LocationState = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    }

    setLocation(newLocation)
    setError(null)

    // Update database with new location
    updateLocationInDatabase(newLocation.latitude, newLocation.longitude)
  }

  const handleLocationError = (err: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error'
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.'
        break
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.'
        break
      case err.TIMEOUT:
        errorMessage = 'Location request timed out.'
        break
    }

    console.error('Location error:', errorMessage, err)
    setError(errorMessage)
  }

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    if (watchIdRef.current !== null) {
      // Already tracking
      return
    }

    setIsTracking(true)

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 10000,
      maximumAge: 0
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    )

    // Watch for position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    )

    // Set up periodic updates (even if position hasn't changed much)
    updateTimerRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handleLocationUpdate,
        handleLocationError,
        options
      )
    }, updateInterval)

    console.log('🎯 Mechanic location tracking started')
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (updateTimerRef.current !== null) {
      clearInterval(updateTimerRef.current)
      updateTimerRef.current = null
    }

    setIsTracking(false)
    console.log('⏹️ Mechanic location tracking stopped')
  }

  // Auto-start/stop tracking based on conditions
  useEffect(() => {
    if (shouldTrack) {
      startTracking()
    } else {
      stopTracking()
    }

    // Cleanup on unmount
    return () => {
      stopTracking()
    }
  }, [shouldTrack])

  // Update location when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldTrack && location) {
        // Force location update when app becomes visible
        navigator.geolocation.getCurrentPosition(
          handleLocationUpdate,
          handleLocationError,
          { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0 }
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [shouldTrack, location])

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking
  }
}
