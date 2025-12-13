import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, CheckCircle, RefreshCw, ArrowLeft, Fuel } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'

export const EmailVerification: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email')
    const storedEmail = localStorage.getItem('pendingVerificationEmail')
    
    if (emailParam) {
      setEmail(emailParam)
      localStorage.setItem('pendingVerificationEmail', emailParam)
    } else if (storedEmail) {
      setEmail(storedEmail)
    }

    // Check if user is already verified
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        localStorage.removeItem('pendingVerificationEmail')
        navigate('/login')
      }
    }

    checkVerification()

    // Set up countdown timer if recently sent
    const lastResent = localStorage.getItem('lastVerificationResent')
    if (lastResent) {
      const timeSince = Date.now() - parseInt(lastResent)
      const remainingTime = Math.max(0, 60000 - timeSince) // 60 seconds cooldown
      if (remainingTime > 0) {
        setCountdown(Math.ceil(remainingTime / 1000))
      }
    }
  }, [searchParams, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendVerification = async () => {
    if (!email || countdown > 0) return

    setIsResending(true)
    setResendMessage('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) throw error

      setResendMessage('Verification email sent successfully!')
      setCountdown(60) // 60 second cooldown
      localStorage.setItem('lastVerificationResent', Date.now().toString())
    } catch (error: any) {
      setResendMessage(error.message || 'Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  const handleCheckVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        localStorage.removeItem('pendingVerificationEmail')
        localStorage.removeItem('lastVerificationResent')
        navigate('/login')
      } else {
        setResendMessage('Email not verified yet. Please check your inbox.')
      }
    } catch (error) {
      console.error('Error checking verification:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
                  <Fuel className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
              <p className="text-gray-600 mt-2">We've sent you a verification link</p>
            </div>

            {/* Email Icon */}
            <div className="text-center mb-6">
              <div className="bg-blue-100 p-6 rounded-full inline-block mb-4">
                <Mail className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center mb-8">
              <p className="text-gray-700 mb-4">
                We've sent a verification email to:
              </p>
              <p className="font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg mb-6">
                {email || 'your email address'}
              </p>
              <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Next steps:</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Check your email inbox</li>
                  <li>2. Look for an email from FillUp</li>
                  <li>3. Click the verification link</li>
                  <li>4. Return here to continue</li>
                </ol>
              </div>
            </div>

            {/* Status Message */}
            {resendMessage && (
              <div className={`text-center p-3 rounded-lg mb-6 ${
                resendMessage.includes('successfully') 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {resendMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleCheckVerification}
                className="w-full flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-5 w-5" />
                <span>I've Verified My Email</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={isResending || countdown > 0}
                className="w-full flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`h-5 w-5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {countdown > 0 
                    ? `Resend in ${countdown}s` 
                    : isResending 
                      ? 'Sending...' 
                      : 'Resend Verification Email'
                  }
                </span>
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-8 text-center text-sm text-gray-600">
              <p className="mb-2">Didn't receive the email?</p>
              <ul className="space-y-1">
                <li>• Check your spam/junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a few minutes and try again</li>
              </ul>
            </div>

            {/* Back to Registration */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-3">
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Login</span>
              </Link>
              
              <div className="text-gray-400">or</div>
              
              <Link 
                to="/register" 
                className="inline-flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Registration</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}