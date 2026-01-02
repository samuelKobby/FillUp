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
  const [rememberMe, setRememberMe] = useState(false)
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
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Background Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1545262810-77515befe149?q=80&w=1974&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/70 to-purple-900/80" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-12">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-wider drop-shadow-2xl">
            POWERING GHANA'S FUTURE:
          </h1>
          <h2 className="text-6xl font-black text-white tracking-widest drop-shadow-2xl">
            THE FILLUP ADMIN PORTAL
          </h2>
        </div>

        {/* Bottom glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            background: 'linear-gradient(to top, rgba(139, 92, 246, 0.5) 0%, transparent 100%)'
          }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8" style={{ background: '#0b1437' }}>
        <div className="w-full max-w-md">
          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Welcome Admin!</h2>
            <p className="text-gray-400">Enter your credentials to access the admin dashboard</p>
          </div>

          {/* Debug Button */}
          {debugInfo !== null && (
            <div className="mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDebug}
                className="w-full flex items-center justify-center space-x-2 text-gray-400 hover:text-white"
              >
                <Bug className="h-4 w-4" />
                <span>Debug Database</span>
              </Button>
            </div>
          )}

          {/* Debug Info */}
          {debugInfo && (
            <div className="mb-6 p-4 bg-white/5 rounded-lg text-xs border border-white/10">
              <h4 className="font-semibold mb-2 text-white">Debug Info:</h4>
              <pre className="whitespace-pre-wrap overflow-auto max-h-40 text-gray-300">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Your email..."
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors pr-10"
                  placeholder="Your password..."
                  style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Switch */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rememberMe ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rememberMe ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-3 text-white text-sm">Remember me</span>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4)'
              }}
            >
              {loading ? 'HI DEAR, WAIT A MOMENT...' : 'SIGN IN'}
            </button>
          </form>

          {/* Back to Home Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-400">Not an admin? </span>
            <Link to="/" className="text-white font-semibold hover:text-blue-400 transition-colors">
              Go to Customer App
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center text-gray-500 text-sm">
            <p>© 2025, Made with ❤️ by FillUp Team for a better Ghana</p>
            <div className="flex justify-center gap-6 mt-2">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/" className="hover:text-white transition-colors">Support</Link>
              <Link to="/" className="hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}