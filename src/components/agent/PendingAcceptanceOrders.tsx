import React, { useState, useEffect } from 'react'
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
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)

  const loadPendingOrders = async () => {
    try {
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

      if (error) throw error

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock01Icon size={24} className="text-orange-500" />
          Pending Your Acceptance
        </h2>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
          {pendingOrders.length} waiting
        </span>
      </div>

      <AnimatePresence>
        {pendingOrders.map((order) => {
          const timeRemaining = calculateTimeRemaining(order.assigned_at)
          const isExpiring = timeRemaining.minutes === 0 && timeRemaining.seconds <= 30

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`bg-gradient-to-r ${isExpiring ? 'from-red-50 to-orange-50 border-red-200' : 'from-orange-50 to-yellow-50 border-orange-200'} border-2 rounded-2xl p-6 mb-4 shadow-lg`}
            >
              {/* Timeout Warning */}
              <div className={`mb-4 flex items-center justify-between ${isExpiring ? 'text-red-600' : 'text-orange-600'}`}>
                <div className="flex items-center gap-2">
                  <Clock01Icon size={20} className={isExpiring ? 'animate-pulse' : ''} />
                  <span className="font-bold text-lg">
                    {timeRemaining.expired ? 'EXPIRED' : `${timeRemaining.minutes}:${timeRemaining.seconds.toString().padStart(2, '0')}`}
                  </span>
                  <span className="text-sm">remaining</span>
                </div>
                {order.assignment_attempts > 1 && (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                    Attempt {order.assignment_attempts}/3
                  </span>
                )}
              </div>

              {/* Service Info */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Wrench01Icon size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.mechanic_service?.replace('_', ' ').toUpperCase() || 'Mechanic Service'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.vehicles ? `${order.vehicles.make} ${order.vehicles.model}` : 'Customer Vehicle'}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold text-gray-900">₵{order.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-4 bg-white/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon size={16} className="text-gray-600" />
                  <p className="text-sm font-medium text-gray-900">{order.users?.name || 'Customer'}</p>
                  <span className="text-gray-400">•</span>
                  <p className="text-sm text-gray-600">{order.users?.phone}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Location01Icon size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{order.delivery_address}</p>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900 font-medium mb-1">Problem Description:</p>
                  <p className="text-sm text-blue-800">{order.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDecline(order.id)}
                  disabled={processingOrderId === order.id}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Cancel01Icon size={20} />
                  {processingOrderId === order.id ? 'Declining...' : 'Decline'}
                </button>
                <button
                  onClick={() => handleAccept(order.id)}
                  disabled={processingOrderId === order.id || timeRemaining.expired}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <CheckmarkCircle02Icon size={20} />
                  {processingOrderId === order.id ? 'Accepting...' : 'Accept Order'}
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
