import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logo1 from '../../assets/logo1.png'
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
  DollarSign,
  MousePointer2,
  LogOut,
  Send,
  Sparkles,
  Wallet
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

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
  const [mechanics, setMechanics] = useState<Agent[]>([])
  const [pendingAgents, setPendingAgents] = useState<PendingAgent[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [selectedMechanic, setSelectedMechanic] = useState<Agent | null>(null)
  const [showMechanicDetails, setShowMechanicDetails] = useState(false)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [showStationDetails, setShowStationDetails] = useState(false)
  const [selectedPendingAgent, setSelectedPendingAgent] = useState<PendingAgent | null>(null)
  const [showPendingAgentDetails, setShowPendingAgentDetails] = useState(false)
  const [satisfactionRate, setSatisfactionRate] = useState(0)
  const [referralData, setReferralData] = useState({ invited: 0, bonus: 0, safetyScore: 0 })

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Real-time subscriptions for orders, agents, stations, and users
  const dashboardRefreshTimer = useRef<number | null>(null)

  useEffect(() => {
    // Subscribe to orders changes
    const ordersSubscription = supabase
      .channel('admin-orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setRecentOrders(prev => [payload.new as any, ...prev].slice(0, 10))
          setStats(s => ({ ...s, totalOrders: s.totalOrders + 1 }))
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setRecentOrders(prev => prev.map(o => (o.id === (payload.new as any).id ? { ...o, ...(payload.new as any) } : o)))
        } else if (payload.eventType === 'DELETE' && payload.old) {
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

    // Subscribe to agents changes
    const agentsSubscription = supabase
      .channel('admin-agents')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agents' 
      }, (payload) => {
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .subscribe()

    // Subscribe to stations changes
    const stationsSubscription = supabase
      .channel('admin-stations')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stations' 
      }, (payload) => {
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .subscribe()

    // Subscribe to users changes
    const usersSubscription = supabase
      .channel('admin-users')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users' 
      }, (payload) => {
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .subscribe()

    // Subscribe to transactions changes
    const transactionsSubscription = supabase
      .channel('admin-transactions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions' 
      }, (payload) => {
        if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
        dashboardRefreshTimer.current = window.setTimeout(() => {
          loadDashboardData()
          dashboardRefreshTimer.current = null
        }, 800)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ordersSubscription)
      supabase.removeChannel(agentsSubscription)
      supabase.removeChannel(stationsSubscription)
      supabase.removeChannel(usersSubscription)
      supabase.removeChannel(transactionsSubscription)
      if (dashboardRefreshTimer.current) window.clearTimeout(dashboardRefreshTimer.current)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const [
        ordersResult,
        usersResult,
        agentsResult,
        mechanicsResult,
        stationsResult,
        pendingAgentsResult
      ] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('users').select('*'),
        supabase.from('agents').select('*, users(*)').eq('service_type', 'fuel_delivery'), // Fuel delivery agents
        supabase.from('agents').select('*, users(*)').eq('service_type', 'mechanic'), // Mechanics
        supabase.from('stations').select('*, users(*)'),
        supabase.from('pending_agents').select('*').eq('status', 'pending') // Pending applications
      ])

      const orders = ordersResult.data as Order[] || []
      const allUsers = usersResult.data as User[] || []
      const allAgents = agentsResult.data as Agent[] || []
      const allMechanics = mechanicsResult.data as Agent[] || []
      const allStations = stationsResult.data as Station[] || []
      // Map pending agents from pending_agents table  
      const allPendingAgents = (pendingAgentsResult.data as any[] || []).map(agent => ({
        id: agent.id,
        auth_id: agent.auth_id,
        email: agent.email,
        name: agent.name,
        phone: agent.phone,
        service_type: agent.service_type,
        license_number: agent.license_number,
        vehicle_info: agent.vehicle_info,
        status: agent.status,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        profile_image_url: agent.profile_image_url
      })) as PendingAgent[]

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

      // Calculate satisfaction rate based on completed orders
      const completedOrders = orders.filter(o => o.status === 'completed')
      const satisfactionPercentage = completedOrders.length > 0 
        ? Math.round((completedOrders.length / orders.length) * 100) 
        : 0
      setSatisfactionRate(satisfactionPercentage)

      // Calculate referral data
      const totalInvited = allAgents.length + allPendingAgents.length // Total agents (approved + pending)
      const totalBonus = allAgents.reduce((sum, agent) => sum + (agent.earnings || 0), 0)
      const avgRating = allAgents.length > 0
        ? allAgents.reduce((sum, agent) => sum + (agent.rating || 5), 0) / allAgents.length
        : 5.0
      
      setReferralData({
        invited: totalInvited,
        bonus: Math.round(totalBonus),
        safetyScore: Number(avgRating.toFixed(1))
      })

      // Set recent orders
      setRecentOrders(orders.slice(0, 10))
      setUsers(allUsers)
      setAgents(allAgents)
      setMechanics(allMechanics)
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
    { id: 'mechanics', label: 'Mechanics', icon: Wrench },
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
      className="group relative backdrop-blur-xl rounded-3xl p-6 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-lg"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards',
        background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
      }}
    >
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="text-gray-400 text-sm mb-3 font-medium">{stat.title}</div>
          <div className="text-4xl font-bold text-white mb-3">
            {stat.value}
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>{stat.change}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
            <stat.icon size={24} />
          </div>
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
    <div className="backdrop-blur-xl rounded-3xl p-6 mb-6" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="flex gap-3">
          {actions?.map((action: Action, index: number) => (
            <button
              key={index}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all"
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
                <th key={index} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, rowIndex: number) => (
              <tr 
                key={rowIndex} 
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {columns.map((column: Column, colIndex: number) => (
                  <td key={colIndex} className="py-5 px-4 text-white text-sm">
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

  // Sample data for charts (Fuel Deliveries & Mechanic Services)
  const salesData = [
    { month: 'Jan', value1: 200, value2: 450, value3: 350 }, // Fuel Deliveries, Mechanic Services, Total Revenue
    { month: 'Feb', value1: 150, value2: 380, value3: 420 },
    { month: 'Mar', value1: 300, value2: 520, value3: 380 },
    { month: 'Apr', value1: 250, value2: 470, value3: 520 },
    { month: 'May', value1: 400, value2: 600, value3: 450 },
    { month: 'Jun', value1: 350, value2: 550, value3: 580 },
    { month: 'Jul', value1: 450, value2: 650, value3: 520 },
    { month: 'Aug', value1: 400, value2: 620, value3: 600 },
    { month: 'Sep', value1: 500, value2: 700, value3: 550 },
    { month: 'Oct', value1: 450, value2: 680, value3: 650 },
    { month: 'Nov', value1: 550, value2: 750, value3: 600 },
    { month: 'Dec', value1: 600, value2: 800, value3: 720 }
  ]

  const barChartData = [ // Monthly Active Agents
    { month: 'Jan', value: 320 },
    { month: 'Feb', value: 280 },
    { month: 'Mar', value: 350 },
    { month: 'Apr', value: 500 },
    { month: 'May', value: 320 },
    { month: 'Jun', value: 150 },
    { month: 'Jul', value: 450 },
    { month: 'Aug', value: 380 },
    { month: 'Sep', value: 280 },
    { month: 'Oct', value: 180 },
    { month: 'Nov', value: 520 }
  ]

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Today's Revenue */}
              <div className="backdrop-blur-xl rounded-3xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
                <div>
                  <p className="text-gray-400 text-xs mb-2">Today's Revenue</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-2xl font-bold">GH₵{stats.revenueToday.toLocaleString()}</h3>
                    <p className="text-emerald-400 text-xs font-semibold">+55%</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign size={24} className="text-white" />
                </div>
              </div>

              {/* Today's Orders */}
              <div className="backdrop-blur-xl rounded-3xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
                <div>
                  <p className="text-gray-400 text-xs mb-2">Today's Orders</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-2xl font-bold">{stats.totalOrders.toLocaleString()}</h3>
                    <p className="text-emerald-400 text-xs font-semibold">+3%</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={24} className="text-white" />
                </div>
              </div>

              {/* New Customers */}
              <div className="backdrop-blur-xl rounded-3xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
                <div>
                  <p className="text-gray-400 text-xs mb-2">New Customers</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-2xl font-bold">+{stats.activeUsers.toLocaleString()}</h3>
                    <p className="text-red-400 text-xs font-semibold">-2%</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users size={24} className="text-white" />
                </div>
              </div>

              {/* Active Agents */}
              <div className="backdrop-blur-xl rounded-3xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
                <div>
                  <p className="text-gray-400 text-xs mb-2">Active Agents</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-2xl font-bold">{stats.agentsOnline}</h3>
                    <p className="text-emerald-400 text-xs font-semibold">+5%</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck size={24} className="text-white" />
                </div>
              </div>
            </div>

            {/* Second Row - Welcome Card, Satisfaction Rate, Referral Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Welcome Card with Image - Wider */}
              <div className="lg:col-span-5 backdrop-blur-2xl rounded-3xl p-8 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)', height: '350px' }}>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-gray-300 text-sm mb-2">
                      {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, welcome back
                    </p>
                    <h2 className="text-4xl font-bold text-white mb-4">{userProfile?.name || 'Mark Johnson'}</h2>
                    <p className="text-white text-base mb-2">Glad to see you again!</p>
                    <p className="text-white text-base">Ask me anything.</p>
                  </div>
                  <button className="flex items-center gap-2 text-white font-medium text-base hover:gap-3 transition-all self-start">
                    Tap to record <ArrowRight size={18} />
                  </button>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1617791160505-6f00504e3519?q=80&w=600&auto=format&fit=crop"
                  alt="Abstract jellyfish"
                  className="absolute right-0 top-0 h-full object-cover"
                  style={{ 
                    width: '50%',
                    opacity: 0.7,
                    mixBlendMode: 'lighten',
                    maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)'
                  }}
                />
              </div>

              {/* Customer Satisfaction */}
              <div className="lg:col-span-3 backdrop-blur-xl rounded-3xl p-4 sm:p-6 flex flex-col" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)', minHeight: '320px', maxHeight: '350px' }}>
                <div className="mb-2 sm:mb-4 flex-shrink-0">
                  <h3 className="text-white font-bold text-lg sm:text-xl mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Satisfaction Rate</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">From all projects</p>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-0 py-2">
                  <div className="relative w-full max-w-[200px]">
                    <div className="w-full aspect-square">
                      <CircularProgressbar
                        value={satisfactionRate}
                        text=""
                        styles={buildStyles({
                          pathColor: '#60a5fa',
                          trailColor: 'rgba(96, 165, 250, 0.2)',
                          strokeLinecap: 'round',
                          pathTransitionDuration: 0.5
                        })}
                        strokeWidth={10}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl">😊</span>
                        </div>
                      </div>
                    </div>
                    {/* Percentage box overlapping bottom of circle */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/4 bg-black/90 rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-3 w-[90%] max-w-[200px]">
                      <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                        <span className="text-[10px] sm:text-xs text-gray-500">0%</span>
                        <span className="text-xl sm:text-3xl font-bold text-white">{satisfactionRate}%</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">100%</span>
                      </div>
                      <div className="text-gray-400 text-[10px] sm:text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis">Based on completed orders</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Performance - Taller */}
              <div className="lg:col-span-4 backdrop-blur-2xl rounded-3xl p-4 sm:p-6" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)', minHeight: '320px', maxHeight: '420px' }}>
                <div className="flex justify-between items-start mb-4 sm:mb-6 flex-shrink-0">
                  <h3 className="text-white font-bold text-lg sm:text-xl whitespace-nowrap overflow-hidden text-ellipsis">Referral Tracking</h3>
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="3" r="1.5" fill="#9ca3af"/>
                      <circle cx="8" cy="8" r="1.5" fill="#9ca3af"/>
                      <circle cx="8" cy="13" r="1.5" fill="#9ca3af"/>
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 min-h-0">
                  {/* Left side - Stats boxes */}
                  <div className="space-y-3 sm:space-y-4 flex-shrink-0 w-full sm:w-auto">
                    <div className="bg-black/40 rounded-2xl p-3 sm:p-4 min-w-[100px] sm:min-w-[120px]">
                      <p className="text-gray-400 text-xs mb-1 sm:mb-2">Invited</p>
                      <p className="text-white text-2xl sm:text-3xl font-bold mb-0.5 break-words">{referralData.invited}</p>
                      <p className="text-white text-xs sm:text-sm">people</p>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 sm:p-4 min-w-[100px] sm:min-w-[120px]">
                      <p className="text-gray-400 text-xs mb-1 sm:mb-2">Bonus</p>
                      <p className="text-white text-2xl sm:text-3xl font-bold break-words">₵{referralData.bonus.toLocaleString()}</p>
                    </div>
                  </div>
                  {/* Right side - Circular progress */}
                  <div className="flex-1 flex flex-col items-center justify-center pt-2 sm:pt-4 w-full min-h-0">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <span className="text-gray-400 text-xs sm:text-sm">Safety</span>
                    </div>
                    <div className="w-full max-w-[180px] sm:max-w-[200px] aspect-square relative">
                      <CircularProgressbar
                        value={(referralData.safetyScore / 5) * 100}
                        text=""
                        styles={buildStyles({
                          pathColor: '#10b981',
                          trailColor: 'rgba(16, 185, 129, 0.15)',
                          strokeLinecap: 'round',
                          pathTransitionDuration: 0.5
                        })}
                        strokeWidth={12}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl sm:text-5xl font-bold text-white break-words">{referralData.safetyScore}</div>
                        <div className="text-xs sm:text-sm text-gray-400 mt-1">Total Score</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sales Overview Area Chart */}
              <div className="lg:col-span-7 backdrop-blur-xl rounded-3xl p-6" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
                <div className="mb-6">
                  <h3 className="text-white font-bold text-xl mb-1">Service Overview</h3>
                  <p className="text-emerald-400 text-sm">
                    <span className="font-semibold">(+5%) more</span> deliveries this year
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorValue1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorValue3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Area type="monotone" dataKey="value1" stroke="#3b82f6" strokeWidth={3} fill="url(#colorValue1)" />
                    <Area type="monotone" dataKey="value2" stroke="#06b6d4" strokeWidth={3} fill="url(#colorValue2)" />
                    <Area type="monotone" dataKey="value3" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorValue3)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Right Side: Bar Chart and Active Users */}
              {/* Combined Bar Chart and Active Users Card */}
              <div className="lg:col-span-5 backdrop-blur-xl rounded-3xl p-6" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barCategoryGap="25%">
                    <YAxis 
                      stroke="transparent" 
                      style={{ fontSize: '11px' }} 
                      tick={{ fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={false}
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" fill="#fff" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Platform Activity Stats */}
                <div className="mt-6">
                  <div className="mb-4">
                    <h3 className="text-white font-bold text-lg mb-1">Platform Activity</h3>
                    <p className="text-emerald-400 text-xs">
                      <span className="font-semibold">(+{stats.activeUsers})</span> active this week
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Users size={16} className="text-white" />
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Customers</div>
                      <div className="text-lg font-bold text-white">{stats.activeUsers.toLocaleString()}</div>
                      <div className="w-full bg-gray-700/30 rounded-full h-1 mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.activeUsers / Math.max(stats.activeUsers, stats.totalOrders, stats.revenueToday, stats.agentsOnline)) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Fuel size={16} className="text-white" />
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Deliveries</div>
                      <div className="text-lg font-bold text-white">{stats.totalOrders.toLocaleString()}</div>
                      <div className="w-full bg-gray-700/30 rounded-full h-1 mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.totalOrders / Math.max(stats.activeUsers, stats.totalOrders, stats.revenueToday, stats.agentsOnline)) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <DollarSign size={16} className="text-white" />
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Revenue</div>
                      <div className="text-lg font-bold text-white">GH₵{stats.revenueToday.toLocaleString()}</div>
                      <div className="w-full bg-gray-700/30 rounded-full h-1 mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.revenueToday / Math.max(stats.activeUsers, stats.totalOrders, stats.revenueToday, stats.agentsOnline)) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Truck size={16} className="text-white" />
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Agents</div>
                      <div className="text-lg font-bold text-white">{stats.agentsOnline}</div>
                      <div className="w-full bg-gray-700/30 rounded-full h-1 mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.agentsOnline / Math.max(stats.activeUsers, stats.totalOrders, stats.revenueToday, stats.agentsOnline)) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <DataTable
              title="User Management"
              data={users.slice(0, 10)}
              columns={[
                { 
                  key: 'name', 
                  label: 'Author', 
                  render: (_: any, row: User & { avatar_url?: string, profile_image?: string, image_url?: string, photo?: string, picture?: string, profile_picture?: string }) => {
                    // Check multiple possible field names for user images
                    const avatarUrl = row.avatar_url || row.profile_image || row.image_url || row.photo || row.picture || row.profile_picture || (row as any).users?.avatar_url;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={row.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = row.name?.charAt(0).toUpperCase();
                              }}
                            />
                          ) : (
                            row.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{row.name}</div>
                          <div className="text-gray-400 text-xs">{row.email}</div>
                        </div>
                      </div>
                    );
                  }
                },
                { key: 'phone', label: 'Phone' },
                { key: 'role', label: 'Function', render: (role: string) => (
                  <div>
                    <div className="text-white font-semibold capitalize">{role}</div>
                    <div className="text-gray-400 text-xs">Organization</div>
                  </div>
                ) },
                { key: 'is_active', label: 'Status', render: (active: boolean) => <StatusBadge status={active ? 'active' : 'inactive'} /> },
                { key: 'created_at', label: 'Employed', render: (date: string) => new Date(date).toLocaleDateString() },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: User) => (
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                        onClick={() => {
                          setSelectedUser(row)
                          setShowUserDetails(true)
                        }}
                      >
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
                { 
                  key: 'users', 
                  label: 'Author', 
                  render: (user: User & { avatar_url?: string }) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user?.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user?.name || 'Agent'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = user?.name?.charAt(0).toUpperCase() || 'A';
                            }}
                          />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || 'A'
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{user?.name || 'N/A'}</div>
                        <div className="text-gray-400 text-xs">{user?.phone || 'N/A'}</div>
                      </div>
                    </div>
                  )
                },
                { key: 'service_type', label: 'Function', render: (type: string) => (
                  <div>
                    <div className="text-white font-semibold capitalize">{type?.replace('_', ' ')}</div>
                    <div className="text-gray-400 text-xs">Service</div>
                  </div>
                ) },
                { key: 'rating', label: 'Rating', render: (rating: number) => `⭐ ${rating}` },
                { key: 'is_verified', label: 'Status', render: (verified: boolean) => <StatusBadge status={verified ? 'approved' : 'pending'} /> },
                { key: 'total_jobs', label: 'Jobs', render: (jobs: number) => jobs || 0 },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: Agent) => (
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                        onClick={() => {
                          setSelectedAgent(row)
                          setShowAgentDetails(true)
                        }}
                      >
                        View
                      </button>
                      {!row.is_verified && (
                        <button 
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors"
                          disabled={actionLoading === row.id}
                          onClick={async () => {
                            console.log('🔵 Approve agent clicked:', row.id)
                            try {
                              setActionLoading(row.id)
                              const { data: userData } = await supabase.auth.getUser()
                              const adminId = userData.user?.id
                              
                              if (!adminId) {
                                throw new Error('Admin ID not found')
                              }
                              
                              console.log('🔵 Calling approve_agent_application with:', { application_id: row.id, admin_id: adminId })
                              
                              const { data, error } = await supabase.rpc('approve_agent_application', {
                                application_id: row.id,
                                admin_id: adminId,
                                admin_notes: 'Approved via agent management'
                              })
                              
                              console.log('🔵 Approval response:', { data, error })
                              
                              if (error) throw error
                              
                              toast.success('Agent approved successfully')
                              loadDashboardData()
                            } catch (err: any) {
                              console.error('❌ Error approving agent:', err)
                              toast.error(err.message || 'Failed to approve agent')
                            } finally {
                              setActionLoading(null)
                            }
                          }}
                        >
                          {actionLoading === row.id ? 'Processing...' : 'Approve'}
                        </button>
                      )}
                      <button 
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs transition-colors"
                        disabled={actionLoading === row.id}
                        onClick={async () => {
                          console.log('🔴 Suspend agent clicked:', row.id)
                          if (!window.confirm('Are you sure you want to suspend this agent?')) return
                          
                          try {
                            setActionLoading(row.id)
                            const { error } = await supabase
                              .from('agents')
                              .update({ 
                                is_available: false,
                                is_verified: false,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', row.id)
                            
                            if (error) throw error
                            
                            toast.success('Agent suspended successfully')
                            loadDashboardData()
                          } catch (err: any) {
                            console.error('❌ Error suspending agent:', err)
                            toast.error(err.message || 'Failed to suspend agent')
                          } finally {
                            setActionLoading(null)
                          }
                        }}
                      >
                        {actionLoading === row.id ? 'Processing...' : 'Suspend'}
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

      case 'mechanics':
        return (
          <div className="space-y-6">
            <DataTable
              title="Mechanic Management"
              data={mechanics.slice(0, 10)}
              columns={[
                { 
                  key: 'users', 
                  label: 'Author', 
                  render: (user: User & { avatar_url?: string }) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user?.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user?.name || 'Mechanic'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = user?.name?.charAt(0).toUpperCase() || 'M';
                            }}
                          />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || 'M'
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{user?.name || 'N/A'}</div>
                        <div className="text-gray-400 text-xs">{user?.phone || 'N/A'}</div>
                      </div>
                    </div>
                  )
                },
                { key: 'service_type', label: 'Function', render: (type: string) => (
                  <div>
                    <div className="text-white font-semibold capitalize">{type?.replace('_', ' ')}</div>
                    <div className="text-gray-400 text-xs">Service</div>
                  </div>
                ) },
                { key: 'rating', label: 'Rating', render: (rating: number) => `⭐ ${rating}` },
                { key: 'is_verified', label: 'Status', render: (verified: boolean) => <StatusBadge status={verified ? 'approved' : 'pending'} /> },
                { key: 'total_jobs', label: 'Jobs', render: (jobs: number) => jobs || 0 },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: Agent) => (
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs transition-colors"
                        onClick={() => {
                          setSelectedMechanic(row)
                          setShowMechanicDetails(true)
                        }}
                      >
                        View
                      </button>
                      {!row.is_verified && (
                        <button 
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors"
                          disabled={actionLoading === row.id}
                          onClick={async () => {
                            console.log('🔧 Approve mechanic clicked:', row.id)
                            try {
                              setActionLoading(row.id)
                              const { data: userData } = await supabase.auth.getUser()
                              const adminId = userData.user?.id
                              
                              if (!adminId) {
                                throw new Error('Admin ID not found')
                              }
                              
                              console.log('🔧 Calling approve_agent_application with:', { application_id: row.id, admin_id: adminId })
                              
                              const { data, error } = await supabase.rpc('approve_agent_application', {
                                application_id: row.id,
                                admin_id: adminId,
                                admin_notes: 'Approved via mechanic management'
                              })
                              
                              console.log('🔧 Approval response:', { data, error })
                              
                              if (error) throw error
                              
                              toast.success('Mechanic approved successfully')
                              loadDashboardData()
                            } catch (err: any) {
                              console.error('❌ Error approving mechanic:', err)
                              toast.error(err.message || 'Failed to approve mechanic')
                            } finally {
                              setActionLoading(null)
                            }
                          }}
                        >
                          {actionLoading === row.id ? 'Processing...' : 'Approve'}
                        </button>
                      )}
                      <button 
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs transition-colors"
                        disabled={actionLoading === row.id}
                        onClick={async () => {
                          console.log('🔴 Suspend mechanic clicked:', row.id)
                          if (!window.confirm('Are you sure you want to suspend this mechanic?')) return
                          
                          try {
                            setActionLoading(row.id)
                            const { error } = await supabase
                              .from('agents')
                              .update({ 
                                is_available: false,
                                is_verified: false,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', row.id)
                            
                            if (error) throw error
                            
                            toast.success('Mechanic suspended successfully')
                            loadDashboardData()
                          } catch (err: any) {
                            console.error('❌ Error suspending mechanic:', err)
                            toast.error(err.message || 'Failed to suspend mechanic')
                          } finally {
                            setActionLoading(null)
                          }
                        }}
                      >
                        {actionLoading === row.id ? 'Processing...' : 'Suspend'}
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Plus, label: 'Add Mechanic' }
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
                { 
                  key: 'name', 
                  label: 'Author', 
                  render: (_: any, row: Station & { users?: User & { avatar_url?: string }, avatar_url?: string, logo?: string, logo_url?: string, image_url?: string, profile_image?: string }) => {
                    // Check multiple possible field names for station images
                    const avatarUrl = row.logo || row.logo_url || row.image_url || row.profile_image || (row as any).users?.avatar_url || row.avatar_url;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={row.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = row.name?.charAt(0).toUpperCase();
                              }}
                            />
                          ) : (
                            row.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{row.name}</div>
                          <div className="text-gray-400 text-xs">{row.address}</div>
                        </div>
                      </div>
                    );
                  }
                },
                { key: 'petrol_price', label: 'Petrol Price', render: (price: number) => `₵${price}/L` },
                { key: 'diesel_price', label: 'Diesel Price', render: (price: number) => `₵${price}/L` },
                { key: 'is_verified', label: 'Status', render: (verified: boolean) => <StatusBadge status={verified ? 'approved' : 'pending'} /> },
                { key: 'is_active', label: 'Active', render: (active: boolean) => <StatusBadge status={active ? 'active' : 'inactive'} /> },
                { 
                  key: 'actions', 
                  label: 'Actions', 
                  render: (_: any, row: Station) => (
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                        onClick={() => {
                          setSelectedStation(row)
                          setShowStationDetails(true)
                        }}
                      >
                        View
                      </button>
                      {!row.is_verified && (
                        <button 
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors"
                          disabled={actionLoading === row.id}
                          onClick={async () => {
                            console.log('🏪 Approve station clicked:', row.id)
                            try {
                              setActionLoading(row.id)
                              const { error } = await supabase
                                .from('stations')
                                .update({ 
                                  is_verified: true,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', row.id)
                              
                              if (error) throw error
                              
                              toast.success('Station approved successfully')
                              loadDashboardData()
                            } catch (err: any) {
                              console.error('❌ Error approving station:', err)
                              toast.error(err.message || 'Failed to approve station')
                            } finally {
                              setActionLoading(null)
                            }
                          }}
                        >
                          {actionLoading === row.id ? 'Processing...' : 'Approve'}
                        </button>
                      )}
                      <button 
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs transition-colors"
                        disabled={actionLoading === row.id}
                        onClick={async () => {
                          console.log('🔴 Suspend station clicked:', row.id)
                          if (!window.confirm('Are you sure you want to suspend this station?')) return
                          
                          try {
                            setActionLoading(row.id)
                            const { error } = await supabase
                              .from('stations')
                              .update({ 
                                is_active: false,
                                is_verified: false,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', row.id)
                            
                            if (error) throw error
                            
                            toast.success('Station suspended successfully')
                            loadDashboardData()
                          } catch (err: any) {
                            console.error('❌ Error suspending station:', err)
                            toast.error(err.message || 'Failed to suspend station')
                          } finally {
                            setActionLoading(null)
                          }
                        }}
                      >
                        {actionLoading === row.id ? 'Processing...' : 'Suspend'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Pending Applications */}
              <div 
                className="group relative backdrop-blur-xl rounded-3xl p-4 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-gray-400 text-xs font-medium">Pending Applications</div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 backdrop-blur-sm flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="text-4xl font-bold text-white mb-3">
                  {pendingAgents.filter(a => a.status === 'pending').length}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                  <Clock size={14} />
                  <span>Awaiting review</span>
                </div>
              </div>
              
              {/* Approved Applications */}
              <div 
                className="group relative backdrop-blur-xl rounded-3xl p-4 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-gray-400 text-xs font-medium">Approved Applications</div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <CheckCircle size={20} />
                  </div>
                </div>
                <div className="text-4xl font-bold text-white mb-3">
                  {pendingAgents.filter(a => a.status === 'approved').length}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <CheckCircle size={14} />
                  <span>Active agents</span>
                </div>
              </div>
              
              {/* Fuel Delivery Agents */}
              <div 
                className="group relative backdrop-blur-xl rounded-3xl p-4 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-gray-400 text-xs font-medium">Fuel Delivery Agents</div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Truck size={20} />
                  </div>
                </div>
                <div className="text-4xl font-bold text-white mb-3">
                  {pendingAgents.filter(a => a.service_type === 'fuel_delivery' || a.service_type === 'both').length}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
                  <Truck size={14} />
                  <span>On the road</span>
                </div>
              </div>
              
              {/* Mechanic Agents */}
              <div 
                className="group relative backdrop-blur-xl rounded-3xl p-4 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-gray-400 text-xs font-medium">Mechanic Agents</div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 backdrop-blur-sm flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Wrench size={20} />
                  </div>
                </div>
                <div className="text-4xl font-bold text-white mb-3">
                  {pendingAgents.filter(a => a.service_type === 'mechanic' || a.service_type === 'both').length}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-purple-400">
                  <Wrench size={14} />
                  <span>Ready to serve</span>
                </div>
              </div>
            </div>
            
            <DataTable
              title="Agent Applications"
              data={pendingAgents}
              columns={[
                { 
                  key: 'name', 
                  label: 'Author', 
                  render: (_: any, row: PendingAgent & { profile_image_url?: string }) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {row.profile_image_url ? (
                          <img 
                            src={row.profile_image_url} 
                            alt={row.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = row.name?.charAt(0).toUpperCase();
                            }}
                          />
                        ) : (
                          row.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{row.name}</div>
                        <div className="text-gray-400 text-xs">{row.email}</div>
                      </div>
                    </div>
                  )
                },
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
                          setSelectedPendingAgent(row)
                          setShowPendingAgentDetails(true)
                        }}
                      >
                        View
                      </button>
                      {row.status === 'pending' && (
                        <button 
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors"
                          disabled={actionLoading === row.id}
                          onClick={async () => {
                            console.log('🔵 Approve button clicked for agent:', row.id)
                            try {
                              setActionLoading(row.id)
                              console.log('🔵 Getting admin user...')
                              const { data: userData } = await supabase.auth.getUser()
                              const adminId = userData.user?.id
                              console.log('🔵 Admin ID:', adminId)
                              
                              if (!adminId) {
                                throw new Error('Admin ID not found')
                              }
                              
                              console.log('🔵 Calling approve_agent_application RPC...')
                              console.log('🔵 Parameters:', {
                                application_id: row.id,
                                admin_id: adminId,
                                admin_notes: 'Approved via admin dashboard'
                              })
                              
                              const { data, error } = await supabase.rpc('approve_agent_application', {
                                application_id: row.id,
                                admin_id: adminId,
                                admin_notes: 'Approved via admin dashboard'
                              })
                              
                              console.log('🔵 RPC Response:', { data, error })
                              
                              if (error) throw error
                              
                              console.log('✅ Approval successful!')
                              toast.success('Agent application approved successfully')
                              loadDashboardData()
                            } catch (err: any) {
                              console.error('❌ Error approving application:', err)
                              console.error('❌ Error details:', JSON.stringify(err, null, 2))
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
        
      case 'payments':
        return (
          <div className="space-y-6">
            {/* Payments Header */}
            <div 
              className="backdrop-blur-xl rounded-3xl p-8 shadow-lg"
              style={{
                background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Payment Transactions</h2>
                  <p className="text-gray-400">Monitor all financial transactions and revenue</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </button>
                  <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Report
                  </button>
                </div>
              </div>
            </div>

            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ${recentOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-xs">Total Revenue</div>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-medium">+12.5%</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{recentOrders.filter(o => o.status === 'completed').length}</div>
                    <div className="text-gray-400 text-xs">Transactions</div>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendingUp className="h-3 w-3 text-blue-400" />
                      <span className="text-blue-400 text-xs font-medium">+8.2%</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ${(recentOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total_amount || 0), 0) * 0.15).toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-xs">Platform Revenue</div>
                    <div className="text-gray-400 text-xs mt-0.5">(15% Commission)</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Wallet className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ${recentOrders.filter(o => o.status === 'pending' || o.status === 'accepted').reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-xs">Pending Payments</div>
                    <div className="text-amber-400 text-xs mt-0.5">{recentOrders.filter(o => o.status === 'pending' || o.status === 'accepted').length} orders</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Transactions Table */}
            <DataTable
              title="Recent Transactions"
              data={recentOrders.filter(o => o.status === 'completed' || o.status === 'pending').slice(0, 10).map(order => ({
                id: order.id,
                transaction_id: `TXN-${order.id.slice(0, 8).toUpperCase()}`,
                order_id: order.id.slice(0, 8).toUpperCase(),
                customer: order.customer_name || 'N/A',
                amount: order.total_amount || 0,
                platform_fee: (order.total_amount || 0) * 0.15,
                payment_method: 'Card',
                status: order.payment_status || (order.status === 'completed' ? 'completed' : 'pending'),
                created_at: order.created_at
              }))}
              columns={[
                { 
                  key: 'transaction_id', 
                  label: 'Transaction',
                  render: (id: string, row: any) => (
                    <div>
                      <div className="font-mono font-semibold text-purple-400">{id}</div>
                      <div className="text-gray-400 text-xs">Order #{row.order_id}</div>
                    </div>
                  )
                },
                { 
                  key: 'customer', 
                  label: 'Customer',
                  render: (name: string) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {name?.charAt(0).toUpperCase() || 'N'}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{name}</div>
                      </div>
                    </div>
                  )
                },
                { 
                  key: 'amount', 
                  label: 'Amount',
                  render: (amount: number) => (
                    <div className="text-emerald-400 font-semibold">${amount.toFixed(2)}</div>
                  )
                },
                { 
                  key: 'platform_fee', 
                  label: 'Platform Fee',
                  render: (fee: number) => (
                    <div className="text-purple-400 font-medium">${fee.toFixed(2)}</div>
                  )
                },
                { 
                  key: 'payment_method', 
                  label: 'Method',
                  render: (method: string) => (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-300">{method}</span>
                    </div>
                  )
                },
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
                { 
                  key: 'created_at', 
                  label: 'Date',
                  render: (date: string) => (
                    <div className="text-gray-300">
                      {new Date(date).toLocaleDateString()}
                    </div>
                  )
                },
                { 
                  key: 'actions', 
                  label: 'Actions',
                  render: () => (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors">
                        Details
                      </button>
                      <button className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs transition-colors">
                        Invoice
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Download, label: 'Export' },
                { icon: CreditCard, label: 'Process Payment' }
              ]}
            />
          </div>
        )
        
      case 'support':
        return (
          <div className="space-y-6">
            {/* Support Header */}
            <div 
              className="backdrop-blur-xl rounded-3xl p-8 shadow-lg"
              style={{
                background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Support Tickets</h2>
                  <p className="text-gray-400">Manage customer support requests and issues</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </button>
                  <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Ticket
                  </button>
                </div>
              </div>
            </div>

            {/* Support Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">18</div>
                    <div className="text-gray-400 text-xs">Open Tickets</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">7</div>
                    <div className="text-gray-400 text-xs">In Progress</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">156</div>
                    <div className="text-gray-400 text-xs">Resolved Today</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">2.4h</div>
                    <div className="text-gray-400 text-xs">Avg Response</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Support Tickets Table */}
            <DataTable
              title="Recent Tickets"
              data={[
                {
                  id: 1,
                  ticket_id: 'TKT-1234',
                  customer: 'John Doe',
                  email: 'john@example.com',
                  subject: 'Payment failed for order',
                  priority: 'high',
                  status: 'open',
                  category: 'Payment',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                {
                  id: 2,
                  ticket_id: 'TKT-1233',
                  customer: 'Jane Smith',
                  email: 'jane@example.com',
                  subject: 'Cannot track my order',
                  priority: 'medium',
                  status: 'in_progress',
                  category: 'Tracking',
                  created_at: new Date(Date.now() - 3600000).toISOString(),
                  updated_at: new Date(Date.now() - 1800000).toISOString()
                },
                {
                  id: 3,
                  ticket_id: 'TKT-1232',
                  customer: 'Mike Johnson',
                  email: 'mike@example.com',
                  subject: 'Request refund for cancelled order',
                  priority: 'high',
                  status: 'open',
                  category: 'Refund',
                  created_at: new Date(Date.now() - 7200000).toISOString(),
                  updated_at: new Date(Date.now() - 3600000).toISOString()
                },
                {
                  id: 4,
                  ticket_id: 'TKT-1231',
                  customer: 'Sarah Williams',
                  email: 'sarah@example.com',
                  subject: 'How to become an agent?',
                  priority: 'low',
                  status: 'resolved',
                  category: 'General',
                  created_at: new Date(Date.now() - 10800000).toISOString(),
                  updated_at: new Date(Date.now() - 5400000).toISOString()
                },
                {
                  id: 5,
                  ticket_id: 'TKT-1230',
                  customer: 'Robert Brown',
                  email: 'robert@example.com',
                  subject: 'App not working on iOS',
                  priority: 'high',
                  status: 'in_progress',
                  category: 'Technical',
                  created_at: new Date(Date.now() - 14400000).toISOString(),
                  updated_at: new Date(Date.now() - 7200000).toISOString()
                }
              ]}
              columns={[
                { 
                  key: 'ticket_id', 
                  label: 'Ticket',
                  render: (id: string) => (
                    <div className="font-mono font-semibold text-purple-400">{id}</div>
                  )
                },
                { 
                  key: 'customer', 
                  label: 'Customer',
                  render: (name: string, row: any) => (
                    <div>
                      <div className="text-white font-semibold">{name}</div>
                      <div className="text-gray-400 text-xs">{row.email}</div>
                    </div>
                  )
                },
                { 
                  key: 'subject', 
                  label: 'Subject',
                  render: (subject: string, row: any) => (
                    <div>
                      <div className="text-white font-medium max-w-xs truncate">{subject}</div>
                      <div className="text-gray-400 text-xs">{row.category}</div>
                    </div>
                  )
                },
                { 
                  key: 'priority', 
                  label: 'Priority',
                  render: (priority: string) => {
                    const configs = {
                      high: { color: 'text-rose-400', bg: 'bg-rose-500/20' },
                      medium: { color: 'text-amber-400', bg: 'bg-amber-500/20' },
                      low: { color: 'text-blue-400', bg: 'bg-blue-500/20' }
                    }
                    const config = configs[priority as keyof typeof configs] || configs.medium
                    return (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg ${config.bg}`}>
                        <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                        <span className={`${config.color} capitalize text-xs font-medium`}>{priority}</span>
                      </div>
                    )
                  }
                },
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
                { 
                  key: 'created_at', 
                  label: 'Created',
                  render: (date: string) => {
                    const d = new Date(date)
                    const now = new Date()
                    const diff = now.getTime() - d.getTime()
                    const hours = Math.floor(diff / 3600000)
                    if (hours < 1) return 'Just now'
                    if (hours < 24) return `${hours}h ago`
                    return d.toLocaleDateString()
                  }
                },
                { 
                  key: 'actions', 
                  label: 'Actions',
                  render: (_: any, row: any) => (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors">
                        View
                      </button>
                      {row.status !== 'resolved' && row.status !== 'closed' && (
                        <button className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors">
                          Resolve
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Download, label: 'Export' },
                { icon: Plus, label: 'New Ticket' }
              ]}
            />
          </div>
        )
        
      case 'promos':
        return (
          <div className="space-y-6">
            {/* Promos Header */}
            <div 
              className="backdrop-blur-xl rounded-3xl p-8 shadow-lg"
              style={{
                background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Promotional Campaigns</h2>
                  <p className="text-gray-400">Create and manage discount codes and campaigns</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Promo
                </button>
              </div>
            </div>

            {/* Promo Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">12</div>
                    <div className="text-gray-400 text-xs">Active Promos</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">1,247</div>
                    <div className="text-gray-400 text-xs">Total Uses</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">$24.5K</div>
                    <div className="text-gray-400 text-xs">Total Discounts</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">834</div>
                    <div className="text-gray-400 text-xs">Unique Users</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Promo Codes Table */}
            <DataTable
              title="Promotional Codes"
              data={[
                {
                  id: 1,
                  code: 'FUEL20',
                  discount: '20%',
                  type: 'percentage',
                  status: 'active',
                  uses: 156,
                  max_uses: 500,
                  valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: 2,
                  code: 'WELCOME10',
                  discount: '$10',
                  type: 'fixed',
                  status: 'active',
                  uses: 423,
                  max_uses: 1000,
                  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: 3,
                  code: 'SUMMER25',
                  discount: '25%',
                  type: 'percentage',
                  status: 'active',
                  uses: 87,
                  max_uses: 200,
                  valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: 4,
                  code: 'FREESHIP',
                  discount: '$5',
                  type: 'fixed',
                  status: 'active',
                  uses: 234,
                  max_uses: 500,
                  valid_until: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                  created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: 5,
                  code: 'EXPIRED50',
                  discount: '50%',
                  type: 'percentage',
                  status: 'expired',
                  uses: 347,
                  max_uses: 500,
                  valid_until: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                  created_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
                }
              ]}
              columns={[
                { 
                  key: 'code', 
                  label: 'Promo Code',
                  render: (code: string) => (
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg">
                        <span className="font-mono font-bold text-purple-400">{code}</span>
                      </div>
                    </div>
                  )
                },
                { 
                  key: 'discount', 
                  label: 'Discount',
                  render: (discount: string, row: any) => (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">{discount}</span>
                      <span className="text-gray-500 text-xs capitalize">({row.type})</span>
                    </div>
                  )
                },
                { 
                  key: 'uses', 
                  label: 'Usage',
                  render: (uses: number, row: any) => {
                    const percentage = (uses / row.max_uses) * 100
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">{uses} / {row.max_uses}</span>
                          <span className="text-gray-400">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  }
                },
                { 
                  key: 'valid_until', 
                  label: 'Expires',
                  render: (date: string) => {
                    const d = new Date(date)
                    const now = new Date()
                    const isExpired = d < now
                    return (
                      <div className={isExpired ? 'text-rose-400' : 'text-gray-300'}>
                        {d.toLocaleDateString()}
                      </div>
                    )
                  }
                },
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> },
                { 
                  key: 'actions', 
                  label: 'Actions',
                  render: (_: any, row: any) => (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors">
                        Edit
                      </button>
                      {row.status === 'active' && (
                        <button className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs transition-colors">
                          Pause
                        </button>
                      )}
                      <button className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs transition-colors">
                        Delete
                      </button>
                    </div>
                  )
                }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Download, label: 'Export' },
                { icon: Plus, label: 'Create Promo' }
              ]}
            />
          </div>
        )
        
      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Notifications Header */}
            <div 
              className="backdrop-blur-xl rounded-3xl p-8 shadow-lg"
              style={{
                background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Notifications Center</h2>
                  <p className="text-gray-400">Manage system alerts and broadcast messages</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Broadcast
                </button>
              </div>
            </div>

            {/* Notification Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">24</div>
                    <div className="text-gray-400 text-xs">Total Sent Today</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">98%</div>
                    <div className="text-gray-400 text-xs">Delivery Rate</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{users.length}</div>
                    <div className="text-gray-400 text-xs">Active Users</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>

              <div 
                className="backdrop-blur-xl rounded-3xl p-4 shadow-lg hover:transform hover:-translate-y-2 transition-all duration-500"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">3</div>
                    <div className="text-gray-400 text-xs">Pending Alerts</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            <DataTable
              title="Notification History"
              data={[
                {
                  id: 1,
                  title: 'New Order Alert',
                  message: 'Order #12345 requires immediate attention',
                  type: 'urgent',
                  recipients: 'All Agents',
                  sent_at: new Date().toISOString(),
                  status: 'delivered'
                },
                {
                  id: 2,
                  title: 'System Maintenance',
                  message: 'Scheduled maintenance on Sunday 2AM-4AM',
                  type: 'info',
                  recipients: 'All Users',
                  sent_at: new Date(Date.now() - 3600000).toISOString(),
                  status: 'delivered'
                },
                {
                  id: 3,
                  title: 'Promotion Alert',
                  message: 'New promo code: FUEL20 for 20% off',
                  type: 'promo',
                  recipients: 'Premium Users',
                  sent_at: new Date(Date.now() - 7200000).toISOString(),
                  status: 'delivered'
                },
                {
                  id: 4,
                  title: 'Payment Reminder',
                  message: 'Pending payments require action',
                  type: 'warning',
                  recipients: 'Agents with Pending',
                  sent_at: new Date(Date.now() - 10800000).toISOString(),
                  status: 'delivered'
                },
                {
                  id: 5,
                  title: 'Welcome Message',
                  message: 'Welcome to Fill Up! Complete your profile',
                  type: 'info',
                  recipients: 'New Users',
                  sent_at: new Date(Date.now() - 14400000).toISOString(),
                  status: 'delivered'
                }
              ]}
              columns={[
                { 
                  key: 'type', 
                  label: 'Type', 
                  render: (type: string) => {
                    const configs = {
                      urgent: { color: 'text-rose-400', bg: 'bg-rose-500/20', icon: AlertCircle },
                      warning: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: AlertCircle },
                      info: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Bell },
                      promo: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Sparkles }
                    }
                    const config = configs[type as keyof typeof configs] || configs.info
                    const Icon = config.icon
                    return (
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className={`${config.color} capitalize`}>{type}</span>
                      </div>
                    )
                  }
                },
                { key: 'title', label: 'Title' },
                { key: 'message', label: 'Message', render: (msg: string) => (
                  <div className="max-w-md truncate text-gray-400">{msg}</div>
                )},
                { key: 'recipients', label: 'Recipients' },
                { key: 'sent_at', label: 'Sent', render: (date: string) => {
                  const d = new Date(date)
                  const now = new Date()
                  const diff = now.getTime() - d.getTime()
                  const hours = Math.floor(diff / 3600000)
                  if (hours < 1) return 'Just now'
                  if (hours < 24) return `${hours}h ago`
                  return d.toLocaleDateString()
                }},
                { key: 'status', label: 'Status', render: (status: string) => <StatusBadge status={status} /> }
              ]}
              actions={[
                { icon: Filter, label: 'Filter' },
                { icon: Download, label: 'Export' },
                { icon: Send, label: 'New Broadcast' }
              ]}
            />
          </div>
        )
        
      case 'settings':
        return (
          <div className="space-y-6">
            {/* Settings Header */}
            <div 
              className="backdrop-blur-xl rounded-3xl p-8 shadow-lg"
              style={{
                background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Platform Settings</h2>
                  <p className="text-gray-400">Configure system preferences and platform settings</p>
                </div>
                <Settings className="h-12 w-12 text-purple-400" />
              </div>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Settings */}
              <div 
                className="backdrop-blur-xl rounded-3xl p-6 shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-400" />
                  General Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Platform Name</label>
                    <input 
                      type="text" 
                      defaultValue="Fill Up" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Support Email</label>
                    <input 
                      type="email" 
                      defaultValue="support@fillup.com" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Support Phone</label>
                    <input 
                      type="tel" 
                      defaultValue="+1 (555) 123-4567" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Structure */}
              <div 
                className="backdrop-blur-xl rounded-3xl p-6 shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Fee Structure
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Platform Commission (%)</label>
                    <input 
                      type="number" 
                      defaultValue="15" 
                      min="0" 
                      max="100" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Service Fee (Fixed)</label>
                    <input 
                      type="number" 
                      defaultValue="2.50" 
                      min="0" 
                      step="0.01" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Minimum Order Amount</label>
                    <input 
                      type="number" 
                      defaultValue="20" 
                      min="0" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Agent Settings */}
              <div 
                className="backdrop-blur-xl rounded-3xl p-6 shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  Agent Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Minimum Rating</label>
                    <input 
                      type="number" 
                      defaultValue="3.5" 
                      min="1" 
                      max="5" 
                      step="0.1" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Max Active Orders Per Agent</label>
                    <input 
                      type="number" 
                      defaultValue="5" 
                      min="1" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Auto-assign Orders</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div 
                className="backdrop-blur-xl rounded-3xl p-6 shadow-lg"
                style={{
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
                }}
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-400" />
                  Notifications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Email Notifications</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">SMS Notifications</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Push Notifications</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105">
                Save Changes
              </button>
            </div>
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
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at top right, #0ea5e9 0%, #1e40af 50%, #0c4a6e 100%)' }}>
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

      <div className="flex h-screen overflow-hidden">
        {/* Vision UI Sidebar - Fixed */}
        <div 
          className="h-[calc(100vh-2rem)] flex flex-col relative rounded-3xl m-4 flex-shrink-0 overflow-hidden"
          style={{ 
            width: sidebarCollapsed ? '80px' : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : 'width 300ms',
            background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
          }}
        >
          {/* Resize Handle */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500/50 transition-colors group z-50"
            >
              <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-purple-500/0 group-hover:bg-purple-500 rounded-full transition-all" />
            </div>
          )}
          
          {/* Logo with gradient line - Fixed at top */}
          <div className="p-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo1} alt="FillUp" className="w-full h-full object-contain" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-sm font-semibold text-white tracking-wider">
                    FILLUP ADMIN
                  </h1>
                </div>
              )}
            </div>
            {/* Gradient separator line */}
            <div 
              className="h-px w-full"
              style={{
                background: 'linear-gradient(90deg, rgba(224, 225, 226, 0) 0%, rgb(224, 225, 226) 49.52%, rgba(224, 225, 226, 0) 100%)'
              }}
            />
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2 pb-4">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentPage(item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${
                        currentPage === item.id
                          ? 'bg-white/10 backdrop-blur-xl'
                          : 'hover:bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        currentPage === item.id
                          ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 shadow-lg shadow-purple-500/50'
                          : 'bg-white/5'
                      }`}>
                        <item.icon size={18} className="text-white" />
                      </div>
                      {!sidebarCollapsed && (
                        <span className={`font-medium text-sm ${
                          currentPage === item.id ? 'text-white' : 'text-gray-400'
                        }`}>
                          {item.label}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Help Card - Scrollable with navigation */}
              {!sidebarCollapsed && (
                <div className="mt-4 mb-6">
                    <div 
                      className="rounded-3xl p-5 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3">
                          <Settings size={24} className="text-white" />
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">Need help?</h3>
                        <p className="text-white/80 text-xs mb-4">Please check our docs</p>
                        <button className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-all">
                          DOCUMENTATION
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </nav>

          {/* Logout Button - Fixed at bottom */}
          {!sidebarCollapsed && (
            <div className="px-4 pb-6 flex-shrink-0">
                <button
                  onClick={async () => {
                    await signOut()
                    navigate('/admin/login')
                  }}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:transform hover:scale-105 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}

          {/* User Profile - Collapsed State Only */}
          {sidebarCollapsed && (
            <div className="p-4 flex-shrink-0">
                <button
                  onClick={signOut}
                  className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  <LogOut size={20} className="text-gray-400 mx-auto" />
                </button>
              </div>
            )}
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
          {/* Header - Vision UI Style */}
          <header className="sticky top-0 z-40 p-4">
            <div 
              className="px-6 py-4 backdrop-blur-2xl rounded-3xl"
              style={{ background: 'rgba(6, 11, 40, 0.7)' }}
            >
              <div className="flex items-center justify-between">
              {/* Left Side - Breadcrumb */}
              <div>
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Home size={12} />
                  <span>/</span>
                  <span>{menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}</span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
                </h2>
              </div>

              {/* Right Side - Actions */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Type here..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 pl-9 pr-3 py-2 text-sm bg-white/5 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 transition-colors"
                  />
                </div>

                {/* Notification Bell */}
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
                  <Bell size={18} className="text-gray-400" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                </button>

                {/* Settings Icon */}
                <button 
                  onClick={() => setCurrentPage('settings')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Settings size={18} className="text-gray-400" />
                </button>

                {/* User Profile Dropdown */}
                <div className="relative group">
                  <button className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 hover:ring-offset-gray-900 transition-all">
                    {userProfile?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-[#0a0e23] rounded-2xl shadow-2xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {/* Profile Header */}
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {userProfile?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {userProfile?.name || 'Admin User'}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {userProfile?.email || 'admin@fillup.com'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          navigate('/profile')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
                      >
                        <User size={16} />
                        <span>My Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPage('settings')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
                      >
                        <Settings size={16} />
                        <span>Settings</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="p-2 border-t border-white/10">
                      <button
                        onClick={async () => {
                          await signOut()
                          navigate('/admin/login')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
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

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">User Details</h3>
                <p className="text-gray-400 text-sm">Complete user information</p>
              </div>
              <button
                onClick={() => setShowUserDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Info */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt={selectedUser.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedUser.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xl">{selectedUser.name || 'N/A'}</h4>
                      <p className="text-gray-400">{selectedUser.email}</p>
                      <p className="text-gray-400 text-sm">{selectedUser.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Role:</span>
                      <span className="text-white ml-2 capitalize">{selectedUser.role || 'Customer'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Status:</span>
                      <span className="text-white ml-2">{selectedUser.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Joined:</span>
                      <span className="text-white ml-2">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Additional Stats */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <h5 className="text-white font-semibold mb-4">Account Statistics</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Orders:</span>
                      <span className="text-white">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Spent:</span>
                      <span className="text-white">GH₵0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Activity:</span>
                      <span className="text-white">{selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Details Modal */}
      {showAgentDetails && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Agent Details</h3>
                <p className="text-gray-400 text-sm">Complete agent information</p>
              </div>
              <button
                onClick={() => setShowAgentDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Info */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedAgent.users?.avatar_url ? (
                        <img src={selectedAgent.users.avatar_url} alt={selectedAgent.users.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedAgent.users?.name?.charAt(0) || 'A'
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xl">{selectedAgent.users?.name || 'N/A'}</h4>
                      <p className="text-gray-400">{selectedAgent.users?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedAgent.users?.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Service Type:</span>
                      <span className="text-white ml-2 capitalize">{selectedAgent.service_type?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">License:</span>
                      <span className="text-white ml-2">{selectedAgent.license_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Vehicle:</span>
                      <span className="text-white ml-2">
                        {selectedAgent.vehicle_info ? 
                          `${selectedAgent.vehicle_info.make || ''} ${selectedAgent.vehicle_info.model || ''} ${selectedAgent.vehicle_info.year || ''}`.trim() || 
                          selectedAgent.vehicle_info.plateNumber || 'Vehicle Info Available'
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Agent Stats */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <h5 className="text-white font-semibold mb-4">Performance</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rating:</span>
                      <span className="text-white">⭐ {selectedAgent.rating || 5}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Jobs:</span>
                      <span className="text-white">{selectedAgent.total_jobs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Earnings:</span>
                      <span className="text-white">GH₵{selectedAgent.earnings || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white">{selectedAgent.is_verified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mechanic Details Modal */}
      {showMechanicDetails && selectedMechanic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Mechanic Details</h3>
                <p className="text-gray-400 text-sm">Complete mechanic information</p>
              </div>
              <button
                onClick={() => setShowMechanicDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Info */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedMechanic.users?.avatar_url ? (
                        <img src={selectedMechanic.users.avatar_url} alt={selectedMechanic.users.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedMechanic.users?.name?.charAt(0) || 'M'
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xl">{selectedMechanic.users?.name || 'N/A'}</h4>
                      <p className="text-gray-400">{selectedMechanic.users?.email}</p>
                      <p className="text-gray-400 text-sm">{selectedMechanic.users?.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Service Type:</span>
                      <span className="text-white ml-2 capitalize">{selectedMechanic.service_type?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">License:</span>
                      <span className="text-white ml-2">{selectedMechanic.license_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Vehicle:</span>
                      <span className="text-white ml-2">
                        {selectedMechanic.vehicle_info ? 
                          `${selectedMechanic.vehicle_info.make || ''} ${selectedMechanic.vehicle_info.model || ''} ${selectedMechanic.vehicle_info.year || ''}`.trim() || 
                          selectedMechanic.vehicle_info.plateNumber || 'Vehicle Info Available'
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Mechanic Stats */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <h5 className="text-white font-semibold mb-4">Performance</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rating:</span>
                      <span className="text-white">⭐ {selectedMechanic.rating || 5}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Jobs:</span>
                      <span className="text-white">{selectedMechanic.total_jobs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Earnings:</span>
                      <span className="text-white">GH₵{selectedMechanic.earnings || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white">{selectedMechanic.is_verified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Agent Details Modal */}
      {showPendingAgentDetails && selectedPendingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Agent Application</h3>
                <p className="text-gray-400 text-sm">Pending agent application details</p>
              </div>
              <button
                onClick={() => setShowPendingAgentDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Info */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedPendingAgent.profile_image_url ? (
                        <img src={selectedPendingAgent.profile_image_url} alt={selectedPendingAgent.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedPendingAgent.name?.charAt(0) || 'A'
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xl">{selectedPendingAgent.name || 'N/A'}</h4>
                      <p className="text-gray-400">{selectedPendingAgent.email}</p>
                      <p className="text-gray-400 text-sm">{selectedPendingAgent.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Service Type:</span>
                      <span className="text-white ml-2 capitalize">{selectedPendingAgent.service_type?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">License:</span>
                      <span className="text-white ml-2">{selectedPendingAgent.license_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Vehicle:</span>
                      <span className="text-white ml-2">
                        {selectedPendingAgent.vehicle_info ? 
                          `${selectedPendingAgent.vehicle_info.make || ''} ${selectedPendingAgent.vehicle_info.model || ''} ${selectedPendingAgent.vehicle_info.year || ''}`.trim() || 
                          selectedPendingAgent.vehicle_info.plateNumber || 'Vehicle Info Available'
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Application Info */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <h5 className="text-white font-semibold mb-4">Application Status</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <StatusBadge status={selectedPendingAgent.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Applied:</span>
                      <span className="text-white">{new Date(selectedPendingAgent.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Updated:</span>
                      <span className="text-white">{selectedPendingAgent.updated_at ? new Date(selectedPendingAgent.updated_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button 
                      className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                      onClick={async () => {
                        try {
                          const { data: userData } = await supabase.auth.getUser()
                          const adminId = userData.user?.id
                          
                          if (!adminId) throw new Error('Admin ID not found')
                          
                          const { error } = await supabase.rpc('approve_agent_application', {
                            application_id: selectedPendingAgent.id,
                            admin_id: adminId,
                            admin_notes: 'Approved via application details'
                          })
                          
                          if (error) throw error
                          
                          toast.success('Agent approved successfully')
                          setShowPendingAgentDetails(false)
                          loadDashboardData()
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to approve agent')
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Station Details Modal */}
      {showStationDetails && selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-2xl border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Station Details</h3>
                <p className="text-gray-400 text-sm">Complete station information</p>
              </div>
              <button
                onClick={() => setShowStationDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Station Info */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl">
                      {selectedStation.logo || selectedStation.logo_url || selectedStation.image_url ? (
                        <img src={selectedStation.logo || selectedStation.logo_url || selectedStation.image_url} alt={selectedStation.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedStation.name?.charAt(0) || 'S'
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xl">{selectedStation.name || 'N/A'}</h4>
                      <p className="text-gray-400">{selectedStation.address}</p>
                      <p className="text-gray-400 text-sm">{selectedStation.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Location:</span>
                      <span className="text-white ml-2">{selectedStation.address || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Owner:</span>
                      <span className="text-white ml-2">{selectedStation.users?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Contact:</span>
                      <span className="text-white ml-2">{selectedStation.phone || selectedStation.users?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Station Stats */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                  <h5 className="text-white font-semibold mb-4">Fuel Prices & Status</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Petrol Price:</span>
                      <span className="text-white">₵{selectedStation.petrol_price || 0}/L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Diesel Price:</span>
                      <span className="text-white">₵{selectedStation.diesel_price || 0}/L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verification:</span>
                      <StatusBadge status={selectedStation.is_verified ? 'approved' : 'pending'} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <StatusBadge status={selectedStation.is_active ? 'active' : 'inactive'} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Added:</span>
                      <span className="text-white">{new Date(selectedStation.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    {!selectedStation.is_verified && (
                      <button 
                        className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('stations')
                              .update({ 
                                is_verified: true,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', selectedStation.id)
                            
                            if (error) throw error
                            
                            toast.success('Station approved successfully')
                            setShowStationDetails(false)
                            loadDashboardData()
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to approve station')
                          }
                        }}
                      >
                        Approve
                      </button>
                    )}
                    <button 
                      className="flex-1 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to suspend this station?')) return
                        
                        try {
                          const { error } = await supabase
                            .from('stations')
                            .update({ 
                              is_active: false,
                              is_verified: false,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', selectedStation.id)
                          
                          if (error) throw error
                          
                          toast.success('Station suspended successfully')
                          setShowStationDetails(false)
                          loadDashboardData()
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to suspend station')
                        }
                      }}
                    >
                      Suspend
                    </button>
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