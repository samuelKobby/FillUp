import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Fuel, AlertTriangle, MapPin } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'

export const StationLogin: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, user, userRole } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in as station
  useEffect(() => {
    if (user && userRole === 'station') {
      navigate('/station/dashboard', { replace: true })
    }
  }, [user, userRole, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Station login attempt for:', email)
      const result = await signIn(email, password)
      
      console.log('Login result:', result)
      
      // Check if user has station role
      if (result.userRole !== 'station') {
        console.log('User role is not station:', result.userRole)
        setError(`Access denied. This account has role: ${result.userRole || 'unknown'}. Station access required.`)
        return
      }

      console.log('Station login successful, redirecting to dashboard')
      navigate('/station/dashboard', { replace: true })
      
    } catch (err: any) {
      console.error('Station login error:', err)
      
      // Handle specific error cases
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid station credentials. Please check your email and password.')
      } else if (err.message?.includes('verify your email')) {
        setError('Please verify your email address before accessing the station portal.')
      } else {
        setError(err.message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col">
      {/* Hero Section with Image */}
            <div className="relative h-80 overflow-hidden">
              <img 
                src="/src/assets/hero.png" 
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
      
    {/* Content with rounded top corners */}
    <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10">
      <div className="px-6 pt-8 pb-6">
      

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
                Station Email
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
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your station email"
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
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-green-600 hover:text-green-500">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-lg py-3 bg-green-600 hover:bg-green-700 focus:ring-green-500"
            >
              {loading ? 'Signing in...' : 'Sign In to Station Portal'}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New partner?</span>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <Link to="/station/register">
              <button className="w-full py-4 bg-gray-50 text-green-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors">
               Partner Your Station
              </button>
            </Link>
          </div>

          {/* Other Login Options */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-4">
              Looking for a different portal?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/login">
                <Button variant="ghost" className="w-full text-sm">
                  Customer Login
                </Button>
              </Link>
              <Link to="/agent/login">
                <Button variant="ghost" className="w-full text-sm">
                  Agent Login
                </Button>
              </Link>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  )
}