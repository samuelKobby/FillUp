import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import heroImg from '../assets/hero.png'
import { 
  Location01Icon,
  ArrowLeft01Icon,
  CarParking01Icon,
  Cancel01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  Wrench01Icon,
  StarIcon
} from 'hugeicons-react'
import { 
  Wrench, 
  CreditCard, 
  Car,
  Battery,
  Settings,
  Zap,
  Smartphone,
  Wallet
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getUserVehicles, getUserWallet } from '../lib/supabase'
import toast from '../lib/toast'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { getCache, setCache } from '../lib/cache'
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useGeolocated } from 'react-geolocated'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { GeoJSONPoint } from '../lib/database.types'

interface Vehicle {
  id: string
  make: string
  model: string
  plate_number: string
  fuel_type: 'petrol' | 'diesel'
  is_default: boolean
  image_url?: string
}

interface Mechanic {
  id: string
  user_id: string
  service_type: 'mechanic' | 'fuel' | 'both'
  specialties: string[]
  is_available: boolean
  is_verified: boolean
  rating?: number
  current_location: GeoJSONPoint | null
  users?: {
    name: string
    phone?: string
    avatar_url?: string
  }
}

const mechanicServices = [
  {
    id: 'battery_jump',
    name: 'Battery Jump Start',
    description: 'Quick battery jump start service',
    icon: Battery,
    basePrice: 50,
    estimatedTime: '15-30 mins',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'tire_change',
    name: 'Tire Change',
    description: 'Flat tire replacement service',
    icon: Settings,
    basePrice: 80,
    estimatedTime: '30-45 mins',
    color: 'from-blue-500 to-purple-500'
  },
  {
    id: 'engine_diagnosis',
    name: 'Engine Diagnosis',
    description: 'Basic engine troubleshooting',
    icon: Zap,
    basePrice: 120,
    estimatedTime: '45-60 mins',
    color: 'from-green-500 to-teal-500'
  },
  {
    id: 'general_repair',
    name: 'General Repair',
    description: 'Other mechanical issues',
    icon: Wrench,
    basePrice: 100,
    estimatedTime: '30-90 mins',
    color: 'from-red-500 to-pink-500'
  }
]

const paymentMethods = [
  {
    id: 'wallet',
    name: 'FillUp Wallet',
    description: 'Pay with your wallet balance',
    icon: Wallet,
    color: 'blue',
    fees: 0
  },
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    description: 'Pay with MTN MoMo',
    icon: Smartphone,
    color: 'yellow',
    fees: 0.01
  },
  {
    id: 'vodafone_cash',
    name: 'Vodafone Cash',
    description: 'Pay with Vodafone Cash',
    icon: Smartphone,
    color: 'red',
    fees: 0.01
  },
  {
    id: 'card',
    name: 'Debit/Credit Card',
    description: 'Pay with Visa or Mastercard',
    icon: CreditCard,
    color: 'purple',
    fees: 0.025
  }
]

export const RequestMechanic: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isOffline, wasOffline } = useNetworkStatus()
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    return user ? (getCache<Vehicle[]>('requestmechanic_vehicles', user.id) || []) : []
  })
  const [mechanics, setMechanics] = useState<Mechanic[]>(() => {
    return user ? (getCache<Mechanic[]>('requestmechanic_mechanics', user.id) || []) : []
  })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showCachedData, setShowCachedData] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedPayment, setSelectedPayment] = useState<string>('wallet')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium')
  const [scheduledTime, setScheduledTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [step, setStep] = useState(1)
  const [showVehicleSelect, setShowVehicleSelect] = useState(false)
  const [showPaymentSelect, setShowPaymentSelect] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null)
  const [loadingError, setLoadingError] = useState('')

  useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  })
  
  const loadData = async () => {
    if (!user) return

    setLoading(true)

    try {
      const [vehiclesResult, mechanicsResult, walletResult] = await Promise.all([
        getUserVehicles(user.id),
        supabase
          .from('agents')
          .select(`
            *,
            users!agents_user_id_fkey(name, phone, avatar_url)
          `)
          .in('service_type', ['mechanic', 'both'])
          .eq('is_available', true)
          .eq('is_verified', true)
          .order('created_at', { ascending: false }),
        getUserWallet(user.id)
      ])

      if (mechanicsResult.error) {
        setLoadingError('Failed to load mechanics')
      } else {
        setMechanics(mechanicsResult.data || [])
      }

      setVehicles(vehiclesResult)
      setWalletBalance(walletResult?.balance || 0)
      if (user?.id) {
        setCache('requestmechanic_vehicles', vehiclesResult, user.id)
        setCache('requestmechanic_mechanics', mechanicsResult.data || [], user.id)
      }

      const defaultVehicle = vehiclesResult.find(v => v.is_default)
      if (defaultVehicle) {
        setSelectedVehicle(defaultVehicle)
      }
      
      setDataLoaded(true)
      setShowCachedData(true)
    } catch (error) {
      setLoadingError(isOffline ? 'No internet connection' : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Set up Realtime subscriptions with auto-reconnection
  useRealtimeSubscription({
    channelName: `requestmechanic-mechanics-${user?.id}`,
    table: 'agents',
    onUpdate: loadData,
    enabled: !!user?.id
  })

  useRealtimeSubscription({
    channelName: `requestmechanic-vehicles-${user?.id}`,
    table: 'vehicles',
    filter: `user_id=eq.${user?.id}`,
    onUpdate: loadData,
    enabled: !!user?.id
  })

  useRealtimeSubscription({
    channelName: `requestmechanic-wallets-${user?.id}`,
    table: 'wallets',
    filter: `user_id=eq.${user?.id}`,
    onUpdate: loadData,
    enabled: !!user?.id
  })

  useEffect(() => {
    if (user?.id) {
      loadData()
      
      // Show cached data after 500ms if fresh data is taking time
      const timer = setTimeout(() => {
        if (!dataLoaded) {
          setShowCachedData(true)
        }
      }, 500)
      
      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
          }
        )
      }
      
      return () => clearTimeout(timer)
    }
  }, [user?.id])

  // Reload data when coming back online
  useEffect(() => {
    if (wasOffline && user?.id) {
      loadData()
    }
  }, [wasOffline, user?.id])

  const calculateSubtotal = () => {
    if (!selectedService) return 0
    
    const basePrice = selectedService.basePrice
    const urgencyMultiplier = urgency === 'high' ? 1.5 : urgency === 'medium' ? 1.2 : 1
    return basePrice * urgencyMultiplier
  }

  const calculatePaymentFees = () => {
    const subtotal = calculateSubtotal()
    const paymentMethod = paymentMethods.find(p => p.id === selectedPayment)
    return subtotal * (paymentMethod?.fees || 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const paymentFees = calculatePaymentFees()
    const platformFee = subtotal * 0.1
    
    return subtotal + paymentFees + platformFee
  }

  const canAffordPayment = () => {
    const total = calculateTotal()
    if (selectedPayment === 'wallet') {
      return walletBalance >= total
    }
    return true
  }

  const handleSubmitOrder = async () => {
    if (!selectedVehicle || !selectedMechanic || !selectedService || !selectedLocation || !description.trim() || !selectedPayment) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const total = calculateTotal()
      
      // Create a PostgreSQL Point for the delivery location
      const deliveryLocation = selectedLocation ? `(${selectedLocation.lng}, ${selectedLocation.lat})` : '(0, 0)';
      
      const orderPayload = {
        customer_id: user!.id,
        vehicle_id: selectedVehicle.id,
        agent_id: selectedMechanic.id,
        service_type: 'mechanic',
        mechanic_service: selectedService.id,
        delivery_location: deliveryLocation,
        delivery_address: location || 'Selected on map',
        total_amount: total,
        platform_fee: total * 0.1,
        agent_fee: total * 0.7,
        notes: `${description}\n\nUrgency: ${urgency}\nService: ${selectedService.name}`,
        scheduled_time: scheduledTime || null,
        status: 'pending_acceptance',
        assigned_at: new Date().toISOString()
      }
      
      console.log('Creating mechanic order with payload:', orderPayload)
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single()

      if (error) {
        console.error('Error creating order:', error)
        throw error
      }
      
      console.log('✅ Order created successfully:', data)

      const transactionPayload = {
        user_id: user!.id,
        order_id: data.id,
        type: 'payment',
        amount: total,
        description: `Mechanic service payment - ${selectedService.name}`,
        payment_method: selectedPayment,
        status: selectedPayment === 'wallet' ? 'completed' : 'pending'
      }
      
      await supabase
        .from('transactions')
        .insert([transactionPayload])

      if (selectedPayment === 'wallet') {
        const walletUpdatePayload = {
          balance: walletBalance - total,
          total_spent: (walletBalance - total) + total
        }
        
        await supabase
          .from('wallets')
          .update(walletUpdatePayload)
          .eq('user_id', user!.id)
      }

      // Store success order ID and show success page
      setSuccessOrderId(data.id)
      sessionStorage.setItem('orderSuccessId', data.id)
      setShowOrderSuccess(true)
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to place order. Please try again.'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // Map click handler component
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        setLocation(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
      },
    });
    return null;
  };

  const total = calculateTotal()
  const subtotal = calculateSubtotal()
  const paymentFees = calculatePaymentFees()
  const canAfford = canAffordPayment()

  // Show loading error if there's an error
  if (loadingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircleIcon size={48} color="#EF4444" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{loadingError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show loading state while initial data loads
  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  // Wrap all returns in AnimatePresence for smooth transitions
  return (
    <AnimatePresence mode="sync" initial={false}>
      {(() => {
  // Order Success Confirmation Page - Show this first if order was successful
  if (showOrderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            {/* Party Emoji */}
            <div className="text-8xl mb-6">🎉</div>
            
            {/* Congratulations Text */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Congratulations</h1>
            <p className="text-gray-600 mb-4">Your Service Request is Confirmed!</p>
            
            {/* Order ID */}
            {successOrderId && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Order ID</p>
                <p className="text-sm font-mono font-semibold text-gray-900">{successOrderId.slice(0, 8).toUpperCase()}</p>
              </div>
            )}
            
            {/* Additional Message */}
            <p className="text-sm text-gray-500 mb-8">
              Thank you for choosing our service.<br />
              A mechanic will be assigned to you soon.
            </p>
            
            {/* Track Order Button */}
            <button 
              onClick={() => {
                // Clear success state before navigation
                sessionStorage.removeItem('orderSuccessId')
                setShowOrderSuccess(false)
                setSuccessOrderId(null)
                navigate('/dashboard', { state: { activeTab: 'orders' } })
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Track Service Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
        <motion.div
          key="step-1"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ 
            x: 0, 
            opacity: 1,
            transition: {
              x: {
                type: 'spring',
                stiffness: 400,
                damping: 40,
                mass: 0.8
              },
              opacity: { duration: 0.2, ease: 'easeOut' }
            }
          }}
          exit={{ 
            x: '-30%',
            opacity: 0,
            transition: {
              x: {
                type: 'spring',
                stiffness: 400,
                damping: 40,
                mass: 0.8
              },
              opacity: { duration: 0.2, ease: 'easeIn' }
            }
          }}
          style={{
            width: '100%',
            willChange: 'transform, opacity'
          }}
        >
      <div className="min-h-screen bg-white pb-16 sm:pb-20">
        
          {/* Hero Image Section */}
        <div className="relative h-64 bg-gradient-to-r from-purple-600 to-blue-600 overflow-hidden">
          <img 
            src={heroImg}
            alt="Mechanic Service" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          
          {/* Back Button */}
          
          <Link to="/dashboard">
          <button 
            onClick={() => setStep(1)}
            className="absolute top-6 left-4 p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft01Icon size={20} color="white" />
          </button>
          </Link>
          {/* Title */}
          <div className="absolute bottom-6 left-4 right-4">
            <h1 className="text-2xl font-bold text-white mb-1">Order Mechanic Service</h1>
            <p className="text-white text-opacity-90">Choose your preferred mechanic</p>
          </div>
        </div>

         {/* Content with rounded top corners */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-screen"> 
          <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
          
          {/* Show loading indicator if data is being fetched */}
          {!dataLoaded && showCachedData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-600">Updating mechanics...</span>
            </div>
          )}

          {/* Service Your Location */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Mechanics</h2>
          </div>
            
            {mechanics.length === 0 && !showCachedData ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 mb-2">Loading mechanics...</p>
                <p className="text-sm text-gray-500">Please wait</p>
              </div>
            ) : mechanics.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <Wrench01Icon size={48} color="#9CA3AF" className="mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No mechanics available</p>
                <p className="text-sm text-gray-500">Please try again later</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {mechanics.map((mechanic, index) => {
                  const colors = [
                    'from-blue-500 to-blue-700',
                    'from-purple-500 to-purple-700',
                    'from-red-500 to-red-700',
                    'from-green-500 to-green-700',
                    'from-orange-500 to-orange-700',
                    'from-gray-700 to-gray-900'
                  ];
                  
                  return (
                    <div
                      key={mechanic.id}
                      onClick={() => {
                        setSelectedMechanic(mechanic)
                        setStep(2)
                      }}
                      className="relative rounded-2xl overflow-hidden h-48 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    >
                      {/* Mechanic Image or Gradient Background */}
                      {mechanic.users?.avatar_url ? (
                        <img 
                          src={mechanic.users.avatar_url} 
                          alt={mechanic.users.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors[index % colors.length]}`}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Wrench01Icon size={64} color="rgba(255,255,255,0.3)" />
                          </div>
                        </div>
                      )}
                      
                      {/* Gradient Overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Mechanic Info at Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h4 className="font-medium text-white text-base mb-2 truncate">
                          {mechanic.users?.name || 'Mechanic'}
                        </h4>
                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex items-center space-x-1">
                            <StarIcon size={14} color="white" />
                            <span className="font-normal">{mechanic.rating || 4.8}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Location01Icon size={14} color="white" />
                            <span className="font-normal">2.5 km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
            )}
          </div>
          </div>
      </div>
        </motion.div>
    )
  }

  // Order details page (step 2) - Mechanic confirmation
  if (step === 2) {
    return (
        <motion.div
          key="step-2"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ 
            x: 0, 
            opacity: 1,
            transition: {
              x: {
                type: 'spring',
                stiffness: 400,
                damping: 40,
                mass: 0.8
              },
              opacity: { duration: 0.2, ease: 'easeOut' }
            }
          }}
          exit={{ 
            x: '-30%',
            opacity: 0,
            transition: {
              x: {
                type: 'spring',
                stiffness: 400,
                damping: 40,
                mass: 0.8
              },
              opacity: { duration: 0.2, ease: 'easeIn' }
            }
          }}
          style={{
            width: '100%',
            willChange: 'transform, opacity'
          }}
        >
      <div className="min-h-screen bg-gray-50 ">
        {/* Hero Image Section */}
        <div className="relative h-64  overflow-hidden">
          {selectedMechanic?.users?.avatar_url ? (
            <img 
              src={selectedMechanic.users.avatar_url} 
              alt={selectedMechanic.users.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = heroImg
              }}
            />
          ) : (
            <img 
              src={heroImg} 
              alt="Order Details" 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          
          {/* Back Button */}
          <button 
            onClick={() => setStep(1)}
            className="absolute top-6 left-4 p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft01Icon size={20} color="white" />
          </button>
          
          {/* Title */}
          <div className="absolute bottom-6 left-4 right-4">
            <h1 className="text-2xl font-bold text-white mb-1">Order Details</h1>
            <p className="text-white text-opacity-90">Complete your mechanic service order</p>
          </div>
        </div>

        {/* Content with rounded top corners */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-screen">
          <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-2 ">

            {/* Selected Mechanic Card */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <Wrench01Icon size={24} color="white" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold text-lg">{selectedMechanic?.users?.name || 'Mechanic'}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <StarIcon size={16} color="#EAB308" />
                        <span className="text-gray-600 text-xs">{selectedMechanic?.rating || 4.8}</span>
                        <span className="text-gray-400 text-xs">•</span>
                        <span className="text-gray-600 text-xs">2.5km away</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Available</p>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-auto mt-1"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Service Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {mechanicServices.map((service) => {
                  const Icon = service.icon
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedService?.id === service.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 bg-gradient-to-r ${service.color} rounded-lg flex items-center justify-center mb-3`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{service.name}</h4>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{service.description}</p>
                      <p className="text-xs text-blue-600 font-medium">From ₵{service.basePrice}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          
          {/* Vehicle Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vehicle
            </label>
            <div 
              onClick={() => setShowVehicleSelect(true)}
              className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-between cursor-pointer"
            >
              {selectedVehicle ? (
                <div className="flex items-center space-x-3">
                  {selectedVehicle.image_url ? (
                    <img 
                      src={selectedVehicle.image_url} 
                      alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                      className="w-10 h-10 rounded-lg object-contain bg-blue-50 border-2 border-blue-100"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CarParking01Icon size={20} color="#2563EB" />
                    </div>
                  )}
                  <div>
                    <p className="text-gray-900 font-medium">{selectedVehicle.make} {selectedVehicle.model}</p>
                    <p className="text-gray-600 text-sm">{selectedVehicle.plate_number}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Select a vehicle</p>
              )}
              <ArrowDown01Icon size={20} color="#9CA3AF" />
            </div>
          </div>
          
          {/* Vehicle Selection Modal */}
          {showVehicleSelect && ReactDOM.createPortal(
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-[9999]"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
                onClick={() => setShowVehicleSelect(false)}
              />
              <div 
                className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
              >
                <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto mx-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Select Vehicle</h3>
                  <button
                    onClick={() => setShowVehicleSelect(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Cancel01Icon size={20} color="#6B7280" />
                  </button>
                </div>
                
                {vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No vehicles found</p>
                    <button
                      onClick={() => {
                        setShowVehicleSelect(false)
                        navigate('/vehicles')
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Add Vehicle
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        onClick={() => {
                          setSelectedVehicle(vehicle)
                          setShowVehicleSelect(false)
                        }}
                        className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {vehicle.image_url ? (
                              <img 
                                src={vehicle.image_url} 
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="w-10 h-10 rounded-lg object-contain bg-blue-50 border-2 border-blue-100"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <CarParking01Icon size={20} color="#2563EB" />
                              </div>
                            )}
                            <div>
                              <p className="text-gray-900 font-medium">{vehicle.make} {vehicle.model}</p>
                              <p className="text-gray-600 text-sm">{vehicle.plate_number}</p>
                            </div>
                          </div>
                          {vehicle.is_default && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </div>
              </div>
            </>,
            document.body
          )}
          
          {/* Location - Interactive Map */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Location
            </label>
            <div className="relative rounded-lg overflow-hidden border border-gray-300" style={{ height: "400px" }}>
              <MapContainer
                center={userLocation || { lat: 5.6037, lng: -0.187 }}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler />
                {selectedLocation && (
                  <LeafletMarker position={[selectedLocation.lat, selectedLocation.lng]} />
                )}
              </MapContainer>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {selectedLocation 
                ? `Selected: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
                : 'Tap on the map to select your location'}
            </p>
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      setSelectedLocation({ lat: latitude, lng: longitude });
                      setUserLocation({ lat: latitude, lng: longitude });
                      setLocation("Current Location");
                    },
                    (error) => {
                      toast.error('Unable to get your location')
                    }
                  );
                } else {
                  toast.error('Geolocation is not supported by your browser')
                }
              }}
              className="mt-4 w-full flex items-center justify-center bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Location01Icon size={20} color="white" className="mr-2" /> Use My Current Location
            </button>
          </div>

          {/* Problem Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Problem Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem in detail. What happened? What symptoms are you experiencing?"
              className="w-full bg-white border border-gray-300 rounded-lg p-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>

          {/* Urgency Level */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: 'Low', desc: 'Can wait', color: 'green' },
                { value: 'medium', label: 'Medium', desc: 'Soon as possible', color: 'yellow' },
                { value: 'high', label: 'High', desc: 'Emergency', color: 'red' }
              ].map((level) => (
                <div
                  key={level.value}
                  onClick={() => setUrgency(level.value as any)}
                  className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                    urgency === level.value
                      ? level.color === 'green' 
                        ? 'border-green-600 bg-green-50 text-green-700' 
                        : level.color === 'yellow'
                          ? 'border-yellow-600 bg-yellow-50 text-yellow-700'
                          : 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                    level.color === 'green' ? 'bg-green-600' :
                    level.color === 'yellow' ? 'bg-yellow-600' : 'bg-red-600'
                  }`}></div>
                  <h4 className="font-semibold text-sm">{level.label}</h4>
                  <p className="text-xs opacity-80">{level.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Time */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">
              Leave empty for immediate assistance
            </p>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div 
              onClick={() => setShowPaymentSelect(true)}
              className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-between cursor-pointer"
            >
              {selectedPayment ? (
                <div className="flex items-center space-x-3">
                  {(() => {
                    const method = paymentMethods.find(p => p.id === selectedPayment)
                    const Icon = method?.icon || CreditCard
                    return (
                      <>
                        <Icon className="h-5 w-5 text-gray-600" />
                        <span className="text-gray-900">{method?.name}</span>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-gray-500">Select payment method</p>
              )}
              <ArrowDown01Icon size={20} color="#9CA3AF" />
            </div>
          </div>
          
          {/* Payment Method Modal */}
          {showPaymentSelect && ReactDOM.createPortal(
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-[9999]"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
                onClick={() => setShowPaymentSelect(false)}
              />
              <div 
                className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
              >
                <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto mx-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Select Payment Method</h3>
                  <button
                    onClick={() => setShowPaymentSelect(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Cancel01Icon size={20} color="#6B7280" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const isWallet = method.id === 'wallet'
                    const canUseMethod = !isWallet || walletBalance >= total
                    
                    return (
                      <div
                        key={method.id}
                        onClick={() => {
                          if (canUseMethod) {
                            setSelectedPayment(method.id)
                            setShowPaymentSelect(false)
                          }
                        }}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPayment === method.id
                            ? 'border-blue-600 bg-blue-50'
                            : canUseMethod
                              ? 'border-gray-200 hover:bg-gray-50'
                              : 'border-gray-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 text-gray-600" />
                            <div>
                              <h4 className="font-medium text-gray-900">{method.name}</h4>
                              <p className="text-sm text-gray-600">{method.description}</p>
                              {isWallet && (
                                <p className="text-xs text-gray-500">
                                  Balance: ₵{walletBalance.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {method.fees > 0 && (
                              <p className="text-sm text-gray-600">
                                +{(method.fees * 100).toFixed(1)}% fee
                              </p>
                            )}
                            {!canUseMethod && isWallet && (
                              <p className="text-xs text-red-600">Insufficient balance</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
                </div>
              </div>
            </>,
            document.body
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span className="text-gray-900">₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (10%)</span>
                <span className="text-gray-900">₵{(subtotal * 0.1).toFixed(2)}</span>
              </div>
              {paymentFees > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Processing</span>
                  <span className="text-gray-900">₵{paymentFees.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-600">₵{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || !selectedVehicle || !selectedService || !selectedLocation || !description.trim() || !selectedPayment || !canAfford}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Placing Request...' : 'Request Service'}
            </button>
            
            {!canAfford && selectedPayment === 'wallet' && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Insufficient wallet balance. Please top up or choose another payment method.
              </p>
            )}
          </div>
          </div>
        </div>
      </div>
        </motion.div>
    )
  }

  // End of component - fallback return
  return null
      })()}
    </AnimatePresence>
  )
}