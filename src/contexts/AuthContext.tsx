import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, UserRole, getUserProfile } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import { Database } from '../lib/database.types'
import loaderGif from '../assets/lodaer.gif'
import { RefreshCw } from 'lucide-react'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  userRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: User | null; userRole: UserRole | null }>
  signUp: (email: string, password: string, userData: { name: string; phone: string; role: UserRole }) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  invalidateAllSessions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const profile = await getUserProfile(userId)
      
      if (!profile) {
        console.warn('⚠️ No profile found for user:', userId)
        setUserProfile(null)
        setUserRole(null)
        return null
      }
      
      setUserProfile(profile)
      setUserRole(profile.role)
      return profile
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      // Don't set profile to null on error - keep existing profile if available
      // This prevents the app from breaking when there are temporary network issues
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Session error:', error)
          if (mounted) setLoading(false)
          return
        }
        
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            try {
              await loadUserProfile(session.user.id)
            } catch (profileError) {
              console.error('Profile load failed during init:', profileError)
            }
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setUserProfile(null)
          setUserRole(null)
          setLoading(false)
        }
      }
    }
    
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setUserProfile(null)
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Sign in error:', error)
        throw error
      }

      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error('Please verify your email address before signing in. Check your inbox for a verification link.')
      }
      
      // Load user profile to get role - wait for it to complete
      let profile = null
      if (data.user) {
        profile = await loadUserProfile(data.user.id)
        // Wait a bit to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Check for redirect path from session storage
      const redirectPath = sessionStorage.getItem('redirectPath')
      if (redirectPath) {
        // Clear it after retrieving
        sessionStorage.removeItem('redirectPath')
        // Navigate programmatically
        window.location.href = redirectPath
      }
      
      return { user: data.user, userRole: profile?.role || null }
    } catch (error) {
      console.error('💥 Sign in failed:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, userData: { name: string; phone: string; role: UserRole }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            role: userData.role,
          }
        }
      })
      
      if (error) {
        console.error('Sign up error:', error)
        throw error
      }

      // Don't return data, just complete successfully
    } catch (error) {
      console.error('Sign up failed:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // First, invalidate all active sessions globally
      const { error: globalSignOutError } = await supabase.auth.signOut({ scope: 'global' })
      if (globalSignOutError) {
        console.error('❌ Global sign out error:', globalSignOutError)
      }
      
      // Also perform local sign out as backup
      const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (localSignOutError) {
        console.error('❌ Local sign out error:', localSignOutError)
      }
      
      // Force refresh the auth session to ensure it's cleared
      await supabase.auth.refreshSession()
      
    } catch (error) {
      console.error('❌ Sign out error (non-blocking):', error)
      // Continue with local cleanup even if server sign out fails
    }
    
    // Always clear local state regardless of server response
    setUser(null)
    setUserProfile(null)
    setUserRole(null)
    
    // Clear all session/local storage aggressively
    try {
      // Clear all localStorage keys
      const localStorageKeys = Object.keys(localStorage)
      localStorageKeys.forEach(key => {
        if (key.startsWith('supabase') || 
            key.includes('auth') || 
            key.includes('session') || 
            key.includes('token') ||
            key.includes('sb-') ||
            key.includes('access_token') ||
            key.includes('refresh_token')) {
          localStorage.removeItem(key)
        }
      })
      
      // Clear all sessionStorage keys
      const sessionStorageKeys = Object.keys(sessionStorage)
      sessionStorageKeys.forEach(key => {
        if (key.startsWith('supabase') || 
            key.includes('auth') || 
            key.includes('session') || 
            key.includes('token') ||
            key.includes('sb-') ||
            key.includes('access_token') ||
            key.includes('refresh_token') ||
            key.includes('_last_user')) {  // Clear page load tracking
          sessionStorage.removeItem(key)
        }
      })
      
      // Also clear common application storage keys
      sessionStorage.removeItem('lastPath')
      sessionStorage.removeItem('redirectPath')
      sessionStorage.removeItem('userRole')
      sessionStorage.removeItem('userProfile')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userProfile')
      
      // Clear any cookies related to authentication
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
    } catch (storageError) {
      console.warn('⚠️ Storage cleanup error (non-critical):', storageError)
    }
    
    // Force a small delay to ensure all cleanup operations complete
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const invalidateAllSessions = async () => {
    try {
      // Force invalidate all sessions globally
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('❌ Session invalidation error:', error)
        throw error
      }
    } catch (error) {
      console.error('❌ Failed to invalidate sessions:', error)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    setUserProfile(data)
  }

  if (loading) {
    const handleClearAll = () => {
      console.log('🧹 Clearing all local storage and session data')
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }

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
    );
  }

  const value = {
    user,
    userProfile,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    invalidateAllSessions,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}