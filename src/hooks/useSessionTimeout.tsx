import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number
  warningMinutes?: number
  onTimeout?: () => void
  onWarning?: () => void
}

export const useSessionTimeout = ({
  timeoutMinutes = 60, // Default 1 hour
  warningMinutes = 5,  // Warning 5 minutes before timeout
  onTimeout,
  onWarning
}: UseSessionTimeoutOptions = {}) => {
  const { signOut, user } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeoutMinutes * 60)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = () => {
    if (!user) return

    lastActivityRef.current = Date.now()
    setShowWarning(false)
    setTimeLeft(timeoutMinutes * 60)

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      onWarning?.()
      
      // Start countdown interval
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000)
        const remaining = (timeoutMinutes * 60) - elapsed
        
        if (remaining <= 0) {
          handleTimeout()
        } else {
          setTimeLeft(remaining)
        }
      }, 1000)
      
    }, (timeoutMinutes - warningMinutes) * 60 * 1000)

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout()
    }, timeoutMinutes * 60 * 1000)
  }

  const handleTimeout = async () => {
    console.log('🕐 Session timeout - automatically signing out user')
    
    // Clear all timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    setShowWarning(false)
    onTimeout?.()
    
    try {
      await signOut()
    } catch (error) {
      console.error('Error during automatic sign out:', error)
    }
  }

  const extendSession = () => {
    console.log('🔄 Session extended by user action')
    resetTimer()
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (!user) {
      // Clear timers if user is not logged in
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    // Set up activity listeners
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const resetOnActivity = () => {
      resetTimer()
    }

    activities.forEach(activity => {
      document.addEventListener(activity, resetOnActivity, true)
    })

    // Initialize timer
    resetTimer()

    return () => {
      // Cleanup
      activities.forEach(activity => {
        document.removeEventListener(activity, resetOnActivity, true)
      })
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, timeoutMinutes, warningMinutes])

  return {
    showWarning,
    timeLeft,
    formattedTimeLeft: formatTime(timeLeft),
    extendSession,
    resetTimer
  }
}
