import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Fuel, Menu, User, ChevronDown, Bell } from 'lucide-react'
import { toast } from 'react-toastify'

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const { user, userRole, signOut, userProfile } = useAuth()

  const handleSignOut = async () => {
    try {
      window.location.replace('/')
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.replace('/')
    }
  }

  return (
    <header className="bg-transparent sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-0">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
              <Fuel className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FillUp</span>
          </Link>

          <div className="flex items-center">
            {!user && (
              <Link 
                to="/login" 
                className="text-white font-semibold text-base hover:text-orange-200 transition-all duration-300 ease-in-out relative group"
              >
                Sign In
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && user && userRole !== 'customer' && (
        <div className="md:hidden">
          <button
            onClick={() => {
              handleSignOut()
              setMobileMenuOpen(false)
            }}
            className="w-full text-left px-2 py-2 text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  )
}