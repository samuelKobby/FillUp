import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Footer } from './components/layout/Footer'
import { PageTransition } from './components/layout/PageTransition'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { AgentRegister } from './pages/auth/AgentRegister'
import { StationRegister } from './pages/auth/StationRegister'
import { EmailVerification } from './pages/auth/EmailVerification'
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
import { StationDashboard } from './pages/station/StationDashboard'
import { DebugPage } from './pages/DebugPage'
import { useState, useEffect } from 'react'
import loaderGif from './assets/lodaer.gif'

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
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <PageTransition>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/agent/register" element={<AgentRegister />} />
              <Route path="/station/register" element={<StationRegister />} />
              <Route path="/verify-email" element={<EmailVerification />} />
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
      </AuthProvider>
    </Router>
  )
}

export default App