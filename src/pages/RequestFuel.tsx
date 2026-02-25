import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Search01Icon,
  FilterIcon,
  Location01Icon,
  FuelStationIcon,
  ArrowLeft01Icon,
  CreditCardIcon,
  CarParking01Icon,
  Add01Icon,
  Remove01Icon,
  Cancel01Icon,
  AlertCircleIcon,
  StarIcon,
  SmartPhone01Icon,
  WalletAdd01Icon,
  ArrowDown01Icon
} from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getUserVehicles, getUserWallet } from '../lib/supabase'
import { GeoJSONPoint } from '../lib/database.types'
import toast from '../lib/toast'
import { getCache, setCache } from '../lib/cache'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useGeolocated } from 'react-geolocated';
import heroImg from '../assets/cars2.png'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface Vehicle {
  id: string
  make: string
  model: string
  plate_number: string
  fuel_type: 'petrol' | 'diesel'
  tank_capacity: number
  is_default: boolean
}

interface Station {
  id: string
  name: string
  petrol_price: number
  diesel_price: number
  location: GeoJSONPoint | null
  address: string
  phone: string
  is_verified: boolean
  is_active: boolean
  image_url?: string
}

const paymentMethods = [
  {
    id: 'wallet',
    name: 'FillUp Wallet',
    description: 'Pay with your wallet balance',
    icon: WalletAdd01Icon,
    color: 'blue',
    fees: 0
  },
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    description: 'Pay with MTN MoMo',
    icon: SmartPhone01Icon,
    color: 'yellow',
    fees: 0.01
  },
  {
    id: 'vodafone_cash',
    name: 'Vodafone Cash',
    description: 'Pay with Vodafone Cash',
    icon: SmartPhone01Icon,
    color: 'red',
    fees: 0.01
  },
  {
    id: 'card',
    name: 'Debit/Credit Card',
    description: 'Pay with Visa or Mastercard',
    icon: CreditCardIcon,
    color: 'purple',
    fees: 0.025
  }
]

const fuelCategories = [
  { id: 'all', name: 'All Type', active: true },
  { id: 'petrol', name: 'Petrol', active: false },
  { id: 'diesel', name: 'Diesel', active: false }
]

export const RequestFuel: React.FC = () => {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const { isOffline, wasOffline } = useNetworkStatus()
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    return user ? (getCache<Vehicle[]>('requestfuel_vehicles', user.id) || []) : []
  })
  const [stations, setStations] = useState<Station[]>(() => {
    return user ? (getCache<Station[]>('requestfuel_stations', user.id) || []) : []
  })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showCachedData, setShowCachedData] = useState(false)
  
  // Restore draft state from cache on mount
  const draftKey = `requestfuel_draft_${user?.id}`
  const savedDraft = user ? getCache<any>(draftKey, user.id, { ttl: 24 * 60 * 60 * 1000 }) : null
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(savedDraft?.selectedVehicleId ? null : null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(savedDraft?.selectedStationId ? null : null)
  const [selectedPayment, setSelectedPayment] = useState<string>(savedDraft?.selectedPayment || 'wallet')
  const [fuelQuantity, setFuelQuantity] = useState(savedDraft?.fuelQuantity || 20)
  const [deliveryAddress, setDeliveryAddress] = useState(savedDraft?.deliveryAddress || '')
  const [scheduledTime, setScheduledTime] = useState(savedDraft?.scheduledTime || '')
  const [notes, setNotes] = useState(savedDraft?.notes || '')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [step, setStep] = useState(1) // Always start at step 1 (station selection)
  const [loadingError, setLoadingError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showVehicleSelect, setShowVehicleSelect] = useState(false)
  const [showPaymentSelect, setShowPaymentSelect] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [error, setError] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home')

  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  // Save draft state whenever form changes (debounced)
  useEffect(() => {
    if (!user?.id) return
    
    const draftData = {
      selectedVehicleId: selectedVehicle?.id,
      selectedStationId: selectedStation?.id,
      selectedPayment,
      fuelQuantity,
      deliveryAddress,
      scheduledTime,
      notes,
      step,
      selectedLocation,
    }
    
    // Only save if user has made some progress (not on step 1 with defaults)
    if (step > 1 || deliveryAddress || notes || fuelQuantity !== 20) {
      const timer = setTimeout(() => {
        setCache(draftKey, draftData, user.id, { ttl: 24 * 60 * 60 * 1000 })
      }, 1000) // Debounce 1 second
      
      return () => clearTimeout(timer)
    }
  }, [user?.id, selectedVehicle, selectedStation, selectedPayment, fuelQuantity, deliveryAddress, scheduledTime, notes, step, selectedLocation])

  const loadData = async () => {
    if (!user) return

    setLoading(true)

    try {
      const [vehiclesResult, stationsResult, walletResult] = await Promise.all([
        getUserVehicles(user.id),
        supabase
          .from('stations')
          .select('*')
          .eq('is_verified', true)
          .eq('is_active', true)
          .order('name'),
        getUserWallet(user.id)
      ])

      if (stationsResult.error) {
        setLoadingError('Failed to load fuel stations')
      } else {
        setStations(stationsResult.data || [])
      }

      setVehicles(vehiclesResult)
      setWalletBalance(walletResult?.balance || 0)
      if (user?.id) {
        setCache('requestfuel_vehicles', vehiclesResult, user.id)
        setCache('requestfuel_stations', stationsResult.data || [], user.id)
      }

      // Restore vehicle from draft if available, otherwise use default
      if (savedDraft?.selectedVehicleId) {
        const draftVehicle = vehiclesResult.find(v => v.id === savedDraft.selectedVehicleId)
        if (draftVehicle) setSelectedVehicle(draftVehicle)
      } else {
        const defaultVehicle = vehiclesResult.find(v => v.is_default)
        if (defaultVehicle) {
          setSelectedVehicle(defaultVehicle)
        } else if (vehiclesResult.length > 0) {
          setSelectedVehicle(vehiclesResult[0])
        }
      }

      // Restore station from draft if available
      if (savedDraft?.selectedStationId && stationsResult.data) {
        const draftStation = stationsResult.data.find(s => s.id === savedDraft.selectedStationId)
        if (draftStation) setSelectedStation(draftStation)
      } else if (stationsResult.data && stationsResult.data.length > 0 && !selectedStation) {
        // Only auto-select station if user hasn't selected one yet
        setSelectedStation(stationsResult.data[0])
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
    channelName: `requestfuel-stations-${user?.id}`,
    table: 'stations',
    onUpdate: loadData,
    enabled: !!user?.id
  })

  useRealtimeSubscription({
    channelName: `requestfuel-vehicles-${user?.id}`,
    table: 'vehicles',
    filter: `user_id=eq.${user?.id}`,
    onUpdate: loadData,
    enabled: !!user?.id
  })

  useRealtimeSubscription({
    channelName: `requestfuel-wallets-${user?.id}`,
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
    if (!selectedStation || !selectedVehicle) return 0
    
    const fuelPrice = selectedVehicle.fuel_type === 'petrol' 
      ? selectedStation.petrol_price 
      : selectedStation.diesel_price
    
    const fuelCost = fuelQuantity * fuelPrice
    const deliveryFee = 15
    
    return fuelCost + deliveryFee
  }

  const calculatePaymentFees = () => {
    const subtotal = calculateSubtotal()
    const paymentMethod = paymentMethods.find(p => p.id === selectedPayment)
    return subtotal * (paymentMethod?.fees || 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const paymentFees = calculatePaymentFees()
    const platformFee = subtotal * 0.05
    
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

    setSubmitting(true);
    setError('');
    
    // Check network connectivity
    if (isOffline) {
      setError('No internet connection. Please check your network and try again.')
      setSubmitting(false)
      toast.error('Cannot place order while offline')
      return
    }
    
    try {
      // Validate required fields
      if (!deliveryAddress) {
        throw new Error('Please enter a delivery address');
      }

      // Format location for PostgreSQL point type
      const deliveryLocation = selectedLocation 
        ? `(${selectedLocation.lng},${selectedLocation.lat})`
        : userLocation
        ? `(${userLocation.lng},${userLocation.lat})`
        : null

      const total = calculateTotal()
      
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: user!.id,
            vehicle_id: selectedVehicle?.id,
            station_id: selectedStation.id,
            service_type: 'fuel_delivery',
            fuel_type: selectedVehicle.fuel_type,
            fuel_quantity: fuelQuantity,
            delivery_location: deliveryLocation,
            delivery_address: deliveryAddress,
            total_amount: total,
            platform_fee: total * 0.05,
            agent_fee: total * 0.15,
            notes: notes,
            scheduled_time: scheduledTime || null,
            status: 'pending'
          }
        ])
        .select()
        .single()

      if (error) {
        throw error;
      }


      await supabase
        .from('transactions')
        .insert([
          {
            user_id: user!.id,
            order_id: data.id,
            type: 'payment',
            amount: total,
            description: `Fuel delivery payment - ${fuelQuantity}L ${selectedVehicle.fuel_type}`,
            payment_method: selectedPayment,
            status: selectedPayment === 'wallet' ? 'completed' : 'pending'
          }
        ])

      if (selectedPayment === 'wallet') {
          await supabase
          .from('wallets')
          .update({ 
            balance: walletBalance - total,
            total_spent: (walletBalance - total) + total
          })
          .eq('user_id', user!.id)
      }

      // Clear draft after successful submission
      if (user?.id) {
        localStorage.removeItem(`requestfuel_draft_${user.id}`)
      }

      // Store order ID in session storage for refresh recovery
      sessionStorage.setItem('orderSuccessId', data.id)
      setSuccessOrderId(data.id)

      // Show success confirmation page instead of direct navigation
      setShowOrderSuccess(true);
      
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to place order. Please try again."
      setError(errorMessage);
      toast.error(errorMessage)
    } finally {
      setSubmitting(false);
    }
  }

  const handleOpenGoogleMaps = () => {
    if (selectedLocation) {
      const url = `https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`;
      window.open(url, '_blank');
    }
  }

  // Fix Leaflet default marker icon issue
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  // Component to handle map clicks
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        setDeliveryAddress(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
      },
    });
    return null;
  };

  const handleConfirmAndSubmit = () => {
    if (selectedLocation) {
      setIsOrderConfirmed(true);
      handleSubmitOrder();
    } else {
      toast.error('Please select a delivery location first');
    }
  };

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

  const subtotal = calculateSubtotal()
  const paymentFees = calculatePaymentFees()
  const total = subtotal + paymentFees + (subtotal * 0.05)
  const canAfford = canAffordPayment()

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
            <p className="text-gray-600 mb-4">Your Order is Confirmed!</p>
            
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
              You will receive an SMS soon.
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
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
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
            alt="Fuel Station" 
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
          {/* Search */}
          <div className="relative mb-6">
            <Search01Icon size={20} color="#9CA3AF" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fuel stations..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Title */}
          <div className="absolute bottom-6 left-4 right-4">
            <h1 className="text-2xl font-bold text-white mb-1">Order Fuel Service</h1>
            <p className="text-white text-opacity-90">Choose your preferred station</p>
          </div>
        </div>

         {/* Content with rounded top corners */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-screen"> 
          <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
          
          {/* Show loading indicator if data is being fetched */}
          {!dataLoaded && showCachedData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-600">Updating stations...</span>
            </div>
          )}
          
          {/* Categories */}
          <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
            {fuelCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Service Your Location */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Service Your Location</h2>
          </div>
            
            {stations.length === 0 && !showCachedData ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 mb-2">Loading stations...</p>
                <p className="text-sm text-gray-500">Please wait</p>
              </div>
            ) : stations.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <FuelStationIcon size={48} color="#9CA3AF" className="mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No fuel stations available</p>
                <p className="text-sm text-gray-500">Please try again later</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {stations.map((station, index) => {
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
                      key={station.id}
                      onClick={() => {
                        setSelectedStation(station)
                        setStep(2)
                      }}
                      className="relative rounded-2xl overflow-hidden h-48 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    >
                      {/* Station Image or Gradient Background */}
                      {station.image_url ? (
                        <img 
                          src={station.image_url} 
                          alt={station.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors[index % colors.length]}`}></div>
                      )}
                      
                      {/* Gradient Overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Station Info at Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h4 className="font-medium text-white text-base mb-2 truncate">
                          {station.name}
                        </h4>
                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex items-center space-x-1">
                            <Location01Icon size={14} color="white" />
                            <span className="font-normal">2.5 km</span>
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">₵{station.petrol_price.toFixed(2)}</p>
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

  // Order details page (step 2) - Station confirmation
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
          {selectedStation?.image_url ? (
            <img 
              src={selectedStation.image_url} 
              alt={selectedStation.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/src/assets/cars2.png'
              }}
            />
          ) : (
            <img 
              src="/src/assets/cars2.png" 
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
            <p className="text-white text-opacity-90">Complete your fuel delivery order</p>
          </div>
        </div>

        {/* Content with rounded top corners */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-screen">
          <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-2 ">

            {/* Selected Station Card */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <FuelStationIcon size={24} color="white" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold text-lg">{selectedStation?.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <StarIcon size={16} color="#EAB308" />
                        <span className="text-gray-600 text-xs">4.8</span>
                        <span className="text-gray-400 text-xs">•</span>
                        <span className="text-gray-600 text-xs">2.5km away</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 font-bold text-lg">₵{selectedStation?.petrol_price.toFixed(2)}</p>
                    <p className="text-gray-500 text-xs">per liter</p>
                  </div>
                </div>
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
                  className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md p-4"
                  style={{ position: 'fixed' }}
                >
                  <div className="bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
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
                      <CarParking01Icon size={48} color="#9CA3AF" className="mx-auto mb-4" />
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
              </>,
              document.body
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuel Quantity
              </label>
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-6">
                  <button
                    onClick={() => setFuelQuantity(Math.max(5, fuelQuantity - 5))}
                    className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                  >
                    <Remove01Icon size={20} color="#374151" />
                  </button>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{fuelQuantity.toString().padStart(2, '0')}</p>
                    <p className="text-gray-600 text-sm">Liters</p>
                  </div>
                  <button
                    onClick={() => setFuelQuantity(Math.min(100, fuelQuantity + 5))}
                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center"
                  >
                    <Add01Icon size={20} color="white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address
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
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords;
                        setSelectedLocation({ lat: latitude, lng: longitude });
                        setDeliveryAddress("Current Location");
                      },
                      (error) => {
                      }
                    );
                  } else {
                  }
                }}
                className="mt-4 w-full flex items-center justify-center bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Location01Icon size={20} color="white" className="mr-2" /> Use My Current Location
              </button>
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
                  className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md p-4"
                  style={{ position: 'fixed' }}
                >
                  <div className="bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
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
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedPayment === method.id
                              ? 'border-blue-600 bg-blue-50 shadow-md'
                              : canUseMethod
                                ? 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                : 'border-gray-200 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                selectedPayment === method.id ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                <Icon className={`h-5 w-5 ${
                                  selectedPayment === method.id ? 'text-blue-600' : 'text-gray-600'
                                }`} />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{method.name}</h4>
                                <p className="text-sm text-gray-600">{method.description}</p>
                                {isWallet && (
                                  <p className={`text-xs mt-1 ${
                                    canUseMethod ? 'text-green-600 font-medium' : 'text-gray-500'
                                  }`}>
                                    Balance: ₵{walletBalance.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {method.fees > 0 && (
                                <p className="text-sm text-gray-600 mb-1">
                                  +{(method.fees * 100).toFixed(1)}% fee
                                </p>
                              )}
                              {!canUseMethod && isWallet && (
                                <p className="text-xs text-red-600 font-medium">Insufficient balance</p>
                              )}
                              {selectedPayment === method.id && (
                                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">₵{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee (5%)</span>
                  <span className="text-gray-900">₵{(subtotal * 0.05).toFixed(2)}</span>
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
                onClick={handleConfirmAndSubmit}
                disabled={submitting || !deliveryAddress.trim() || !canAfford || !selectedLocation}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
              
              {!canAfford && selectedPayment === 'wallet' && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  Insufficient wallet balance. Please top up or choose another payment method.
                </p>
              )}
              {error && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  {error}
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