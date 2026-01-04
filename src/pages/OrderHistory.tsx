import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft01Icon,
  Search01Icon,
  FilterHorizontalIcon,
  FuelStationIcon,
  Location01Icon,
  Calendar01Icon
} from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface Order {
  id: string
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  total_amount: number
  fuel_type?: 'petrol' | 'diesel'
  fuel_quantity?: number
  mechanic_service?: string
  delivery_address: string
  created_at: string
  completed_at?: string
  vehicles?: {
    make: string
    model: string
    plate_number: string
  }
  agents?: {
    users: {
      name: string
      phone: string
    }
  }
  stations?: {
    name: string
    image_url?: string
  }
}

export const OrderHistory: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('orders_data')
    return cached ? JSON.parse(cached) : []
  })
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  // Set up Realtime subscription with auto-reconnection
  useRealtimeSubscription({
    channelName: `orderhistory-orders-${user?.id}`,
    table: 'orders',
    filter: `customer_id=eq.${user?.id}`,
    onUpdate: loadOrders,
    enabled: !!user?.id
  })

  useEffect(() => {
    if (user?.id) {
      loadOrders()
    }
  }, [user?.id])

  // Real-time subscription temporarily disabled for testing
  // useEffect(() => {
  //   if (!user?.id) return
  //   // Subscription removed
  // }, [user?.id])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter, serviceFilter, dateFilter])

  const loadOrders = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          vehicles(make, model, plate_number),
          agents(users(name, phone)),
          stations(name, image_url)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading orders:', error)
        throw error
      }
      
      setOrders(data || [])
      localStorage.setItem('orders_data', JSON.stringify(data || []))
      setDataLoaded(true)
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
        order.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.stations?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vehicles?.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vehicles?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vehicles?.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
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
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="w-10"></div>
          <h1 className="text-xl font-semibold">Order History</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <FilterHorizontalIcon size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search01Icon size={20} color="#9CA3AF" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Find a station by name or location"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2">
          <button 
            onClick={() => setServiceFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              serviceFilter === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Company
          </button>
          <button 
            onClick={() => setServiceFilter('fuel_delivery')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              serviceFilter === 'fuel_delivery' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Gas
          </button>
          <button 
            onClick={() => setServiceFilter('mechanic')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              serviceFilter === 'mechanic' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Diesel
          </button>
          <button className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-gray-200 text-gray-700">
            Petrol
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-6 py-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FuelStationIcon size={64} color="#D1D5DB" className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {orders.length === 0 
                ? "You haven't placed any orders yet."
                : "No orders match your search."
              }
            </p>
            {orders.length === 0 && (
              <Link to="/request-fuel">
                <button className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600">
                  Order Fuel Now
                </button>
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div 
              key={order.id}
              onClick={() => navigate(`/order/${order.id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* Station Image */}
                <div className="relative flex-shrink-0">
                  {order.stations?.image_url ? (
                    <img
                      src={order.stations.image_url}
                      alt={order.stations.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                      <FuelStationIcon size={28} color="white" />
                    </div>
                  )}
                </div>

                {/* Station Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {order.stations?.name || 'Unknown Station'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Location01Icon size={14} color="#6B7280" />
                    <span className="truncate">{order.delivery_address.split(',')[0]}</span>
                  </div>
                </div>

                {/* Prices */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-gray-900 font-semibold">
                      {order.fuel_quantity ? `${order.fuel_quantity}L` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">Quantity</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-900 font-semibold">N/A</p>
                    <p className="text-xs text-gray-500">Price</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>

              {/* Order Date */}
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-3 ml-[62px]">
                <Calendar01Icon size={14} color="#6B7280" />
                <span>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="mx-1">•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  order.status === 'completed' ? 'bg-green-100 text-green-700' :
                  order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
