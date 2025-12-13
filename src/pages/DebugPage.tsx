import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, debugUserData } from '../lib/supabase'
import { LogoutButton } from '../components/ui/LogoutButton'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RefreshCw, Database, User, Shield } from 'lucide-react'

export const DebugPage: React.FC = () => {
  const { user, userRole, userProfile, loading } = useAuth()
  const [debugData, setDebugData] = useState<any>(null)
  const [loadingDebug, setLoadingDebug] = useState(false)

  const loadDebugData = async () => {
    setLoadingDebug(true)
    try {
      const data = await debugUserData()
      setDebugData(data)
    } catch (error) {
      console.error('Debug error:', error)
    } finally {
      setLoadingDebug(false)
    }
  }

  useEffect(() => {
    loadDebugData()
  }, [])

  const checkAuthStatus = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Current session:', { session, error })
    
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
    console.log('Current auth user:', { authUser, userError })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug Dashboard</h1>
          <p className="text-gray-600">Current authentication and user state</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auth Context State */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Auth Context State</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>User:</strong> {user ? user.email : 'None'}
                </div>
                <div>
                  <strong>User ID:</strong> {user?.id || 'None'}
                </div>
                <div>
                  <strong>Role:</strong> {userRole || 'None'}
                </div>
                <div>
                  <strong>Profile Name:</strong> {userProfile?.name || 'None'}
                </div>
                <div>
                  <strong>Email Confirmed:</strong> {user?.email_confirmed_at ? 'Yes' : 'No'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold">Session Controls</h3>
              </div>
            </CardHeader>
            <CardContent>
              <LogoutButton />
            </CardContent>
          </Card>

          {/* Database Debug */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Database State</h3>
                </div>
                <Button 
                  onClick={loadDebugData} 
                  disabled={loadingDebug}
                  size="sm"
                  variant="outline"
                >
                  {loadingDebug ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {debugData ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">All Users in Database:</h4>
                    <div className="bg-gray-100 p-3 rounded-lg overflow-auto max-h-60">
                      <pre className="text-xs">
                        {JSON.stringify(debugData.allUsers, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Current Auth User:</h4>
                    <div className="bg-gray-100 p-3 rounded-lg overflow-auto max-h-40">
                      <pre className="text-xs">
                        {JSON.stringify(debugData.authUser, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Loading debug data...</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={checkAuthStatus} variant="outline">
                  Check Auth Status
                </Button>
                <Button onClick={() => window.location.href = '/login'} variant="outline">
                  Go to Login
                </Button>
                <Button onClick={() => window.location.href = '/admin/login'} variant="outline">
                  Go to Admin Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}