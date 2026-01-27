import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Fuel } from 'lucide-react'
import heroImg from '../../assets/hero.png'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, user, userRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      // Get the redirect path from session storage or state
      const redirectPath = sessionStorage.getItem('redirectPath') || 
                          (location.state as any)?.from?.pathname || 
                          getDefaultRedirectPath(userRole)
      
      navigate(redirectPath, { replace: true })
    }
  }, [user, userRole, navigate, location])

  const getDefaultRedirectPath = (role: string | null) => {
    switch (role) {
      case 'admin': return '/admin/dashboard'
      case 'agent': return '/agent/dashboard'
      case 'station': return '/station/dashboard'
      default: return '/dashboard'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn(email, password)
      
      // If user is an agent, check approval status
      if (result.userRole === 'agent') {
        const { supabase } = await import('../../lib/supabase')
        
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id, is_verified')
          .eq('user_id', result.user.id)
          .single()
        
        if (agentError || !agentData || !agentData.is_verified) {
          setError('Your agent application is still pending admin approval. You will be notified via email once approved.')
          setLoading(false)
          return
        }
      }
      
      // Get the redirect path from session storage or state
      const redirectPath = sessionStorage.getItem('redirectPath') || 
                          (location.state as any)?.from?.pathname || 
                          getDefaultRedirectPath(result.userRole)
      
      navigate(redirectPath, { replace: true })
      
    } catch (err: any) {
      console.error('Login error:', err)
      
      // Handle specific error cases
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else if (err.message?.includes('verify your email')) {
        setError(err.message)
        // Optionally redirect to verification page
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`)
        }, 3000)
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email address before signing in.')
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`)
        }, 3000)
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Mobile Hero Section */}
      <div className="relative h-80 overflow-hidden lg:hidden">
        <img 
          src={heroImg} 
          alt="FillUp Service" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-12 left-4 p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Logo and Title */}
        <div className="absolute bottom-8 left-4 right-4">
          <div className="flex items-center mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl backdrop-blur-sm">
              <Fuel className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h1 className="text-3xl font-bold text-white">Welcome back</h1>
              <p className="text-white text-opacity-90">Sign in to your FillUp account</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Left Side - Background Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-8 left-8 p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm hover:bg-opacity-30 transition-all z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Content */}
        <div className="relative z-10 text-center px-12">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-wider drop-shadow-2xl">
            FUEL YOUR JOURNEY:
          </h1>
          <h2 className="text-6xl font-black text-white tracking-widest drop-shadow-2xl">
            FILLUP CUSTOMER APP
          </h2>
        </div>
      </div>

      {/* Content - Mobile: white rounded top / Desktop: white form */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 lg:rounded-none lg:mt-0 lg:w-1/2 lg:flex lg:items-center lg:justify-center lg:p-8">
        <div className="px-6 pt-8 pb-6 lg:w-full lg:max-w-md lg:px-0">
          {/* Welcome Text - Desktop only */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
            <p className="text-gray-600">Sign in to access your account</p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg lg:rounded-xl mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative lg:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none lg:hidden">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 lg:pl-4 pr-3 py-3 border border-gray-300 rounded-lg lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none lg:hidden">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 lg:pl-4 pr-10 py-3 border border-gray-300 rounded-lg lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-lg py-3 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 rounded-2xl font-bold transition-all hover:scale-105"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider - Mobile only */}
          <div className="mt-6 lg:hidden">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to FillUp?</span>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-blue-600 hover:text-blue-500 font-semibold transition-colors">
              Create Account
            </Link>
          </div>

          {/* Other Login Options */}
          <div className="mt-8 pt-6 border-t border-gray-200 lg:border-0 lg:mt-6 lg:pt-0">
            <p className="text-center text-sm text-gray-600 mb-4 lg:hidden">
              Looking for a different portal?
            </p>
            <div className="grid grid-cols-2 gap-3 lg:block lg:text-center">
              <Link to="/agent/login" className="lg:hidden">
                <Button variant="ghost" className="w-full text-sm">
                  Agent Login
                </Button>
              </Link>
              <Link to="/station/login" className="lg:hidden">
                <Button variant="ghost" className="w-full text-sm">
                  Station Login
                </Button>
              </Link>
              <div className="hidden lg:block">
                <span className="text-gray-600 text-sm">Business access: </span>
                <Link to="/agent/login" className="text-blue-600 hover:text-blue-500 text-sm transition-colors mx-2">
                  Agent
                </Link>
                <span className="text-gray-400">•</span>
                <Link to="/station/login" className="text-blue-600 hover:text-blue-500 text-sm transition-colors mx-2">
                  Station
                </Link>
              </div>
            </div>
          </div>

          {/* Footer - Desktop only */}
          <div className="hidden lg:block mt-16 text-center text-gray-500 text-sm">
            <p>© 2025, Made with ❤️ by FillUp Team for a better Ghana</p>
            <div className="flex justify-center gap-6 mt-2">
              <Link to="/" className="hover:text-gray-700 transition-colors">Home</Link>
              <Link to="/" className="hover:text-gray-700 transition-colors">Support</Link>
              <Link to="/" className="hover:text-gray-700 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}