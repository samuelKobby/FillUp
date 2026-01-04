import React from 'react'
import { LogOut, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export const LogoutButton: React.FC = () => {
  const { signOut, user, userRole } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      console.log('🚪 Signing out user:', user?.email)
      window.location.replace('/')
      await signOut()
      console.log('✅ Sign out successful')
    } catch (error) {
      console.error('❌ Sign out error:', error)
      window.location.replace('/')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = () => {
    console.log('🧹 Clearing all local storage and session data')
    
    // Clear localStorage
    // Clear only auth-related data, preserve cached page data
    localStorage.removeItem('userRole')
    localStorage.removeItem('userProfile')
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Force reload to clear any cached state
    window.location.href = '/'
  }

  if (!user) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600 mb-4">No user currently logged in</p>
        <Button onClick={handleClearAll} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear All Data & Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Current User</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {userRole || 'Loading...'}</p>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button 
          onClick={handleSignOut} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Sign Out
        </Button>
        
        <Button 
          onClick={handleClearAll} 
          variant="outline"
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear All & Refresh
        </Button>
      </div>
    </div>
  )
}