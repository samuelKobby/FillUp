import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle, Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export const ApplicationSubmitted: React.FC = () => {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const email = queryParams.get('email') || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Application Submitted!</h2>
          <p className="mt-2 text-center text-gray-600">
            Thank you for applying to be a service agent with FillUp.
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-lg p-5">
          <div className="flex items-start">
            <Mail className="h-6 w-6 text-orange-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Next Steps</h3>
              <p className="mt-2 text-sm text-orange-800">
                Your application is under review by our admin team. We'll notify you at <span className="font-medium">{email}</span> once your application has been reviewed.
              </p>
              <p className="mt-2 text-sm text-orange-800">
                This process typically takes 1-2 business days.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full py-3">
              Back to Login
            </Button>
          </Link>
          
          <Link to="/" className="block">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 py-3">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
