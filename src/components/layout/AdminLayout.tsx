import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard,
  Users,
  ShoppingBag,
  MapPin,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  UserCheck,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'

interface AdminLayoutProps {
  children: React.ReactNode
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation()
  const { signOut, userProfile } = useAuth()

  const handleSignOut = async () => {
    try {
      window.location.replace('/')
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.replace('/')
    }
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/admin/dashboard'
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: location.pathname === '/admin/users'
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: ShoppingBag,
      current: location.pathname === '/admin/orders'
    },
    {
      name: 'Agents',
      href: '/admin/agents',
      icon: UserCheck,
      current: location.pathname === '/admin/agents'
    },
    {
      name: 'Agent Applications',
      href: '/admin/agent-applications',
      icon: AlertTriangle,
      current: location.pathname === '/admin/agent-applications'
    },
    {
      name: 'Stations',
      href: '/admin/stations',
      icon: MapPin,
      current: location.pathname === '/admin/stations'
    },
    {
      name: 'Payments',
      href: '/admin/payments',
      icon: CreditCard,
      current: location.pathname === '/admin/payments'
    },
    {
      name: 'Support',
      href: '/admin/support',
      icon: MessageSquare,
      current: location.pathname === '/admin/support'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      current: location.pathname === '/admin/analytics'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      current: location.pathname === '/admin/settings'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">FillUp Admin</h1>
              <p className="text-xs text-gray-600">Control Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-red-100 text-red-700 border-r-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {userProfile?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}