import React, { useState, useEffect } from 'react'
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Eye,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Fuel,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Download,
  Activity
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import loaderGif from '../../assets/lodaer.gif'

interface Order {
  id: string
  customer_id: string
  agent_id: string | null
  station_id: string | null
  vehicle_id: string | null
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  fuel_type: 'petrol' | 'diesel' | null
  fuel_quantity: number | null
  mechanic_service: string | null
  delivery_address: string
  total_amount: number
  created_at: string
  completed_at: string | null
  users: {
    name: string | null
    email: string
    phone: string | null
  }
  agents?: {
    users: {
      name: string | null
      phone: string | null
    }
  }
  stations?: {
    name: string
  }
  vehicles?: {
    make: string
    model: string
    plate_number: string
  }
}

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter, serviceFilter, dateFilter])

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey(name, email, phone),
          agents(users!agents_user_id_fkey(name, phone)),
          stations(name),
          vehicles(make, model, plate_number)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.delivery_address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(order => order.service_type === serviceFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(order => 
          new Date(order.created_at) >= filterDate
        )
      }
    }

    setFilteredOrders(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'accepted': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'fuel_delivery': return <Fuel className="h-4 w-4" />
      case 'mechanic': return <Wrench className="h-4 w-4" />
      case 'both': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getServiceColor = (serviceType: string) => {
    switch (serviceType) {
      case 'fuel_delivery': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'mechanic': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'both': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <img 
            src={loaderGif} 
            alt="Loading..."
            className="w-48 h-48 mx-auto object-contain"
          />
          <p className="mt-4 text-xl font-medium text-white">Loading Orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Order Management</h1>
          <p className="text-gray-300">Monitor and manage all service orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{orders.length}</div>
            <div className="text-gray-300 text-sm">Total Orders</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {orders.filter(o => o.status === 'pending').length}
            </div>
            <div className="text-gray-300 text-sm">Pending</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {orders.filter(o => o.status === 'in_progress').length}
            </div>
            <div className="text-gray-300 text-sm">In Progress</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {orders.filter(o => o.status === 'completed').length}
            </div>
            <div className="text-gray-300 text-sm">Completed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {orders.filter(o => o.status === 'cancelled').length}
            </div>
            <div className="text-gray-300 text-sm">Cancelled</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders by ID, customer, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Services</option>
                <option value="fuel_delivery">Fuel Delivery</option>
                <option value="mechanic">Mechanic</option>
                <option value="both">Both Services</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Orders ({filteredOrders.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Order</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Customer</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Service</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Agent</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Amount</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Date</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr 
                    key={order.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.4s ease-out forwards'
                    }}
                  >
                    <td className="py-4 px-2">
                      <div>
                        <p className="font-medium text-white">#{order.id.slice(0, 8)}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-xs">{order.delivery_address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div>
                        <p className="font-medium text-white">{order.users?.name || 'No name'}</p>
                        <p className="text-sm text-gray-400">{order.users?.email}</p>
                        {order.users?.phone && (
                          <p className="text-xs text-gray-500">{order.users.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getServiceColor(order.service_type)}`}>
                          {getServiceIcon(order.service_type)}
                          <span className="capitalize">{order.service_type.replace('_', ' ')}</span>
                        </span>
                        {order.service_type === 'fuel_delivery' && order.fuel_quantity && (
                          <div className="text-xs text-gray-400">
                            {order.fuel_quantity}L {order.fuel_type}
                          </div>
                        )}
                        {order.service_type === 'mechanic' && order.mechanic_service && (
                          <div className="text-xs text-gray-400">
                            {order.mechanic_service.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      {order.agents?.users ? (
                        <div>
                          <p className="text-white text-sm">{order.agents.users.name}</p>
                          <p className="text-gray-400 text-xs">{order.agents.users.phone}</p>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Not assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-3 w-3 text-green-400" />
                        <span className="font-medium text-white">₵{order.total_amount.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        {order.status === 'pending' && (
                          <button className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Assign
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'accepted') && (
                          <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}