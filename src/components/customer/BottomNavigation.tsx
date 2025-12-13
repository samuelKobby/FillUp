import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, CreditCard, History, User } from 'lucide-react'

export const BottomNavigation: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 py-1 sm:py-2">
        <Link 
          to="/dashboard" 
          className={`flex flex-col items-center py-1.5 sm:py-2 px-2 sm:px-4 ${
            isActive('/dashboard') ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'
          }`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full ${
            isActive('/dashboard') ? 'bg-orange-500 text-white' : 'bg-transparent'
          }`}>
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="text-xs mt-0.5 sm:mt-1">Home</span>
        </Link>

        <Link 
          to="/wallet" 
          className={`flex flex-col items-center py-1.5 sm:py-2 px-2 sm:px-4 ${
            isActive('/wallet') ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'
          }`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full ${
            isActive('/wallet') ? 'bg-orange-500 text-white' : 'bg-transparent'
          }`}>
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="text-xs mt-0.5 sm:mt-1">Wallet</span>
        </Link>

        <Link 
          to="/history" 
          className={`flex flex-col items-center py-1.5 sm:py-2 px-2 sm:px-4 ${
            isActive('/history') ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'
          }`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full ${
            isActive('/history') ? 'bg-orange-500 text-white' : 'bg-transparent'
          }`}>
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="text-xs mt-0.5 sm:mt-1">Orders</span>
        </Link>

        <Link 
          to="/profile" 
          className={`flex flex-col items-center py-1.5 sm:py-2 px-2 sm:px-4 ${
            isActive('/profile') ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'
          }`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full ${
            isActive('/profile') ? 'bg-orange-500 text-white' : 'bg-transparent'
          }`}>
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="text-xs mt-0.5 sm:mt-1">Profile</span>
        </Link>
      </div>
    </div>
  )
}
