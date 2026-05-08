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
  signInWithGoogle: () => Promise<void>
  linkGoogleIdentity: () => Promise<void>
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

  const ensureUserProfileExists = async (authUser: User): Promise<UserProfile | null> => {
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) return existing

    const email = authUser.email
    if (!email) throw new Error('Missing email for authenticated user')

    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>
    const name = (meta.name as string) || (meta.full_name as string) || (meta.display_name as string) || null
    const phone = (meta.phone as string) || null
    const avatar_url = (meta.avatar_url as string) || (meta.picture as string) || null
    const role = ((meta.role as UserRole) || 'customer') satisfies UserRole

    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({ id: authUser.id, email, role, name, phone, avatar_url })
      .select('*')
      .single()

    if (insertError) {
      // If something else created it concurrently, just re-fetch.
      const { data: retry } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()
      return retry ?? null
    }

    return inserted
  }

  const maybeExchangeOAuthCodeForSession = async () => {
    try {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (!code || error) return

      // Some deployments/providers won't auto-exchange the PKCE code.
      // Doing it explicitly prevents getting stuck on an auth loading screen.
      await supabase.auth.exchangeCodeForSession(code)

      // Clean up OAuth params from the URL.
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      url.searchParams.delete('error')
      url.searchParams.delete('error_description')
      const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash
      window.history.replaceState({}, document.title, cleaned)
    } catch {
      // Ignore exchange failures; session validation below will handle the outcome.
    }
  }

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const profile = await getUserProfile(userId)
      
      if (!profile) {
        setUserProfile(null)
        setUserRole(null)
        return null
      }
      
      setUserProfile(profile)
      setUserRole(profile.role)
      return profile
    } catch (error) {
      // Don't set profile to null on error - keep existing profile if available
      // This prevents the app from breaking when there are temporary network issues
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    
    // Validate and refresh session
    const validateSession = async () => {
      try {
        await maybeExchangeOAuthCodeForSession()

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          if (mounted) {
            setUser(null)
            setUserProfile(null)
            setUserRole(null)
            setLoading(false)
          }
          return
        }

        // No session found
        if (!session) {
          if (mounted) {
            setUser(null)
            setUserProfile(null)
            setUserRole(null)
            setLoading(false)
          }
          return
        }

        // Check if token is expired
        const expiresAt = session.expires_at
        const now = Math.floor(Date.now() / 1000)
        const isExpired = expiresAt ? now >= expiresAt : false

        if (isExpired) {
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError || !refreshData.session) {
            // Force logout on expired session
            await supabase.auth.signOut()
            if (mounted) {
              setUser(null)
              setUserProfile(null)
              setUserRole(null)
              setLoading(false)
            }
            return
          }

          // Use refreshed session
          if (mounted) {
            setUser(refreshData.session.user)
            const profile = (await ensureUserProfileExists(refreshData.session.user))
            if (profile) {
              setUserProfile(profile)
              setUserRole(profile.role)
            } else {
              setUserProfile(null)
              setUserRole(null)
            }
            setLoading(false)
          }
        } else {
          // Valid session
          if (mounted) {
            setUser(session.user)
            try {
              const profile = (await ensureUserProfileExists(session.user))
              if (profile) {
                setUserProfile(profile)
                setUserRole(profile.role)
              } else {
                setUserProfile(null)
                setUserRole(null)
              }
            } catch (profileError) {
            }
            setLoading(false)
          }
        }
      } catch (error) {
        if (mounted) {
          setUser(null)
          setUserProfile(null)
          setUserRole(null)
          setLoading(false)
        }
      }
    }
    
    validateSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setUser(session?.user ?? null)
        if (session?.user) {
          let profile: UserProfile | null = null
          try {
            profile = await ensureUserProfileExists(session.user)
            if (profile) {
              setUserProfile(profile)
              setUserRole(profile.role)
            } else {
              setUserProfile(null)
              setUserRole(null)
            }
          } catch {
            // Keep existing profile/role if present
          }
          
          // If user is an agent, check approval status
          if (profile && profile.role === 'agent') {
            try {
              const { data: agentData, error } = await supabase
                .from('agents')
                .select('id, is_verified')
                .eq('user_id', session.user.id)
                .single()
              
              // If agent is not approved, sign them out
              if (error || !agentData || !agentData.is_verified) {
                console.log('Agent not approved, signing out...')
                await supabase.auth.signOut()
                return
              }
            } catch (err) {
              console.error('Error checking agent approval:', err)
              await supabase.auth.signOut()
              return
            }
          }
        } else {
          setUserProfile(null)
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    // Handle page visibility changes to refresh session
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) {
            setUser(null)
            setUserProfile(null)
            setUserRole(null)
            return
          }

          if (!session) {
            if (mounted) {
              setUser(null)
              setUserProfile(null)
              setUserRole(null)
            }
            return
          }

          // Check token expiration
          const expiresAt = session.expires_at
          const now = Math.floor(Date.now() / 1000)
          const isExpired = expiresAt ? now >= expiresAt : false

          if (isExpired) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            
            if (refreshError || !refreshData.session) {
              await supabase.auth.signOut()
              if (mounted) {
                setUser(null)
                setUserProfile(null)
                setUserRole(null)
              }
              return
            }

            if (mounted) {
              setUser(refreshData.session.user)
              await loadUserProfile(refreshData.session.user.id)
            }
          } else {
            // Valid session, just sync state
            if (mounted && session.user) {
              setUser(session.user)
              await loadUserProfile(session.user.id)
            }
          }
        } catch (error) {
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
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
        throw error
      }

      // Don't return data, just complete successfully
    } catch (error) {
      throw error
    }
  }

  const signInWithGoogle = async () => {
    // Use a single, stable callback URL so Supabase redirect allowlisting is easy
    // (and avoids falling back to an old localhost Site URL in production).
    const redirectTo = `${window.location.origin}/login`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) throw error

    // In most browsers supabase-js will redirect automatically,
    // but we also handle the returned URL defensively.
    if (data?.url) {
      window.location.assign(data.url)
    }
  }

  const linkGoogleIdentity = async () => {
    if (!user) throw new Error('No user logged in')

    // After linking, bounce back to profile.
    sessionStorage.setItem('redirectPath', '/profile')

    // Use the same stable callback URL we already allowlist.
    const redirectTo = `${window.location.origin}/login`

    // Requires an active session. This links the Google identity to the current user.
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) throw error

    if (data?.url) {
      window.location.assign(data.url)
    }
  }

  const signOut = async () => {
    try {
      // First, invalidate all active sessions globally
      const { error: globalSignOutError } = await supabase.auth.signOut({ scope: 'global' })
      if (globalSignOutError) {
      }
      
      // Also perform local sign out as backup
      const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (localSignOutError) {
      }
      
      // Force refresh the auth session to ensure it's cleared
      await supabase.auth.refreshSession()
      
    } catch (error) {
      // Continue with local cleanup even if server sign out fails
    }
    
    // Always clear local state regardless of server response
    setUser(null)
    setUserProfile(null)
    setUserRole(null)
    
    // Clear all session/local storage aggressively
    try {
      // Clear all localStorage keys (auth AND app data)
      const localStorageKeys = Object.keys(localStorage)
      localStorageKeys.forEach(key => {
        // Clear auth-related keys
        if (key.startsWith('supabase') || 
            key.includes('auth') || 
            key.includes('session') || 
            key.includes('token') ||
            key.includes('sb-') ||
            key.includes('access_token') ||
            key.includes('refresh_token')) {
          localStorage.removeItem(key)
        }
        
        // Clear ALL app-specific cached data to prevent data leakage
        if (key.includes('_data') ||
            key.includes('vehicles') ||
            key.includes('stations') ||
            key.includes('orders') ||
            key.includes('wallet') ||
            key.includes('transactions') ||
            key.includes('profile') ||
            key.includes('mechanics') ||
            key.includes('dashboard') ||
            key.includes('requestfuel') ||
            key.includes('requestmechanic')) {
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
            key.includes('_last_user')) {
          sessionStorage.removeItem(key)
        }
      })
      
      // Clear common application storage keys
      sessionStorage.removeItem('lastPath')
      sessionStorage.removeItem('redirectPath')
      sessionStorage.removeItem('userRole')
      sessionStorage.removeItem('userProfile')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userProfile')
      
      // Keep splashShown to avoid showing splash on re-login
      // sessionStorage 'splashShown' is intentionally NOT cleared
      
      // Clear any cookies related to authentication
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
    } catch (storageError) {
    }
    
    // Force a small delay to ensure all cleanup operations complete
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const invalidateAllSessions = async () => {
    try {
      // Force invalidate all sessions globally
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        throw error
      }
    } catch (error) {
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
    signInWithGoogle,
    linkGoogleIdentity,
    signOut,
    updateProfile,
    invalidateAllSessions,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}