import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, UserRole } from '../lib/supabase'
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
  signInWithGoogle: (role?: UserRole) => Promise<void>
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

  const OAUTH_INTENDED_ROLE_KEY = 'oauth_intended_role'
  const USER_ROLE_CACHE_PREFIX = 'user_role:'

  const parseUserRole = (value: unknown): UserRole | null => {
    if (typeof value !== 'string') return null
    const allowed: UserRole[] = ['customer', 'agent', 'station', 'admin']
    return allowed.includes(value as UserRole) ? (value as UserRole) : null
  }

  const getOptimisticRole = (authUser: User): UserRole | null => {
    try {
      const fromSession = parseUserRole(sessionStorage.getItem(OAUTH_INTENDED_ROLE_KEY))
      if (fromSession) return fromSession

      const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>
      const fromMeta = parseUserRole(meta.role)
      if (fromMeta) return fromMeta

      const fromCache = parseUserRole(localStorage.getItem(`${USER_ROLE_CACHE_PREFIX}${authUser.id}`))
      return fromCache
    } catch {
      return null
    }
  }

  const persistUserRole = (userId: string, role: UserRole) => {
    try {
      localStorage.setItem(`${USER_ROLE_CACHE_PREFIX}${userId}`, role)
    } catch {
      // Ignore storage failures
    }
  }

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
    
    // Check if we saved an intended role from the Google sign up flow, otherwise default to customer
    const intendedRole = parseUserRole(sessionStorage.getItem(OAUTH_INTENDED_ROLE_KEY))
    const role = (intendedRole || (meta.role as UserRole) || 'customer') satisfies UserRole

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
    // We use /login as the OAuth callback; this makes the allowlist simple.
    // Some deployments/providers won't auto-exchange the PKCE code, so we do it.
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const authError = url.searchParams.get('error')

    if (authError) {
      // Clean up OAuth params even on failure to avoid loops.
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      url.searchParams.delete('error')
      url.searchParams.delete('error_description')
      const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash
      window.history.replaceState({}, document.title, cleaned)
      return
    }

    if (!code) return

    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch {
      // Non-fatal: supabase-js might have already processed the code (detectSessionInUrl)
      // or the exchange can fail transiently. We'll rely on getSession() next.
    } finally {
      // Always clean up OAuth params from the URL.
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      url.searchParams.delete('error')
      url.searchParams.delete('error_description')
      const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash
      window.history.replaceState({}, document.title, cleaned)
    }
  }

  const hydrateProfileForUser = async (authUser: User, isMounted: () => boolean) => {
    try {
      const profile = await ensureUserProfileExists(authUser)
      if (!isMounted()) return

      if (profile) {
        setUserProfile(profile)
        setUserRole(profile.role)
        persistUserRole(authUser.id, profile.role)
      }

      // Only clear the intended role once we have a real profile/role loaded.
      try {
        sessionStorage.removeItem(OAUTH_INTENDED_ROLE_KEY)
      } catch {
        // ignore
      }
    } catch {
      // Keep optimistic role if we set one.
    }
  }

  useEffect(() => {
    let mounted = true

    const applySignedOut = () => {
      setUser(null)
      setUserProfile(null)
      setUserRole(null)
    }

    const applySignedIn = (authUser: User) => {
      setUser(authUser)
      const optimisticRole = getOptimisticRole(authUser)
      if (optimisticRole) {
        setUserRole(prev => prev ?? optimisticRole)
      }
      setLoading(false)
      void hydrateProfileForUser(authUser, () => mounted)
    }

    const init = async () => {
      try {
        setLoading(true)
        await maybeExchangeOAuthCodeForSession()

        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted) return

        if (error || !session?.user) {
          applySignedOut()
          setLoading(false)
          return
        }

        applySignedIn(session.user)
      } catch {
        if (!mounted) return
        applySignedOut()
        setLoading(false)
      }
    }

    void init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (!session?.user) {
          applySignedOut()
          setLoading(false)
          return
        }

        // Keep the UX responsive: set auth state immediately, hydrate profile async.
        setUser(session.user)
        const optimisticRole = getOptimisticRole(session.user)
        if (optimisticRole) {
          setUserRole(prev => prev ?? optimisticRole)
        }
        setLoading(false)

        void (async () => {
          const profile = await ensureUserProfileExists(session.user)
          if (!mounted) return

          if (profile) {
            setUserProfile(profile)
            setUserRole(profile.role)
            persistUserRole(session.user.id, profile.role)
            try {
              sessionStorage.removeItem(OAUTH_INTENDED_ROLE_KEY)
            } catch {
              // ignore
            }
          }

          // If user is an agent, check approval status
          if (profile && profile.role === 'agent') {
            try {
              const { data: agentData, error } = await supabase
                .from('agents')
                .select('id, is_verified')
                .eq('user_id', session.user.id)
                .single()

              if (error || !agentData || !agentData.is_verified) {
                await supabase.auth.signOut()
              }
            } catch {
              await supabase.auth.signOut()
            }
          }
        })()
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
        throw error
      }

      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error('Please verify your email address before signing in. Check your inbox for a verification link.')
      }

      let profile: UserProfile | null = null
      if (data.user) {
        // Ensure profile exists and use it as the source of truth for role.
        profile = await ensureUserProfileExists(data.user)
        if (profile) {
          setUserProfile(profile)
          setUserRole(profile.role)
          persistUserRole(data.user.id, profile.role)
        }
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

  const signInWithGoogle = async (role?: UserRole) => {
    if (role) {
      sessionStorage.setItem('oauth_intended_role', role)
    }
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