import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft01Icon,
  Location01Icon,
  Clock01Icon,
  FavouriteIcon,
  CallIcon,
  MessageMultiple02Icon
} from 'hugeicons-react'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface OrderTracking {
  id: string
  created_at: string
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  service_type: 'fuel_delivery' | 'mechanic'
  fuel_type?: string
  fuel_quantity?: number
  delivery_address: string
  total_amount: number
  updated_at: string
  agent?: {
    users: {
      name: string
      avatar_url?: string
      phone?: string
    }
    rating?: number
  }
  stations?: {
    name: string
    address: string
  }
}

export const OrderTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchOrder = async () => {
    if (!id) return
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          agents (
            rating,
            users (name, avatar_url, phone)
          ),
          stations (name, address)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setOrder(data as OrderTracking)
    } catch (err) {
      console.error('Error fetching order:', err)
    } finally {
      setLoading(false)
    }
  }

  // Set up Realtime subscription with auto-reconnection
  useRealtimeSubscription({
    channelName: `order-tracking-${id}`,
    table: 'orders',
    filter: `id=eq.${id}`,
    onUpdate: fetchOrder,
    enabled: !!id
  })

  useEffect(() => {
    fetchOrder()
  }, [id])

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Order not found</div>
      </div>
    )
  }

  const getStatusText = () => {
    switch (order.status) {
      case 'pending': return 'Finding driver...'
      case 'accepted': return 'Driver assigned'
      case 'in_progress': return 'On the way'
      case 'completed': return 'Package has been received'
      default: return 'Processing'
    }
  }

  const getStatusLocation = () => {
    switch (order.status) {
      case 'pending': return 'Waiting for driver'
      case 'accepted': return 'Driver en route to station'
      case 'in_progress': return 'My Location'
      case 'completed': return order.delivery_address
      default: return 'Processing'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft01Icon size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Track Order</h1>
      </div>

      {/* Map Area */}
      <div className="relative h-[45vh] bg-gradient-to-br from-orange-50 to-pink-50">
        {/* Simplified map placeholder with route */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="200" height="250" viewBox="0 0 200 250" fill="none">
            {/* Route path */}
            <path
              d="M 40 200 Q 40 150, 80 100 T 160 50"
              stroke="#FB923C"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            
            {/* Start point (station) */}
            <g transform="translate(40, 200)">
              <circle cx="0" cy="0" r="20" fill="white" stroke="#FB923C" strokeWidth="3"/>
              <rect x="-8" y="-8" width="16" height="16" fill="#FB923C" rx="2"/>
            </g>
            
            {/* End point (destination) */}
            <g transform="translate(160, 50)">
              <circle cx="0" cy="0" r="24" fill="#FB923C"/>
              <circle cx="0" cy="0" r="16" fill="white"/>
              <circle cx="0" cy="0" r="8" fill="#FB923C"/>
            </g>
          </svg>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 px-5 pt-6 pb-24">
        {/* Driver Info */}
        {order.agent && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                {order.agent.users.avatar_url ? (
                  <img 
                    src={order.agent.users.avatar_url} 
                    alt={order.agent.users.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-500 text-white font-semibold">
                    {order.agent.users.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Morning, {order.agent.users.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <FavouriteIcon size={12} className="text-orange-400 fill-orange-400" />
                  <span>4.8 reviews</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${order.agent.users.phone}`}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <CallIcon size={20} className="text-gray-700" />
              </a>
              <button className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors">
                <MessageMultiple02Icon size={20} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div className="space-y-4 mb-6">
          {/* Current Status */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                order.status === 'completed' ? 'bg-orange-500' : 'bg-orange-500 animate-pulse'
              }`}>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              {order.status !== 'completed' && (
                <div className="w-0.5 h-8 bg-gray-200"></div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{getStatusText()}</h4>
              <p className="text-xs text-gray-500">{getStatusLocation()}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(order.updated_at).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                }).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Destination */}
          {order.status !== 'completed' && (
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-600">{order.delivery_address.split(',')[0]}</h4>
                <p className="text-xs text-gray-500 line-clamp-1">{order.delivery_address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Button */}
        <button 
          onClick={() => navigate(`/order-details/${order.id}`)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          Checkout
        </button>
      </div>
    </div>
  )
}
