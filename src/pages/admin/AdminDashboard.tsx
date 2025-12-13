import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  MapPin, 
  ClipboardList, 
  CreditCard, 
  AlertTriangle, 
  Tags, 
  Bell, 
  Settings, 
  Search, 
  ChevronDown, 
  Menu, 
  Plus, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Check,
  UserPlus,
  AlertCircle,
  Fuel,
  Home,
  ChevronRight,
  ArrowRight,
  Activity,
  LucideIcon,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Wrench,
  X,
  User,
  Eye,
  DollarSign
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'

// Type definitions
interface Stats {
  totalOrders: number
  activeUsers: number
  revenueToday: number
  agentsOnline: number
}

interface Order {
  id: string
  service_type: string
  total_amount: number
  status: string
  created_at: string
  fuel_quantity?: number
  fuel_type?: string
  delivery_address?: string
  notes?: string
  platform_fee?: number
  agent_fee?: number
  accepted_at?: string | null
  completed_at?: string | null
  users?: {
    name: string
    phone: string
  }
  vehicles?: {
    make: string
    model: string
  }
  agents?: {
    users: {
      name: string
      phone: string
    }
  }
}

interface User {
  id: string
  email: string
  name: string
  phone: string
  role: string
  is_active: boolean
  created_at: string
}

interface Agent {
  id: string
  users: User
  service_type: string
  rating: number
  is_verified: boolean
  is_available: boolean
  total_jobs: number
}

interface PendingAgent {
  id: string
  auth_id: string
  email: string
  name: string
  phone: string
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  license_number: string | null
  vehicle_info: {
    make?: string
    model?: string
    year?: string
    plateNumber?: string
    color?: string
  } | null
  experience: string | null
  location: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string | null
  created_at: string
  updated_at?: string
  reviewed_at?: string | null
  reviewed_by?: string | null
}

interface Station {
  id: string
  name: string
  address: string
  petrol_price: number
  diesel_price: number
  is_verified: boolean
  is_active: boolean
  users: User
}

interface Activity {
  icon: LucideIcon
  text: string
  time: string
  type: 'success' | 'warning' | 'info'
}

interface StatData {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: LucideIcon
  color: string
}

interface Column {
  key: string
  label: string
  render?: (value: any, row?: any) => React.ReactNode
}

interface Action {
  icon: LucideIcon
  label: string
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { signOut, userProfile } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320) // 80 * 4 = 320px (w-80)
  const [isResizing, setIsResizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    activeUsers: 0,
    revenueToday: 0,
    agentsOnline: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])

  // Sidebar resize handlers
  const startResizing = React.useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = React.useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX
        if (newWidth >= 200 && newWidth <= 500) {
          setSidebarWidth(newWidth)
        }
      }
    },
    [isResizing]
  )

  React.useEffect(() => {
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResizing)
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [resize, stopResizing])
  const [users, setUsers] = useState<User[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [pendingAgents, setPendingAgents] = useState<PendingAgent[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Real-time subscriptions for orders so admin sees changes immediately
  const dashboardRefreshTimer = useRef<number | null>(null)

  useEffect(() => {
    // Subscribe to all orders changes
    const ordersSubscription = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Admin realtime - INSERT order:', payload)
        if (payload.new) {
          setRecentOrders(prev => [payload.new as any, ...prev].slice(0, 10))
          setStats(s => ({ ...s, totalOrders: s.totalOrders + 1 }))
        }
        // Debounced full refresh to keep derived stats accurate
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Admin realtime - UPDATE order:', payload)
        if (payload.new) {
          setRecentOrders(prev => prev.map(o => (o.id === (payload.new as any).id ? { ...o, ...(payload.new as any) } : o)))
        }
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Admin realtime - DELETE order:', payload)
        if (payload.old) {
          setRecentOrders(prev => prev.filter(o => o.id !== (payload.old as any).id))
          setStats(s => ({ ...s, totalOrders: Math.max(0, s.totalOrders - 1) }))
        }
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ordersSubscription)
      if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const [
        ordersResult,
        usersResult,
        agentsResult,
        stationsResult,
        pendingAgentsResult
      ] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('users').select('*'),
        supabase.from('agents').select('*, users(*)'),
        supabase.from('stations').select('*, users(*)'),
        supabase.from('pending_agents').select('*')
      ])

      const orders = ordersResult.data as Order[] || []
      const allUsers = usersResult.data as User[] || []
      const allAgents = agentsResult.data as Agent[] || []
      const allStations = stationsResult.data as Station[] || []
      const allPendingAgents = pendingAgentsResult.data as PendingAgent[] || []

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayOrders = orders.filter(order => order.created_at.startsWith(today))
      const revenueToday = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const activeAgents = allAgents.filter(agent => agent.is_available && agent.is_verified).length

      setStats({
        totalOrders: orders.length,
        activeUsers: allUsers.filter(user => user.is_active).length,
        revenueToday,
        agentsOnline: activeAgents
      })

      // Set recent orders
      setRecentOrders(orders.slice(0, 10))
      setUsers(allUsers)
      setAgents(allAgents)
      setPendingAgents(allPendingAgents)
      setStations(allStations)

      // Mock activities
      setActivities([
        { icon: Check, text: `Order #${orders[0]?.id?.slice(0, 8)} completed`, time: '2 minutes ago', type: 'success' },
        { icon: UserPlus, text: 'New agent registered', time: '5 minutes ago', type: 'info' },
        { icon: AlertCircle, text: 'Payment issue reported', time: '12 minutes ago', type: 'warning' },
        { icon: Fuel, text: 'Fuel delivery dispatched', time: '18 minutes ago', type: 'success' }
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'agents', label: 'Agents', icon: UserCheck },
    { id: 'agent-applications', label: 'Agent Applications', icon: UserPlus },
    { id: 'stations', label: 'Stations', icon: MapPin },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'support', label: 'Support', icon: AlertTriangle },
    { id: 'promos', label: 'Promos', icon: Tags },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const statsData: StatData[] = [
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      change: '+12.5%',
      trend: 'up',
      icon: ClipboardList,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Revenue Today',
      value: `₵${stats.revenueToday.toLocaleString()}`,
      change: '+23.1%',
      trend: 'up',
      icon: CreditCard,
      color: 'from-amber-500 to-amber-600'
    },
    {
      title: 'Agents Online',
      value: stats.agentsOnline.toString(),
      change: '-3.4%',
      trend: 'down',
      icon: UserCheck,
      color: 'from-rose-500 to-rose-600'
    }
  ]

  const StatCard: React.FC<{ stat: StatData; index: number }> = ({ stat, index }) => (
    <div 
      className="group relative bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-lg hover:shadow-blue-900/20"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards'
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            {stat.value}
          </div>
          <div className="text-gray-300 text-sm mb-3">{stat.title}</div>
          <div className={`flex items-center gap-2 text-sm ${
            stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{stat.change} from last week</span>
          </div>
        </div>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <stat.icon size={24} />
        </div>
      </div>
    </div>
  )

  const ActivityItem: React.FC<{ activity: Activity; index: number }> = ({ activity, index }) => {
    const getTypeColor = (type: Activity['type']) => {
      switch (type) {
        case 'success': return 'from-emerald-500 to-emerald-600'
        case 'warning': return 'from-amber-500 to-amber-600'
        case 'info': return 'from-blue-500 to-blue-600'
        default: return 'from-gray-500 to-gray-600'
      }
    }

    return (
      <div 
        className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-all duration-300"
        style={{
          animationDelay: `${index * 100}ms`,
          animation: 'slideInRight 0.5s ease-out forwards'
        }}
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getTypeColor(activity.type)} flex items-center justify-center text-white shadow-lg`}>
          <activity.icon size={16} />
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-medium">{activity.text}</div>
          <div className="text-gray-400 text-xs mt-1">{activity.time}</div>
        </div>
      </div>
    )
  }

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'completed':
        case 'active':
        case 'approved':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        case 'in_progress':
        case 'pending':
          return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        case 'cancelled':
        case 'banned':
        case 'suspended':
          return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
        default:
          return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      }
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(status)} capitalize`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const DataTable: React.FC<{ 
    data: any[]; 
    columns: Column[]; 
    title: string; 
    actions?: Action[] 
  }> = ({ data, columns, title, actions }) => (
    <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <div className="flex gap-3">
          {actions?.map((action: Action, index: number) => (
            <button
              key={index}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300 hover:transform hover:scale-105"
            >
              <action.icon size={16} />
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((column: Column, index: number) => (
                <th key={index} className="text-left py-4 px-2 text-gray-300 font-medium text-sm">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, rowIndex: number) => (
              <tr 
                key={rowIndex} 
                className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                style={{
                  animationDelay: `${rowIndex * 50}ms`,
                  animation: 'fadeInUp 0.4s ease-out forwards'
                }}
              >
                {columns.map((column: Column, colIndex: number) => (
                  <td key={colIndex} className="py-4 px-2 text-white text-sm">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsData.map((stat, index) => (
                <StatCard key={index} stat={stat} index={index} />
              ))}
            </div>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Revenue Trends</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300">
                    <Download size={16} />
                    Export
                  </button>
                </div>
                <div className="h-64 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <div>Interactive Revenue Chart</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-6">Live Activity</h3>
                <div className="space-y-2">
                  {activities.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} index={index} />
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <DataTable
              title="Recent Orders"
              data={recentOrders.slice(0, 5)}
              columns={[
                { key: 'id', label: 'Order ID', render: (id: string) => `#${id.slice(0, 8)}` },
                { key: 'service_type', label: 'Type', render: (type: string) => type?.replace('_', ' ') || 'N/A' },
                { key: 'total_amount', label: 'Amount', render: (amount: number) => `₵${amount?.toFixed(2) || '0.00'}` },
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
                { key: 'created_at', label: 'Time', render: (date: string) => new Date(date).toLocaleTimeString() }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Plus, label: 'View All' }
              ]}
            />
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <DataTable
              title="User Management"
              data={users.slice(0, 10)}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'role', label: 'Role', render: (role: string) => <StatusBadge status={role} /> },
                { key: 'is_active', label: 'Status', render: (active: boolean) => <StatusBadge status={active ? 'active' : 'inactive'} /> },
                { key: 'created_at', label: 'Joined', render: (date: string) => new Date(date).toLocaleDateString() },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: () => (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors">
                        View
                      </button>
                      <button className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs transition-colors">
                        Block
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Search, label: 'Search' },
                { icon: Filter, label: 'Filter' },
                { icon: Plus, label: 'Add User' }
              ]}
            />
          </div>
        )

      case 'agents':
        return (
          <div className="space-y-6">
            <DataTable
              title="Agent Management"
              data={agents.slice(0, 10)}
              columns={[
                { key: 'users', label: 'Name', render: (user: User) => user?.name || 'N/A' },
                { key: 'users', label: 'Phone', render: (user: User) => user?.phone || 'N/A' },
                { key: 'service_type', label: 'Service Type', render: (type: string) => type?.replace('_', ' ') },
                { key: 'rating', label: 'Rating', render: (rating: number) => `⭐ ${rating}` },
                { key: 'is_verified', label: 'Status', render: (verified: boolean) => <StatusBadge status={verified ? 'approved' : 'pending'} /> },
                { key: 'total_jobs', label: 'Jobs', render: (jobs: number) => jobs || 0 },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: Agent) => (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors">
                        View
                      </button>
                      {!row.is_verified && (
                        <button className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors">
                          Approve
                        </button>
                      )}
                      <button className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs transition-colors">
                        Suspend
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Plus, label: 'Add Agent' }
              ]}
            />
          </div>
        )

      case 'stations':
        return (
          <div className="space-y-6">
            <DataTable
              title="Station Management"
              data={stations.slice(0, 10)}
              columns={[
                { key: 'name', label: 'Station Name' },
                { key: 'address', label: 'Address' },
                { key: 'petrol_price', label: 'Petrol Price', render: (price: number) => `₵${price}/L` },
                { key: 'diesel_price', label: 'Diesel Price', render: (price: number) => `₵${price}/L` },
                { key: 'is_verified', label: 'Status', render: (verified: boolean) => <StatusBadge status={verified ? 'approved' : 'pending'} /> },
                { key: 'is_active', label: 'Active', render: (active: boolean) => <StatusBadge status={active ? 'active' : 'inactive'} /> },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: () => (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors">
                        View
                      </button>
                      <button className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors">
                        Approve
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Plus, label: 'Add Station' }
              ]}
            />
          </div>
        )

      case 'orders':
        return (
          <div className="space-y-6">
            <DataTable
              title="Order Management"
              data={recentOrders}
              columns={[
                { key: 'id', label: 'Order ID', render: (id: string) => `#${id.slice(0, 8)}` },
                { key: 'service_type', label: 'Service', render: (type: string) => type?.replace('_', ' ') },
                { key: 'fuel_quantity', label: 'Quantity', render: (qty: number, row: Order) => row.service_type === 'fuel_delivery' ? `${qty}L` : 'N/A' },
                { key: 'total_amount', label: 'Amount', render: (amount: number) => `₵${amount?.toFixed(2)}` },
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
                { key: 'created_at', label: 'Date', render: (date: string) => new Date(date).toLocaleDateString() },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: Order) => (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedOrder(row)
                          setShowOrderDetails(true)
                        }}
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => {
                          // Navigate to order tracking page or open tracking modal
                          navigate(`/admin/orders/${row.id}/track`)
                        }}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs transition-colors"
                      >
                        Track
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Download, label: 'Export' }
              ]}
            />
          </div>
        )

      case 'agent-applications':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md bg-yellow-500/20 p-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-300">Pending Applications</dt>
                      <dd>
                        <div className="text-3xl font-bold text-white">{pendingAgents.filter(a => a.status === 'pending').length}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-green-900/20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md bg-green-500/20 p-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-300">Approved Applications</dt>
                      <dd>
                        <div className="text-3xl font-bold text-green-400">{pendingAgents.filter(a => a.status === 'approved').length}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md bg-blue-500/20 p-3">
                    <Truck className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-300">Fuel Delivery Agents</dt>
                      <dd>
                        <div className="text-3xl font-bold text-blue-400">
                          {pendingAgents.filter(a => a.service_type === 'fuel_delivery' || a.service_type === 'both').length}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md bg-purple-500/20 p-3">
                    <Wrench className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-300">Mechanic Agents</dt>
                      <dd>
                        <div className="text-3xl font-bold text-purple-400">
                          {pendingAgents.filter(a => a.service_type === 'mechanic' || a.service_type === 'both').length}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <DataTable
              title="Agent Applications"
              data={pendingAgents}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { 
                  key: 'service_type', 
                  label: 'Service', 
                  render: (type: string) => {
                    switch(type) {
                      case 'fuel_delivery':
                        return (
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 text-blue-400 mr-1" />
                            <span>Fuel Delivery</span>
                          </div>
                        )
                      case 'mechanic':
                        return (
                          <div className="flex items-center">
                            <Wrench className="h-4 w-4 text-purple-400 mr-1" />
                            <span>Mechanic</span>
                          </div>
                        )
                      case 'both':
                        return (
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 text-blue-400 mr-1" />
                            <Wrench className="h-4 w-4 text-purple-400 ml-1" />
                            <span className="ml-1">Both</span>
                          </div>
                        )
                      default:
                        return 'N/A'
                    }
                  }
                },
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
                { key: 'created_at', label: 'Applied', render: (date: string) => new Date(date).toLocaleDateString() },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: PendingAgent) => (
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                        onClick={() => {
                          navigate(`/admin/agent-applications/${row.id}`)
                        }}
                      >
                        View
                      </button>
                      {row.status === 'pending' && (
                        <button 
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors"
                          disabled={actionLoading === row.id}
                          onClick={async () => {
                            try {
                              setActionLoading(row.id)
                              const { data: userData } = await supabase.auth.getUser()
                              const adminId = userData.user?.id
                              
                              if (!adminId) {
                                throw new Error('Admin ID not found')
                              }
                              
                              const { error } = await supabase.rpc('approve_agent_application', {
                                application_id: row.id,
                                admin_id: adminId,
                                admin_notes: 'Approved via admin dashboard'
                              })
                              
                              if (error) throw error
                              
                              toast.success('Agent application approved successfully')
                              loadDashboardData()
                            } catch (err: any) {
                              console.error('Error approving application:', err)
                              toast.error(err.message || 'Failed to approve application')
                            } finally {
                              setActionLoading(null)
                            }
                          }}
                        >
                          {actionLoading === row.id ? 'Processing...' : 'Approve'}
                        </button>
                      )}
                      {row.status === 'pending' && (
                        <button 
                          className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs transition-colors"
                          disabled={actionLoading === row.id}
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to reject this application? This action cannot be undone.')) {
                              try {
                                setActionLoading(row.id)
                                const { data: userData } = await supabase.auth.getUser()
                                const adminId = userData.user?.id
                                
                                if (!adminId) {
                                  throw new Error('Admin ID not found')
                                }
                                
                                const { error } = await supabase.rpc('reject_agent_application', {
                                  application_id: row.id,
                                  admin_id: adminId,
                                  admin_notes: 'Rejected via admin dashboard'
                                })
                                
                                if (error) throw error
                                
                                toast.success('Agent application rejected successfully')
                                loadDashboardData()
                              } catch (err: any) {
                                console.error('Error rejecting application:', err)
                                toast.error(err.message || 'Failed to reject application')
                              } finally {
                                setActionLoading(null)
                              }
                            }
                          }}
                        >
                          {actionLoading === row.id ? 'Processing...' : 'Reject'}
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Download, label: 'Export' },
                { icon: Plus, label: 'Add Agent' }
              ]}
            />
          </div>
        )
        
      default:
        return (
          <div className="flex items-center justify-center h-64 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
            <div className="text-center text-white">
              <div className="text-4xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold mb-2">Page Under Construction</h3>
              <p className="text-gray-300">This page is being built with amazing features!</p>
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-pulse-glow {
            animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
            }
            50% {
              box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6);
            }
          }
        `
      }} />

      <div className="flex">
        {/* Sidebar */}
        <div 
          className="bg-black/20 backdrop-blur-xl border-r border-white/10 min-h-screen flex flex-col relative"
          style={{ 
            width: sidebarCollapsed ? '80px' : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : 'width 300ms'
          }}
        >
          {/* Resize Handle */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors group"
            >
              <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500/0 group-hover:bg-blue-500 rounded-full transition-all" />
            </div>
          )}
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse-glow">
                <Fuel className="text-white" size={24} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    FillUp
                  </h1>
                  <p className="text-gray-400 text-sm">Admin Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group ${
                      currentPage === item.id
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105'
                        : 'hover:bg-white/10 text-gray-300 hover:text-white hover:transform hover:translate-x-2'
                    }`}
                  >
                    <item.icon size={20} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium">{item.label}</span>
                        {currentPage === item.id && (
                          <ChevronRight size={16} className="ml-auto" />
                        )}
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold">
                {userProfile?.name?.charAt(0) || 'A'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {userProfile?.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {userProfile?.email}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300"
              >
                <ArrowRight className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-bold">
                    {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-300 text-sm mt-1">
                    <Home size={14} />
                    <span>Admin</span>
                    <ChevronRight size={14} />
                    <span>{menuItems.find(item => item.id === currentPage)?.label}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search anything..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-80 pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                </div>

                {/* Profile */}
                <div className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl cursor-pointer transition-all duration-300 group">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold">
                    {userProfile?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="hidden md:block">
                    <div className="font-medium">{userProfile?.name || 'Admin'}</div>
                    <div className="text-gray-400 text-xs">Super Admin</div>
                  </div>
                  <ChevronDown size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <button className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:shadow-blue-500/25 hover:transform hover:scale-110 transition-all duration-300 animate-pulse-glow">
          <Activity size={20} />
        </button>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl animate-slideUp scrollbar-hide">
            <style dangerouslySetInnerHTML={{
              __html: `
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `
            }} />
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Order Details</h3>
                <p className="text-gray-400 text-sm">Complete order information</p>
              </div>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Order ID & Status */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Order ID</p>
                      <p className="text-white font-mono text-xl font-bold">#{selectedOrder.id.slice(0, 8)}</p>
                    </div>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                {/* Customer Information */}
                {selectedOrder.users && (
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-white font-semibold text-lg">Customer Information</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Name</span>
                        <span className="text-white font-medium">{selectedOrder.users?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Phone</span>
                        <span className="text-white font-medium">{selectedOrder.users?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Details */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-green-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Fuel className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Service Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Service Type</span>
                      <span className="text-white font-medium capitalize">{selectedOrder.service_type?.replace('_', ' ')}</span>
                    </div>
                    {selectedOrder.service_type === 'fuel_delivery' && (
                      <>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-400 text-sm">Fuel Type</span>
                          <span className="text-white font-medium capitalize">{selectedOrder.fuel_type}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-400 text-sm">Quantity</span>
                          <span className="text-white font-bold text-lg">{selectedOrder.fuel_quantity}L</span>
                        </div>
                      </>
                    )}
                    {selectedOrder.vehicles && (
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Vehicle</span>
                        <span className="text-white font-medium">{selectedOrder.vehicles.make} {selectedOrder.vehicles.model}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Information */}
                {selectedOrder.delivery_address && (
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-orange-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-white font-semibold text-lg">Delivery Location</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm block mb-2">Address</span>
                        <p className="text-white font-medium leading-relaxed">{selectedOrder.delivery_address}</p>
                      </div>
                      {selectedOrder.notes && (
                        <div className="p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-400 text-sm block mb-2">Special Notes</span>
                          <p className="text-white leading-relaxed">{selectedOrder.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Agent Information */}
                {selectedOrder.agents?.users && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-white font-semibold text-lg">Agent Assigned</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Name</span>
                        <span className="text-white font-medium">{selectedOrder.agents.users.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Phone</span>
                        <span className="text-white font-medium">{selectedOrder.agents.users.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-emerald-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Payment Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Platform Fee</span>
                      <span className="text-white font-medium">₵{selectedOrder.platform_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Agent Fee</span>
                      <span className="text-white font-medium">₵{selectedOrder.agent_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
                      <span className="text-emerald-400 font-semibold">Total Amount</span>
                      <span className="text-white font-bold text-2xl">₵{selectedOrder.total_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Timeline</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <span className="text-gray-400 text-sm block">Created</span>
                        <span className="text-white font-medium text-sm">
                          {new Date(selectedOrder.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {selectedOrder.accepted_at && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <span className="text-gray-400 text-sm block">Accepted</span>
                          <span className="text-white font-medium text-sm">
                            {new Date(selectedOrder.accepted_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedOrder.completed_at && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <span className="text-gray-400 text-sm block">Completed</span>
                          <span className="text-white font-medium text-sm">
                            {new Date(selectedOrder.completed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}