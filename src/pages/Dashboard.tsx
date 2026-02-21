import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import carImg from '../assets/car.png'
import { motion, AnimatePresence } from 'framer-motion'

import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { 
  Search01Icon,
  FilterHorizontalIcon,
  Location01Icon,
  FuelStationIcon,
  Settings01Icon,
  Notification02Icon,
  UserIcon,
  CarParking01Icon,
  Wrench01Icon,
  StarIcon,
  Settings02Icon
} from 'hugeicons-react'
import { Link } from 'react-router-dom'
import { ProfileCard } from '../components/customer/ProfileCard'
import { BottomTabNav } from '../components/customer/BottomTabNav'
import { Wallet } from './Wallet'
import { OrderHistory } from './OrderHistory'
import { Profile } from './Profile'
import { toast } from 'react-toastify'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { usePrefetchData } from '../hooks/usePrefetchData'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { getCache, setCache } from '../lib/cache'

type Station = Database['public']['Tables']['stations']['Row'] & {
  users: { name: string } | null
  image_url?: string
}

type Agent = Database['public']['Tables']['agents']['Row'] & {
  users: { name: string; avatar_url?: string | null } | null
}

export const Dashboard: React.FC = () => {
  const { user, userProfile, userRole, signOut } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('home')
  
  const [stations, setStations] = useState<Station[]>(() => {
    return user ? (getCache<Station[]>('dashboard_stations', user.id) || []) : []
  })
  const [mechanics, setMechanics] = useState<Agent[]>(() => {
    return user ? (getCache<Agent[]>('dashboard_mechanics', user.id) || []) : []
  })
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showCachedData, setShowCachedData] = useState(false)

  const fetchNearbyServices = async () => {
    if (!user?.id) return
    
    setLoading(true)
    
    try {
      // Fetch stations
      const { data: stationsData, error: stationsError } = await supabase
        .from('stations')
        .select(`
          *,
          users!stations_user_id_fkey(name)
        `)
        .eq('is_active', true)
        .eq('is_verified', true)
        .limit(4)

      if (stationsError) {
        // Error fetching stations
      } else {
        setStations(stationsData || [])
        if (user?.id) {
          setCache('dashboard_stations', stationsData || [], user.id)
        }
      }

      // Fetch mechanics (agents with mechanic service)
      const { data: mechanicsData, error: mechanicsError } = await supabase
        .from('agents')
        .select(`
          *,
          users!agents_user_id_fkey(name, avatar_url)
        `)
        .in('service_type', ['mechanic', 'both'])
        .eq('is_available', true)
        .eq('is_verified', true)
        .limit(4)

      if (mechanicsError) {
        // Error fetching mechanics
      } else {
        setMechanics(mechanicsData || [])
        if (user?.id) {
          setCache('dashboard_mechanics', mechanicsData || [], user.id)
        }
      }
      
      setDataLoaded(true)
      setShowCachedData(true)
    } catch (error) {
      toast.error('Failed to load nearby services')
    } finally {
      setLoading(false)
    }
  }
  
  // Prefetch data for all pages automatically
  usePrefetchData(user?.id)
  
  // Set up Realtime subscriptions with auto-reconnection
  useRealtimeSubscription({
    channelName: `dashboard-stations-${user?.id}`,
    table: 'stations',
    onUpdate: fetchNearbyServices,
    enabled: !!user?.id
  })
  
  useRealtimeSubscription({
    channelName: `dashboard-agents-${user?.id}`,
    table: 'agents',
    onUpdate: fetchNearbyServices,
    enabled: !!user?.id
  })

  useEffect(() => {
    if (user?.id) {
      fetchNearbyServices()
      
      // Show cached data after 500ms if fresh data is taking time
      const timer = setTimeout(() => {
        if (!dataLoaded) {
          setShowCachedData(true)
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [user?.id])

  // Handle navigation state to set active tab
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  const calculateDistance = (location: any) => {
    // For now, return a random distance between 0.5-5km
    // In a real app, you'd calculate this based on user's current location
    return (Math.random() * 4.5 + 0.5).toFixed(1)
  }

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : '4.5'
  }

  const handleSignOut = async () => {
    try {
      window.location.replace('/')
      await signOut()
    } catch (error) {
      window.location.replace('/')
    }
  }

  return (
   <>
      <div style={{ 
        minHeight: '100vh',
        paddingBottom: '80px',
        backgroundColor: 'white',
        overflow: 'auto',
        position: 'relative'
      }}>
        <AnimatePresence mode="sync" initial={false}>
          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
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
              <Wallet />
            </motion.div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
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
              <OrderHistory />
            </motion.div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
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
              <Profile />
            </motion.div>
          )}
        
          {/* Home Tab */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
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
      {/* Hero Section with Image */}
      <div className="relative h-[50vh] overflow-hidden">
        <img 
          src={heroImg} 
          alt="FillUp Service" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Header Content */}
        <div className="absolute top-0 left-0 right-0 px-3 sm:px-4 pt-4 sm:pt-5">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link to="/profile">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white">
                    <UserIcon size={28} color="white" />
                  </div>
                )}
              </Link>
              <div>
                <p className="text-white text-opacity-90 text-xs sm:text-sm font-light">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                </p>
                <p className="text-white font-bold text-lg sm:text-xl">{userProfile?.name || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm">
                <Notification02Icon size={20} color="white" />
              </button>
              <button 
                onClick={handleSignOut}
                className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
              >
                <Settings01Icon size={20} color="white" />
              </button>
            </div>
          </div>
          
            {/* Search Bar */}
            <div className="flex items-center gap-2 px-3 sm:px-4">
              <div className="relative flex-1">
                <Search01Icon size={16} color="white" className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                <input
                  type="text"
                  placeholder="Search Fuel Station"
                  className="w-full bg-white bg-opacity-20 backdrop-blur-sm rounded-full py-3 pl-11 pr-12 text-sm text-white placeholder-white placeholder-opacity-80 outline-none focus:outline-none focus:ring-0 border-0"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-white rounded-full z-10">
                  <FilterHorizontalIcon size={16} color="#1f2937" />
                </button>
              </div>
            </div>
        </div>

        {/* Promotion Section */}
        <div className="absolute bottom-12 sm:bottom-16 left-3 sm:left-4 right-3 sm:right-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-heading font-normal text-white mb-1">Free Delivery</h2>
              <p className="text-white text-opacity-90 text-title font-light mb-2 sm:mb-3">On your first fuel order</p>
              <Link to="/request-fuel">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-medium transition-colors">
                  Order Now
                </button>
              </Link>
            </div>
            <div className="w-24 h-16 sm:w-32 sm:h-20 ml-3 sm:ml-4">
              <img 
                src={carImg} 
                alt="Delivery car" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content with rounded top corners */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-screen">
        <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
          {/* Service Categories */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-title font-semibold text-gray-900 mb-3 sm:mb-4">Services</h3>
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex">
                <Link to="/request-fuel" className="flex-1">
                  <div className="p-3 sm:p-4 hover:bg-gray-50 transition-colors border-r border-gray-100">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <FuelStationIcon size={16} color="white" />
                      </div>
                      <p className="text-gray-900 font-medium text-body">Fuel Delivery</p>
                    </div>
                  </div>
                </Link>
                <Link to="/request-mechanic" className="flex-1">
                  <div className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Wrench01Icon size={16} color="white" />
                      </div>
                      <p className="text-gray-900 font-medium text-body">Mechanic</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Service Your Location */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-title font-semibold text-gray-900">Near You</h3>
              <button className="text-blue-600 text-xs sm:text-sm font-medium">View All</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Show empty state if data loaded but no stations/mechanics */}
                {dataLoaded && stations.length === 0 && mechanics.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-500">No services available nearby</p>
                  </div>
                ) : (
                  <>
                {/* Fuel Stations */}
                {stations.slice(0, 2).map((station) => {
                  return (
                  <Link key={station.id} to="/request-fuel">
                    <div className="relative rounded-2xl overflow-hidden h-64 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
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
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h4 className="font-medium text-white text-body mb-2 truncate">
                          {station.name}
                        </h4>
                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex items-center space-x-1">
                            <Location01Icon size={14} color="white" />
                            <span className="font-normal">{calculateDistance(station.location)} km</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <StarIcon size={14} color="#fbbf24" />
                            <span className="font-normal">{formatRating(station.rating || 4.5)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  )
                })}

                {/* Mechanics */}
                {mechanics.slice(0, 2).map((mechanic, index) => {
                  const colors = [
                    'from-purple-500 to-purple-700',
                    'from-red-500 to-red-700'
                  ];
                  return (
                    <Link key={mechanic.id} to="/request-mechanic">
                      <div className="relative rounded-2xl overflow-hidden h-64 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                        {/* Mechanic Image */}
                        {mechanic.users?.avatar_url ? (
                          <img 
                            src={mechanic.users.avatar_url} 
                            alt={mechanic.users?.name || 'Mechanic'}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${colors[index % colors.length]}`}></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="font-medium text-white text-body mb-2 truncate">
                            {mechanic.users?.name || 'Mechanic'}
                          </h4>
                          <div className="flex items-center justify-between text-white text-xs">
                            <div className="flex items-center space-x-1">
                              <Location01Icon size={14} color="white" />
                              <span className="font-normal">{calculateDistance(mechanic.current_location)} km</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <StarIcon size={14} color="#fbbf24" />
                              <span className="font-normal">{formatRating(mechanic.rating)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Fill remaining slots if we don't have enough data */}
                {[...stations, ...mechanics].length < 4 && 
                  Array.from({ length: 4 - [...stations, ...mechanics].length }).map((_, index) => (
                    <div key={`placeholder-${index}`} className="bg-gray-50 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center h-32 sm:h-36">
                      <div className="text-center text-gray-400">
                        <div className="w-8 h-8 mx-auto mb-2 opacity-50 flex items-center justify-center">
                          {index % 2 === 0 ? <FuelStationIcon size={32} color="#9CA3AF" /> : <Wrench01Icon size={32} color="#9CA3AF" />}
                        </div>
                        <p className="text-xs">No services nearby</p>
                      </div>
                    </div>
                  ))
                }
                </>
                )}
              </div>
          </div>
        </div>
      </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Tab Navigation */}
      <BottomTabNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  )
}