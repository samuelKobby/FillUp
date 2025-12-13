import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import heroImg from '../assets/hero.png';
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
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useGeolocated } from 'react-geolocated';

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
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string>('wallet')
  const [fuelQuantity, setFuelQuantity] = useState(20)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [step, setStep] = useState(1)
  const [loadingError, setLoadingError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showVehicleSelect, setShowVehicleSelect] = useState(false)
  const [showPaymentSelect, setShowPaymentSelect] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [error, setError] = useState('')
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('home')

  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  useEffect(() => {
    loadData()
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
          console.error('Error getting location:', error)
        }
      )
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

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
        console.error('Error loading stations:', stationsResult.error)
        setLoadingError('Failed to load fuel stations')
      } else {
        setStations(stationsResult.data || [])
      }

      setVehicles(vehiclesResult)
      setWalletBalance(walletResult?.balance || 0)

      const defaultVehicle = vehiclesResult.find(v => v.is_default)
      if (defaultVehicle) {
        setSelectedVehicle(defaultVehicle)
      } else if (vehiclesResult.length > 0) {
        setSelectedVehicle(vehiclesResult[0])
      }

      if (stationsResult.data && stationsResult.data.length > 0) {
        setSelectedStation(stationsResult.data[0])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setLoadingError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

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

      // Show success confirmation page instead of direct navigation
      setShowOrderSuccess(true);
      
    } catch (err: any) {
      setError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`;
    window.open(url, '_blank');
  }

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    
    if (marker) {
      marker.setMap(null);
    }
    
    const newMarker = new google.maps.Marker({
      position: event.latLng,
      map: map
    });
    
    setMarker(newMarker);
    setSelectedLocation(event.latLng.toJSON());
  };

  const handleConfirmAndSubmit = () => {
    if (selectedLocation) {
      setIsOrderConfirmed(true);
      handleSubmitOrder();
    } else {
      alert('Please select a delivery location first');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fuel stations...</p>
        </div>
      </div>
    )
  }

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
            <p className="text-gray-600 mb-8">Your Order is Confirmed !</p>
            
            {/* Additional Message */}
            <p className="text-sm text-gray-500 mb-8">
              Thank you for choosing our service.<br />
              You will receive an SMS soon.
            </p>
            
            {/* Track Order Button */}
            <button 
              onClick={() => navigate('/history', { replace: true })}
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
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
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
          
          <button 
            onClick={() => navigate('/dashboard', { state: { activeTab: 'home' }, replace: true })}
            className="absolute top-6 left-4 p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft01Icon size={20} color="white" />
          </button>
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
            
            {stations.length === 0 ? (
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
                            console.error('Image failed to load:', station.image_url)
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
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
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
                console.error('Image failed to load:', selectedStation.image_url)
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
            {showVehicleSelect && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
              <div className="relative">
                <LoadScript
                  googleMapsApiKey="AIzaSyBWCbHMuNHAbZougcmsn9RXfNowa7z03zA"
                >
                  <GoogleMap
                    mapContainerStyle={{ height: "400px", width: "100%" }}
                    center={userLocation || { lat: 5.6037, lng: -0.187 }}
                    zoom={15}
                    onClick={handleMapClick}
                    onLoad={(mapInstance: google.maps.Map) => setMap(mapInstance)}
                  >
                    {marker && (
                      <Marker position={marker.getPosition()!} />
                    )}
                  </GoogleMap>
                </LoadScript>
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
                        console.error("Error getting location:", error);
                      }
                    );
                  } else {
                    console.error("Geolocation is not supported by this browser.");
                  }
                }}
                className="mt-4 flex items-center justify-center bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
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