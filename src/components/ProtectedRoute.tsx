import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../lib/supabase'
import loaderGif from '../assets/lodaer.gif'
import { RefreshCw } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  redirectTo?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/login'
}) => {
  const { user, userRole, loading } = useAuth()
  const location = useLocation()

  // Store the current path in session storage when navigating to protected routes
  useEffect(() => {
    if (user && !loading) {
      sessionStorage.setItem('lastPath', location.pathname)
    }
  }, [user, loading, location.pathname])

  const handleClearAll = () => {
    console.log('🧹 Clearing all local storage and session data')
    
    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Force reload to clear any cached state
    window.location.href = '/'
  }

  // Show loading if auth is still initializing OR if user exists but role hasn't loaded yet
  if (loading || (user && requiredRole && !userRole)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[1000]" style={{ backgroundColor: '#ef1b22' }}>
        {/* Clear & Refresh Button - Top Right */}
        <button
          onClick={handleClearAll}
          className="absolute top-6 right-6 p-3 text-white hover:text-white/80 transition-all duration-300 hover:scale-110"
          title="Clear All Data & Refresh"
        >
          <RefreshCw className="h-6 w-6" />
        </button>
        
        <div className="text-center relative">
          <img 
            src={loaderGif} 
            alt="Loading..."
            className="w-48 h-48 mx-auto object-contain"
          />
          <p className="mt-4 text-xl font-medium text-white">Just a moment while we verify your account...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Store the attempted path to redirect back after login
    sessionStorage.setItem('redirectPath', location.pathname)
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}