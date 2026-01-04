import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import heroImg from '../assets/hero.png'

import { 
  Wrench, 
  MapPin, 
  CreditCard, 
  Car,
  ArrowRight,
  Battery,
  Settings,
  Zap,
  Smartphone,
  Wallet,
  X,
  Search,
  ChevronDown
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getUserVehicles, getUserWallet } from '../lib/supabase'
import toast from '../lib/toast'

interface Vehicle {
  id: string
  make: string
  model: string
  plate_number: string
  fuel_type: 'petrol' | 'diesel'
  is_default: boolean
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
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const cached = localStorage.getItem('requestmechanic_vehicles')
    return cached ? JSON.parse(cached) : []
  })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
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
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  
  useEffect(() => {
    if (user?.id) {
      loadData()
      
      // Refresh data every 3 seconds
      const interval = setInterval(() => {
        loadData()
      }, 3000)
      
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
      
      return () => clearInterval(interval)
    }
  }, [user?.id])

  const loadData = async () => {
    if (!user) return

    setLoading(true)

    try {
      const [vehiclesData, walletData] = await Promise.all([
        getUserVehicles(user.id),
        getUserWallet(user.id)
      ])

      setVehicles(vehiclesData)
      setWalletBalance(walletData?.balance || 0)
      localStorage.setItem('requestmechanic_vehicles', JSON.stringify(vehiclesData))

      const defaultVehicle = vehiclesData.find(v => v.is_default)
      if (defaultVehicle) {
        setSelectedVehicle(defaultVehicle)
      }
      
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

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
    if (!selectedVehicle || !selectedService || !location.trim() || !description.trim() || !selectedPayment) {
      console.error('Validation failed: Missing required fields')
      return
    }

    setSubmitting(true)
    try {
      const total = calculateTotal()
      console.log('Calculated total:', total)
      
      // Create a PostgreSQL Point for the delivery location
      const deliveryLocation = userLocation ? `(${userLocation.lng}, ${userLocation.lat})` : '(0, 0)';
      console.log('Delivery location:', deliveryLocation)
      
      const orderPayload = {
        customer_id: user!.id,
        vehicle_id: selectedVehicle.id,
        service_type: 'mechanic',
        mechanic_service: selectedService.id,
        delivery_location: deliveryLocation,
        delivery_address: location,
        total_amount: total,
        platform_fee: total * 0.1,
        agent_fee: total * 0.7,
        notes: `${description}\n\nUrgency: ${urgency}\nService: ${selectedService.name}`,
        scheduled_time: scheduledTime || null,
        status: 'pending'
      }
      console.log('Order payload:', orderPayload)
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single()

      if (error) {
        console.error('Error inserting order:', error)
        throw error
      }

      console.log('Order data:', data)

      const transactionPayload = {
        user_id: user!.id,
        order_id: data.id,
        type: 'payment',
        amount: total,
        description: `Mechanic service payment - ${selectedService.name}`,
        payment_method: selectedPayment,
        status: selectedPayment === 'wallet' ? 'completed' : 'pending'
      }
      console.log('Transaction payload:', transactionPayload)
      
      await supabase
        .from('transactions')
        .insert([transactionPayload])

      if (selectedPayment === 'wallet') {
        const walletUpdatePayload = {
          balance: walletBalance - total,
          total_spent: (walletBalance - total) + total
        }
        console.log('Wallet update payload:', walletUpdatePayload)
        
        await supabase
          .from('wallets')
          .update(walletUpdatePayload)
          .eq('user_id', user!.id)
      }

      // Show success confirmation page instead of direct navigation
      setShowOrderSuccess(true)
    } catch (error: any) {
      console.error('Error creating order:', error)
      const errorMessage = error?.message || 'Failed to place order. Please try again.'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const total = calculateTotal()
  const subtotal = calculateSubtotal()
  const paymentFees = calculatePaymentFees()
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
            <p className="text-gray-600 mb-8">Your Service Request is Confirmed!</p>
            
            {/* Additional Message */}
            <p className="text-sm text-gray-500 mb-8">
              Thank you for choosing our service.<br />
              A mechanic will be assigned to you soon.
            </p>
            
            {/* Track Order Button */}
            <button 
              onClick={() => navigate('/dashboard', { state: { activeTab: 'orders' } })}
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
                  
                  <Link to="/dashboard">
                  <button 
                    onClick={() => setStep(1)}
                    className="absolute top-6 left-4 p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
                  >
                    <ArrowRight className="h-5 w-5 text-white transform rotate-180" />
                  </button>
                  </Link>
                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search fuel stations..."
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {/* Title */}
                  <div className="absolute bottom-6 left-4 right-4">
                    <h1 className="text-2xl font-bold text-white mb-1">Order Mechanical Service</h1>
                    <p className="text-white text-opacity-90">Choose your preferred service</p>
                  </div>
                </div>
        
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-screen"> 
        <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
          
          <div className="space-y-4">
            {mechanicServices.map((service) => {
              const Icon = service.icon
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    setStep(2)
                  }}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${service.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-semibold">{service.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600 font-medium">
                          From ₵{service.basePrice}
                        </span>
                        <span className="text-gray-500">
                          {service.estimatedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </div>
          </div>
        </motion.div>
    )
  }

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
          <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-lg mx-auto px-4">
          <div className="mb-6">
            <button 
              onClick={() => setStep(1)}
              className="flex items-center text-blue-600 mb-4"
            >
              <ArrowRight className="h-4 w-4 mr-1 transform rotate-180" />
              <span>Back to services</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Details</h1>
            <p className="text-gray-600">Complete your mechanic service request</p>
          </div>
          
          {/* Selected Service */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${selectedService.color} rounded-lg flex items-center justify-center`}>
                {React.createElement(selectedService.icon, { className: "h-6 w-6 text-white" })}
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold">{selectedService.name}</h3>
                <p className="text-gray-600 text-sm">{selectedService.description}</p>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  Base price: ₵{selectedService.basePrice} • {selectedService.estimatedTime}
                </p>
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
                      <Car className="h-5 w-5 text-blue-600" />
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
              <ChevronDown className="h-5 w-5 text-gray-400" />
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
                    <X className="h-5 w-5 text-gray-500" />
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
                                <Car className="h-5 w-5 text-blue-600" />
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
          
          {/* Location */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Location
            </label>
            <textarea
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your current location with landmarks..."
              className="w-full bg-white border border-gray-300 rounded-lg p-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            {userLocation && (
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords;
                        setUserLocation({ lat: latitude, lng: longitude });
                        setLocation("Current Location");
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
                <MapPin className="h-5 w-5 mr-2" /> Use My Current Location
              </button>
            )}
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
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {/* Payment Method Modal */}
          {showPaymentSelect && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Select Payment Method</h3>
                  <button
                    onClick={() => setShowPaymentSelect(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
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
              disabled={submitting || !selectedVehicle || !location.trim() || !description.trim() || !selectedPayment || !canAfford}
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
        </motion.div>
    )
  }

  // End of component - fallback return
  return null
      })()}
    </AnimatePresence>
  )
}