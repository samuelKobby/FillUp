import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Shield, AlertTriangle, Bug } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { debugUserData } from '../../lib/supabase'

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('fueldrop048@gmail.com') // Pre-fill for testing
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  const { signIn, user, userRole, signOut } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user && userRole === 'admin') {
      console.log('✅ Already logged in as admin, redirecting...')
      navigate('/admin/dashboard', { replace: true })
    }
  }, [user, userRole, navigate])

  const handleDebug = async () => {
    console.log('🐛 Running debug check...')
    const debug = await debugUserData()
    setDebugInfo(debug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Admin login attempt for:', email)
      const result = await signIn(email, password)
      
      console.log('📊 Login result:', result)
      
      // Check if user has admin role
      if (result.userRole !== 'admin') {
        console.log('❌ User role is not admin:', result.userRole)
        setError(`Access denied. This account has role: ${result.userRole || 'unknown'}. Administrator privileges required.`)
        // Sign out the non-admin user
        await signOut()
        return
      }

      console.log('✅ Admin login successful, redirecting to dashboard')
      
      // Wait a moment for state to update, then navigate
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true })
      }, 200)
      
    } catch (err: any) {
      console.error('💥 Admin login error:', err)
      
      // Handle specific error cases
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid administrator credentials. Please check your email and password.')
      } else if (err.message?.includes('verify your email')) {
        setError('Please verify your email address before accessing the admin panel.')
      } else {
        setError(err.message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-3 rounded-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Admin Access</h2>
            <p className="text-gray-600 mt-2">Secure login for administrators</p>
          </div>

          {/* Debug Button */}
          <div className="mb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDebug}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Bug className="h-4 w-4" />
              <span>Debug Database</span>
            </Button>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg text-xs">
              <h4 className="font-semibold mb-2">Debug Info:</h4>
              <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Security Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                This is a restricted area. All access attempts are logged and monitored.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="admin@fillup.gh"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-lg py-3 bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </form>

          {/* Back to Main Site */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ← Back to FillUp
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}