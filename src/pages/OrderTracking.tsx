import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft01Icon,
  Location01Icon,
  Clock01Icon,
  FavouriteIcon,
  CallIcon,
  MessageMultiple02Icon,
  Navigation01Icon,
  Tick02Icon,
  Loading03Icon,
  TruckDeliveryIcon,
  PackageIcon
} from 'hugeicons-react'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { useDataRefreshOnVisibility } from '../hooks/useDataRefreshOnVisibility'
import { useCachedData } from '../hooks/useCachedData'
import { MapContainer, TileLayer, Marker, Polyline, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  agent_id?: string
  station_id?: string
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
    location?: {
      type: string
      coordinates: [number, number]
    }
  }
  vehicles?: {
    make: string
    model: string
    plate_number: string
  }
}

export const OrderTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.6037, -0.187]) // Accra, Ghana

  const fetchOrder = useCallback(async (): Promise<OrderTracking> => {
    if (!id) throw new Error('No order ID')
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        agents (
          rating,
          users (name, avatar_url, phone)
        ),
        stations (name, address, location),
        vehicles (make, model, plate_number)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as OrderTracking
  }, [id])

  const { data: order, loading } = useCachedData<OrderTracking>({
    cacheKey: `order_tracking_${id}`,
    userId: user?.id,
    fetchFn: fetchOrder,
    enabled: !!id
  })

  // Set up Realtime subscription with auto-reconnection
  useRealtimeSubscription({
    channelName: `order-tracking-${id}`,
    table: 'orders',
    filter: `id=eq.${id}`,
    onUpdate: fetchOrder,
    enabled: !!id
  })

  // Update map center when order data loads
  useEffect(() => {
    if (order?.stations?.location?.coordinates) {
      setMapCenter([order.stations.location.coordinates[1], order.stations.location.coordinates[0]])
    }
  }, [order])

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loading03Icon size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    switch (order.status) {
      case 'pending':
        return {
          text: 'Finding Driver',
          subtext: 'Searching for available driver nearby',
          icon: Loading03Icon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'accepted':
        return {
          text: 'Driver Assigned',
          subtext: 'Driver is heading to pickup location',
          icon: TruckDeliveryIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'in_progress':
        return {
          text: 'On The Way',
          subtext: 'Driver is heading to your location',
          icon: Navigation01Icon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        }
      case 'completed':
        return {
          text: 'Delivered',
          subtext: 'Order has been successfully delivered',
          icon: Tick02Icon,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      default:
        return {
          text: 'Processing',
          subtext: 'Processing your order',
          icon: PackageIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  // Get coordinates for map
  const stationCoords: [number, number] | null = order.stations?.location?.coordinates 
    ? [order.stations.location.coordinates[1], order.stations.location.coordinates[0]]
    : null

  // Simulated delivery location (you would get this from actual GPS tracking)
  const deliveryCoords: [number, number] = [5.6137, -0.177]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Map Container with Overlays */}
      <div className="relative h-[65vh]">
        {/* Map Layer */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Station Marker */}
            {stationCoords && (
              <>
                <Marker position={stationCoords} />
                <Circle
                  center={stationCoords}
                  radius={500}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
                />
              </>
            )}
            
            {/* Delivery Location Marker */}
            {order.status === 'in_progress' && (
              <>
                <Marker position={deliveryCoords} />
                <Circle
                  center={deliveryCoords}
                  radius={300}
                  pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.15 }}
                />
                
                {/* Route Line */}
                {stationCoords && (
                  <Polyline
                    positions={[stationCoords, deliveryCoords]}
                    pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.7, dashArray: '10, 10' }}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>

        {/* UI Overlays - Outside map container for proper z-index */}
        <div className="absolute inset-0 pointer-events-none z-[1000]">
          {/* Transparent Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 pointer-events-auto w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all hover:scale-110"
          >
            <ArrowLeft01Icon size={20} className="text-gray-700" />
          </motion.button>

          {/* Floating Status Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2`}
          >
            <StatusIcon size={20} className={`${statusInfo.color} ${order.status === 'pending' ? 'animate-spin' : ''}`} />
            <span className={`${statusInfo.color} font-semibold text-sm`}>{statusInfo.text}</span>
          </motion.div>
        </div>
      </div>

      {/* Details Card with Glassmorphism */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-xl rounded-t-[3rem] -mt-12 relative z-20 px-6 pt-8 pb-24 shadow-2xl"
      >
        {/* Driver Info Card */}
        <AnimatePresence>
          {order.agent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 mb-6 border border-blue-100 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-lg">
                      {order.agent.users.avatar_url ? (
                        <img 
                          src={order.agent.users.avatar_url} 
                          alt={order.agent.users.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl">
                          {order.agent.users.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Online Status Indicator */}
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{order.agent.users.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <FavouriteIcon size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-gray-700">{order.agent.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <span className="text-xs text-gray-500">• Driver</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.a
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    href={`tel:${order.agent.users.phone}`}
                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                  >
                    <CallIcon size={22} className="text-green-600" />
                  </motion.a>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                  >
                    <MessageMultiple02Icon size={22} className="text-white" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Details */}
        <div className="space-y-4 mb-6">
          {/* Service Type Badge */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
              </h2>
              <p className="text-sm text-gray-600">{statusInfo.subtext}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                ₵{order.total_amount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Order Specifics */}
          {order.service_type === 'fuel_delivery' && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Fuel Type & Quantity</p>
                  <p className="font-bold text-gray-900 text-lg">{order.fuel_quantity}L {order.fuel_type?.toUpperCase()}</p>
                </div>
                {order.vehicles && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Vehicle</p>
                    <p className="font-semibold text-gray-900 text-sm">{order.vehicles.make} {order.vehicles.model}</p>
                    <p className="text-xs text-gray-500">{order.vehicles.plate_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Timeline */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock01Icon size={20} className="text-blue-600" />
            Order Timeline
          </h3>
          <div className="space-y-4">
            {/* Status Steps */}
            {[
              { status: 'pending', label: 'Order Placed', completed: true },
              { status: 'accepted', label: 'Driver Assigned', completed: ['accepted', 'in_progress', 'completed'].includes(order.status) },
              { status: 'in_progress', label: 'On The Way', completed: ['in_progress', 'completed'].includes(order.status) },
              { status: 'completed', label: 'Delivered', completed: order.status === 'completed' }
            ].map((step, index) => (
              <motion.div
                key={step.status}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.completed 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg' 
                      : 'bg-gray-200'
                  }`}>
                    {step.completed ? (
                      <Tick02Icon size={20} className="text-white" />
                    ) : (
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    )}
                  </div>
                  {index < 3 && (
                    <div className={`w-0.5 h-8 ${step.completed ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <p className={`font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {step.completed && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 mb-6 border border-purple-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Location01Icon size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Delivery Address</p>
              <p className="font-semibold text-gray-900">{order.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {order.status !== 'completed' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/order/${order.id}`)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl"
            >
              View Full Details
            </motion.button>
          )}
          {order.status === 'completed' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl"
            >
              Back to Dashboard
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
