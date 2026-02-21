import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock01Icon, 
  Location01Icon, 
  FuelStationIcon,
  Wrench01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Navigation01Icon,
  UserIcon
} from 'hugeicons-react'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'

interface PendingOrder {
  id: string
  service_type: string
  mechanic_service?: string
  delivery_address: string
  delivery_location?: { type: string; coordinates: [number, number] }
  total_amount: number
  assigned_at: string
  assignment_attempts: number
  notes?: string
  vehicles?: {
    make: string
    model: string
    plate_number: string
  }
  users?: {
    name: string
    phone: string
  }
}

interface PendingAcceptanceOrdersProps {
  agentId: string
  onOrderAccepted?: () => void
  onOrderDeclined?: () => void
}

export const PendingAcceptanceOrders: React.FC<PendingAcceptanceOrdersProps> = ({
  agentId,
  onOrderAccepted,
  onOrderDeclined
}) => {
  const navigate = useNavigate()
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)

  const loadPendingOrders = async () => {
    try {
      console.log('🔍 PendingAcceptanceOrders - Loading for agent:', agentId)
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          vehicles(make, model, plate_number),
          users(name, phone)
        `)
        .eq('agent_id', agentId)
        .eq('status', 'pending_acceptance')
        .eq('service_type', 'mechanic')
        .order('assigned_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading pending orders:', error)
        throw error
      }

      console.log('✅ Pending acceptance orders found:', data?.length || 0)
      console.log('📋 Orders:', data)
      setPendingOrders(data || [])
    } catch (error) {
      console.error('Error loading pending orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingOrders()

    // Subscribe to changes - create a unique channel name with timestamp to avoid conflicts
    const channelName = `pending-orders-${agentId}-${Date.now()}`
    let isSubscriptionActive = true
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Order change detected:', payload)
          if (isSubscriptionActive) {
            loadPendingOrders()
          }
        }
      )

    // Subscribe and handle potential errors
    channel.subscribe((status, err) => {
      console.log('Subscription status:', status, err ? `Error: ${err}` : '')
      if (status === 'SUBSCRIBED' && isSubscriptionActive) {
        console.log('Successfully subscribed to pending orders:', channelName)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Subscription error:', status, err)
      }
    })

    return () => {
      console.log('Cleaning up subscription:', channelName)
      isSubscriptionActive = false
      
      // Unsubscribe and remove the channel
      channel.unsubscribe().then(() => {
        console.log('Unsubscribed from:', channelName)
      }).catch((error) => {
        console.warn('Error during unsubscribe:', error)
      })
      
      supabase.removeChannel(channel)
    }
  }, [agentId])

  const calculateTimeRemaining = (assignedAt: string) => {
    const assigned = new Date(assignedAt).getTime()
    const now = Date.now()
    const elapsed = now - assigned
    const twoMinutes = 2 * 60 * 1000
    const remaining = Math.max(0, twoMinutes - elapsed)
    
    const seconds = Math.floor(remaining / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    return { minutes, seconds: secs, expired: remaining === 0 }
  }

  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1) // Force re-render every second
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleAccept = async (orderId: string) => {
    setProcessingOrderId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('agent_id', agentId)
        .eq('status', 'pending_acceptance')

      if (error) throw error

      toast.success('Order accepted! Customer will be notified.')
      onOrderAccepted?.()
      loadPendingOrders()
    } catch (error: any) {
      console.error('Error accepting order:', error)
      toast.error(error.message || 'Failed to accept order')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleDecline = async (orderId: string) => {
    setProcessingOrderId(orderId)
    try {
      // Call the decline function via RPC
      const { error } = await supabase.rpc('decline_mechanic_order', {
        order_id: orderId,
        mechanic_id: agentId
      })

      if (error) throw error

      toast.success('Order declined. Finding another mechanic...')
      onOrderDeclined?.()
      loadPendingOrders()
    } catch (error: any) {
      console.error('Error declining order:', error)
      toast.error(error.message || 'Failed to decline order')
    } finally {
      setProcessingOrderId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (pendingOrders.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400 rounded-full"></div>
          Pending Orders
        </h2>
        <span className="bg-lime-400/20 text-lime-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-lime-400/30">
          {pendingOrders.length}
        </span>
      </div>

      <AnimatePresence>
        {pendingOrders.map((order) => {
          const timeRemaining = calculateTimeRemaining(order.assigned_at)
          const isExpiring = timeRemaining.minutes === 0 && timeRemaining.seconds <= 30

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => navigate(`/agent/new-order/${order.id}`)}
              className={`bg-gray-800 rounded-2xl p-4 mb-3 cursor-pointer hover:bg-gray-750 transition-all border ${
                isExpiring ? 'border-red-500/50' : 'border-gray-700'
              }`}
            >
              {/* Timer row */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${isExpiring ? 'bg-red-500/20' : 'bg-gray-700'} flex items-center justify-center`}>
                    <Clock01Icon size={16} className={isExpiring ? 'text-red-400' : 'text-gray-400'} />
                  </div>
                  <div>
                    <div className={`text-xl font-bold tabular-nums ${isExpiring ? 'text-red-400' : 'text-white'}`}>
                      {timeRemaining.expired ? '0:00' : `${timeRemaining.minutes}:${timeRemaining.seconds.toString().padStart(2, '0')}`}
                    </div>
                    <p className="text-xs text-gray-500">
                      {isExpiring ? 'Expiring' : 'Remaining'}
                    </p>
                  </div>
                </div>

                {order.assignment_attempts > 1 && (
                  <div className="bg-gray-700 rounded-lg px-2.5 py-1">
                    <span className="text-xs text-gray-300 font-medium">
                      Try {order.assignment_attempts}/3
                    </span>
                  </div>
                )}
              </div>

              {/* Service Info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wrench01Icon size={20} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-0.5">
                    {order.mechanic_service?.replace('_', ' ').toUpperCase() || 'Mechanic Service'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {order.vehicles ? `${order.vehicles.make} ${order.vehicles.model}` : 'Customer Vehicle'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-lime-400">₵{order.total_amount.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Fee</p>
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-2 mb-2 bg-gray-900/50 rounded-lg p-2.5">
                <UserIcon size={14} className="text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{order.users?.name || 'Customer'}</p>
                  <p className="text-xs text-gray-500">{order.users?.phone}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2 bg-gray-900/50 rounded-lg p-2.5">
                <Location01Icon size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400 flex-1">{order.delivery_address}</p>
              </div>

              {/* Tap hint */}
              <div className="mt-3 pt-2 border-t border-gray-700/50 text-center">
                <p className="text-xs text-gray-500">Tap to view details</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
