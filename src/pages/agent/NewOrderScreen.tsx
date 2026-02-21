import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Clock01Icon, 
  Location01Icon, 
  Wrench01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  UserIcon,
  ArrowLeft01Icon,
  Navigation01Icon
} from 'hugeicons-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from '../../lib/toast'

interface OrderDetails {
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
    image_url?: string
  }
  users?: {
    name: string
    phone: string
    avatar_url?: string
  }
}

export const NewOrderScreen: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)

  // Time countdown
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    loadOrderAndAgent()
  }, [orderId, user])

  useEffect(() => {
    if (!order?.assigned_at) return

    const interval = setInterval(() => {
      const assigned = new Date(order.assigned_at).getTime()
      const now = Date.now()
      const elapsed = now - assigned
      const twoMinutes = 2 * 60 * 1000
      const remaining = Math.max(0, twoMinutes - elapsed)
      
      const seconds = Math.floor(remaining / 1000)
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      
      setTimeRemaining({
        minutes,
        seconds: secs,
        expired: remaining === 0
      })

      if (remaining === 0) {
        clearInterval(interval)
        toast.error('Time expired! Order reassigned.')
        setTimeout(() => navigate('/agent/dashboard'), 2000)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [order?.assigned_at, navigate])

  const loadOrderAndAgent = async () => {
    if (!user || !orderId) return

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!agentData) {
        toast.error('Agent profile not found')
        navigate('/agent/dashboard')
        return
      }

      setAgentId(agentData.id)

      // Get order details
      const { data: orderData, error } = await supabase
        .from('orders')
        .select(`
          *,
          vehicles(make, model, plate_number, image_url),
          users(name, phone, avatar_url)
        `)
        .eq('id', orderId)
        .eq('agent_id', agentData.id)
        .eq('status', 'pending_acceptance')
        .single()

      if (error || !orderData) {
        toast.error('Order not found or already processed')
        navigate('/agent/dashboard')
        return
      }

      setOrder(orderData)
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error('Failed to load order details')
      navigate('/agent/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!order || !agentId) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .eq('agent_id', agentId)
        .eq('status', 'pending_acceptance')

      if (error) throw error

      toast.success('Order accepted! Customer will be notified.')
      navigate('/agent/dashboard')
    } catch (error: any) {
      console.error('Error accepting order:', error)
      toast.error(error.message || 'Failed to accept order')
    } finally {
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!order || !agentId) return

    setProcessing(true)
    try {
      const { error } = await supabase.rpc('decline_mechanic_order', {
        order_id: order.id,
        mechanic_id: agentId
      })

      if (error) throw error

      toast.success('Order declined. Finding another mechanic...')
      navigate('/agent/dashboard')
    } catch (error: any) {
      console.error('Error declining order:', error)
      toast.error(error.message || 'Failed to decline order')
    } finally {
      setProcessing(false)
    }
  }

  const openInMaps = () => {
    if (!order?.delivery_location?.coordinates) return
    const [lng, lat] = order.delivery_location.coordinates
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  const isExpiring = timeRemaining.minutes === 0 && timeRemaining.seconds <= 30

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/agent/dashboard')}
            className="p-2 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <ArrowLeft01Icon size={24} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">New Order Request</h1>
            <p className="text-sm text-gray-400">Review and accept within time limit</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-8">
        {/* Modern Countdown Timer */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-6 overflow-hidden"
        >
          {/* Background glow effect */}
          <div className={`absolute inset-0 ${isExpiring ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' : 'bg-gradient-to-r from-lime-400/20 to-green-500/20'} blur-3xl`}></div>

          {/* Timer card */}
          <div className={`relative bg-gray-800 border-2 ${isExpiring ? 'border-red-500/50' : 'border-lime-400/50'} rounded-3xl p-8 text-center shadow-2xl`}>
            <div className="flex flex-col items-center gap-4">
              {/* Timer display */}
              <div className="relative">
                <div className={`absolute inset-0 ${isExpiring ? 'bg-red-500' : 'bg-lime-400'} blur-2xl opacity-30 animate-pulse`}></div>
                <div className="relative flex items-baseline gap-2">
                  <Clock01Icon size={40} className={`${isExpiring ? 'text-red-400' : 'text-lime-400'} ${isExpiring ? 'animate-pulse' : ''}`} />
                  <div className={`text-6xl font-black tabular-nums ${isExpiring ? 'text-red-400' : 'text-lime-400'}`}>
                    {timeRemaining.minutes}
                  </div>
                  <div className={`text-4xl font-black ${isExpiring ? 'text-red-400/70' : 'text-lime-400/70'}`}>:</div>
                  <div className={`text-6xl font-black tabular-nums ${isExpiring ? 'text-red-400' : 'text-lime-400'}`}>
                    {timeRemaining.seconds.toString().padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* Status text */}
              <div className="space-y-2">
                <p className={`text-lg font-bold ${isExpiring ? 'text-red-300' : 'text-white'}`}>
                  {isExpiring ? '⚠️ Time Running Out!' : 'Time to Accept Order'}
                </p>
                {order.assignment_attempts > 1 && (
                  <div className={`${isExpiring ? 'bg-red-500/20 border-red-500/30' : 'bg-lime-400/20 border-lime-400/30'} border rounded-full px-4 py-2 inline-block`}>
                    <span className={`text-sm font-semibold ${isExpiring ? 'text-red-300' : 'text-lime-300'}`}>
                      Attempt {order.assignment_attempts}/3
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Service Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 backdrop-blur-sm rounded-3xl p-6 mb-4 border border-gray-700"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-green-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-lime-400/20">
              <Wrench01Icon size={32} className="text-gray-900" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                {order.mechanic_service?.replace('_', ' ').toUpperCase() || 'Mechanic Service'}
              </h2>
              <p className="text-gray-400">
                {order.vehicles ? `${order.vehicles.make} ${order.vehicles.model}` : 'Customer Vehicle'}
              </p>
              {order.vehicles?.plate_number && (
                <p className="text-sm text-gray-500 mt-1">
                  Plate: {order.vehicles.plate_number}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-lime-400">₵{order.total_amount.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Total Earnings</p>
            </div>
          </div>

          {order.vehicles?.image_url && (
            <div className="rounded-xl overflow-hidden bg-gray-900">
              <img
                src={order.vehicles.image_url}
                alt="Vehicle"
                className="w-full h-44 object-cover"
              />
            </div>
          )}
        </motion.div>

        {/* Customer Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 backdrop-blur-sm rounded-3xl p-6 mb-4 border border-gray-700"
        >
          <h3 className="text-lg font-bold text-white mb-4">Customer Information</h3>
          <div className="flex items-center gap-4 mb-4">
            {order.users?.avatar_url ? (
              <img
                src={order.users.avatar_url}
                alt={order.users.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-lime-400 shadow-lg shadow-lime-400/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center shadow-lg shadow-lime-400/20">
                <UserIcon size={28} className="text-gray-900" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-lg font-bold text-white">{order.users?.name || 'Customer'}</p>
              <p className="text-gray-400">{order.users?.phone}</p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Location01Icon size={20} className="text-lime-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Service Location</p>
                <p className="text-white font-medium">{order.delivery_address}</p>
              </div>
              {order.delivery_location?.coordinates && (
                <button
                  onClick={openInMaps}
                  className="p-2 bg-lime-400 hover:bg-lime-500 rounded-xl transition-colors shadow-lg shadow-lime-400/20"
                >
                  <Navigation01Icon size={20} className="text-gray-900" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Problem Description */}
        {order.notes && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 backdrop-blur-sm rounded-3xl p-6 mb-6 border border-gray-700"
          >
            <h3 className="text-lg font-bold text-lime-400 mb-3">Problem Description</h3>
            <p className="text-white leading-relaxed">{order.notes}</p>
          </motion.div>
        )}

        {/* Action Buttons - Integrated in content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-4 mt-6"
        >
          <button
            onClick={handleDecline}
            disabled={processing}
            className="flex items-center justify-center gap-2 bg-gray-800 border-2 border-gray-600 text-white px-6 py-5 rounded-2xl font-bold hover:bg-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <Cancel01Icon size={24} />
            {processing ? 'Processing...' : 'Decline'}
          </button>
          <button
            onClick={handleAccept}
            disabled={processing || timeRemaining.expired}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-lime-400 to-green-500 text-gray-900 px-6 py-5 rounded-2xl font-bold hover:from-lime-500 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-lime-400/30"
          >
            <CheckmarkCircle02Icon size={24} />
            {processing ? 'Processing...' : 'Accept Order'}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
