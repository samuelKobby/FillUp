import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export const EmailConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-full">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-1 rounded-full">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Email!
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600 mb-6">
            We've sent a verification link to{' '}
            <span className="font-medium text-orange-600">{email}</span>
          </p>

          {/* Steps */}
          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-orange-600 text-xs font-medium">1</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Check your email</strong> and click the verification link
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-orange-600 text-xs font-medium">2</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Wait for admin approval</strong> - We'll review your application
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-orange-600 text-xs font-medium">3</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Start working</strong> once approved and logged in
                </p>
              </div>
            </div>
          </div>

          {/* Approval Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-amber-800">Approval Required</h3>
                <p className="text-xs text-amber-700 mt-1">
                  Your agent application needs admin approval before you can start accepting jobs. 
                  You'll receive an email notification once approved.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Link to="/login">
            <Button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2">
              <span>Go to Login</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          {/* Help Text */}
          <p className="text-xs text-gray-500 mt-4">
            Didn't receive the email? Check your spam folder or{' '}
            <Link to="/agent/register" className="text-orange-600 hover:text-orange-700 underline">
              register again
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}