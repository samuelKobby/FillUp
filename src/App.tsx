import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Footer } from './components/layout/Footer'
import { PageTransition } from './components/layout/PageTransition'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SplashScreen } from './components/SplashScreen'
import { motion } from 'framer-motion'
import { Landing } from './pages/Landing'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { AgentRegister } from './pages/auth/AgentRegister'
import { StationRegister } from './pages/auth/StationRegister'
import { EmailVerification } from './pages/auth/EmailVerification'
import { EmailConfirmation } from './pages/auth/EmailConfirmation'
import { ApplicationSubmitted } from './pages/auth/ApplicationSubmitted'
import { AdminLogin } from './pages/auth/AdminLogin'
import { AgentLogin } from './pages/auth/AgentLogin'
import { StationLogin } from './pages/auth/StationLogin'
import { Dashboard } from './pages/Dashboard'
import { RequestFuel } from './pages/RequestFuel'
import { RequestMechanic } from './pages/RequestMechanic'
import { OrderHistory } from './pages/OrderHistory'
import { OrderDetails } from './pages/OrderDetails'
import { OrderTracking } from './pages/OrderTracking'
import { Wallet } from './pages/Wallet'
import { Vehicles } from './pages/Vehicles'
import { Profile } from './pages/Profile'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminAgents } from './pages/admin/AdminAgents'
import { AdminStations } from './pages/admin/AdminStations'
import { AdminOrders } from './pages/admin/AdminOrders'
import { AgentApplications } from './pages/admin/AgentApplications'
import { AgentApplicationDetail } from './pages/admin/AgentApplicationDetail'
import { AgentDashboard } from './pages/agent/AgentDashboard'
import { NewOrderScreen } from './pages/agent/NewOrderScreen'
import { StationDashboard } from './pages/station/StationDashboard'
import { DebugPage } from './pages/DebugPage'
import { useState, useEffect } from 'react'
import loaderGif from './assets/lodaer.gif'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { OfflineIndicator } from './components/OfflineIndicator'
import { Toaster } from 'react-hot-toast'

// Component to handle browser refresh - only redirects from root/landing pages
const RedirectOnRefresh: React.FC = () => {
  const { user, userRole, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Only run this once when component mounts
    if (hasRedirected || loading || !user || !userRole) return
    
    // Check if this is a page refresh using modern Navigation Timing API
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const isRefresh = navEntry?.type === 'reload'
    
    // Only redirect from root/landing pages, preserve deep links
    const shouldRedirect = isRefresh && (
      location.pathname === '/' || 
      location.pathname === '/app' ||
      location.pathname === '/login' ||
      location.pathname === '/register'
    )
    
    if (shouldRedirect) {
      // Mark that we've done the redirect
      setHasRedirected(true)
      
      // Redirect to default dashboard based on role
      switch (userRole) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true })
          break
        case 'agent':
          navigate('/agent/dashboard', { replace: true })
          break
        case 'station':
          navigate('/station/dashboard', { replace: true })
          break
        case 'customer':
          navigate('/dashboard', { replace: true })
          break
      }
    }
  }, [user, userRole, loading, hasRedirected, navigate, location.pathname])

  return null
}

// Layout component that conditionally renders header/footer
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole } = useAuth()
  const location = useLocation()

  // Check if current path is an auth page (login, register, etc.)
  const isAuthPage = location.pathname.includes('/login') || 
                     location.pathname.includes('/register') ||
                     location.pathname.includes('/verify-email') ||
                     location.pathname.includes('/application-submitted')

  // Show footer on landing page (no user) and non-customer/non-dashboard pages
  const showFooter = !isAuthPage &&
                    !location.pathname.includes('/admin') &&
                    !location.pathname.includes('/agent') &&
                    !location.pathname.includes('/station') &&
                    (!user || (userRole !== 'customer' && !location.pathname.includes('/dashboard')))

  return (
    <>
      {children}
      {showFooter && <Footer />}
    </>
  )
}

// Role-based redirect component
const RoleBasedRedirect: React.FC = () => {
  const { user, userRole, loading } = useAuth()

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[1000]" style={{ backgroundColor: '#ef1b22' }}>
        <div className="text-center">
          <img 
            src={loaderGif} 
            alt="Loading..."
            className="w-48 h-48 mx-auto object-contain"
          />
          <p className="mt-4 text-xl font-medium text-white">Checking your access...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  // Redirect based on user role
  switch (userRole) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />
    case 'agent':
      return <Navigate to="/agent/dashboard" replace />
    case 'station':
      return <Navigate to="/station/dashboard" replace />
    default:
      return <Navigate to="/dashboard" replace /> // Customer goes to dashboard
  }
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Don't show splash if this is an auto-refresh
    const isAutoRefresh = sessionStorage.getItem('autoRefresh')
    if (isAutoRefresh) {
      sessionStorage.removeItem('autoRefresh')
      sessionStorage.setItem('splashShown', 'true')
      return false
    }
    
    // Check if splash was already shown this session
    const hasSeenSplash = sessionStorage.getItem('splashShown')
    return !hasSeenSplash
  })
  const [splashExiting, setSplashExiting] = useState(false)
  const { isOffline } = useNetworkStatus()

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true')
    setSplashExiting(true)
    // Unmount splash after animation completes
    setTimeout(() => {
      setShowSplash(false)
    }, 500)
  }

  // Auto-refresh page when tab becomes visible after being hidden
  useEffect(() => {
    let hiddenTime: number | null = null
    const REFRESH_THRESHOLD = 0 // Refresh immediately on any tab switch

    const handleVisibilityChange = () => {
      console.log('Visibility changed:', document.visibilityState, 'hidden:', document.hidden)
      
      if (document.hidden) {
        // Tab is hidden - record timestamp
        hiddenTime = Date.now()
        console.log('Tab hidden at:', hiddenTime)
      } else {
        // Tab is visible
        console.log('Tab visible, hiddenTime:', hiddenTime)
        
        if (hiddenTime) {
          // Tab was previously hidden - check duration
          const hiddenDuration = Date.now() - hiddenTime
          console.log('Hidden duration:', hiddenDuration, 'ms, threshold:', REFRESH_THRESHOLD)
          
          if (hiddenDuration >= REFRESH_THRESHOLD) {
            // Check if Google Maps is active or loading
            const hasGoogleMapsScript = document.querySelector('[src*="maps.googleapis.com"]')
            const hasGoogleMapsComponent = document.querySelector('[class*="gm-style"]') || 
                                          document.querySelector('[style*="maps.gstatic"]')
            
            console.log('Google Maps check - script:', !!hasGoogleMapsScript, 'component:', !!hasGoogleMapsComponent)
            
            // Only refresh if Google Maps is not being used at all
            if (!hasGoogleMapsScript && !hasGoogleMapsComponent) {
              console.log('Triggering page refresh...')
              
              // Mark that auto-refresh is happening (prevent splash screen)
              sessionStorage.setItem('autoRefresh', 'true')
              
              // Use hard reload to bypass cache
              setTimeout(() => {
                window.location.reload()
              }, 100)
            } else {
              console.log('Skipping refresh - Google Maps detected')
            }
          }
          
          hiddenTime = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <Router>
      <AuthProvider>
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        {/* Offline Indicator */}
        <OfflineIndicator isOffline={isOffline} />
        
        {showSplash && <SplashScreen onComplete={handleSplashComplete} duration={7000} />}
        
        {/* Main content with slide-up animation */}
        <motion.div
          initial={{ y: showSplash ? '100vh' : 0 }}
          animate={{ 
            y: splashExiting || !showSplash ? 0 : '100vh'
          }}
          transition={{
            duration: showSplash ? 0.5 : 0,
            ease: [0.43, 0.13, 0.23, 0.96],
          }}
          className="relative min-h-screen"
        >
          <RedirectOnRefresh />
          <Layout>
          <PageTransition>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing showSplash={showSplash} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/agent/register" element={<AgentRegister />} />
              <Route path="/station/register" element={<StationRegister />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/email-confirmation" element={<EmailConfirmation />} />
              <Route path="/application-submitted" element={<ApplicationSubmitted />} />
              <Route path="/debug" element={<DebugPage />} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/agents" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAgents />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/agent-applications" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AgentApplications />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/agent-applications/:id" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AgentApplicationDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/stations" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminStations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/orders" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminOrders />
                </ProtectedRoute>
              } 
            />
            
            {/* Agent routes */}
            <Route path="/agent/login" element={<AgentLogin />} />
            <Route 
              path="/agent/dashboard" 
              element={
                <ProtectedRoute requiredRole="agent">
                  <AgentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agent/new-order/:orderId" 
              element={
                <ProtectedRoute requiredRole="agent">
                  <NewOrderScreen />
                </ProtectedRoute>
              } 
            />
            
            {/* Station routes */}
            <Route path="/station/login" element={<StationLogin />} />
            <Route 
              path="/station/dashboard" 
              element={
                <ProtectedRoute requiredRole="station">
                  <StationDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected customer routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/request-fuel" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <RequestFuel />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/request-mechanic" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <RequestMechanic />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <OrderHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/wallet" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <Wallet />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/vehicles" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <Vehicles />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/order/:id" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <OrderDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/track-order/:id" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <OrderTracking />
                </ProtectedRoute>
              } 
            />
            
            {/* Role-based redirect route */}
            <Route path="/app" element={<RoleBasedRedirect />} />
            
            {/* Profile Page */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* Placeholders for other pages */}
            <Route path="/support" element={<div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Support - Coming Soon</h1></div>} />
            <Route path="/rate-service" element={<div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Rate Service - Coming Soon</h1></div>} />
            <Route path="/terms" element={<div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Terms of Service - Coming Soon</h1></div>} />
            <Route path="/privacy" element={<div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Privacy Policy - Coming Soon</h1></div>} />
            <Route path="/business" element={<div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Business Solutions - Coming Soon</h1></div>} />
            <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Unauthorized Access</h1></div>} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </PageTransition>
        </Layout>
        </motion.div>
      </AuthProvider>
    </Router>
  )
}

export default App