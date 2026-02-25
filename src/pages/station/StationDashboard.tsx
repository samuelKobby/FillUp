import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import logo1 from '../../assets/logo1.png'
import { 
  BarChart3, 
  Users, 
  MapPin, 
  ClipboardList, 
  CreditCard, 
  Settings, 
  Search, 
  ChevronDown, 
  Menu, 
  Plus, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Check,
  Fuel,
  Home,
  ChevronRight,
  Eye,
  Clock,
  DollarSign,
  Activity,
  Truck,
  Package,
  Edit,
  Calendar,
  RefreshCw,
  LogOut,
  X,
  User,
  Upload,
  Camera,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { uploadStationImage, updateStationImage, deleteStationImage } from '../../lib/imageUpload'
import loaderGif from '../../assets/lodaer.gif'
import { getCache, setCache } from '../../lib/cache'
import toast from '../../lib/toast'
import { showConfirm } from '../../lib/confirm'

// Type definitions
interface Order {
  id: string
  status: string
  created_at: string
  delivery_address: string
  service_type: string
  fuel_quantity?: number
  fuel_type?: string
  total_amount: number
  agent_id?: string
  accepted_at?: string | null
  completed_at?: string | null
  users?: {
    name: string
    phone: string
    avatar_url?: string | null
  }
  agents?: {
    id: string
    users?: {
      name: string
      phone: string
    }
    is_available: boolean
    rating: number
  }
  vehicles?: {
    make: string
    model: string
    plate_number: string
  }
}

interface Agent {
  id: string
  user_id: string
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  vehicle_info: any
  license_number: string
  is_verified: boolean
  is_available: boolean
  rating: number
  total_jobs: number
  created_at: string
  users: {
    name: string
    phone: string
    email: string
    avatar_url?: string
  }
}

interface Station {
  id: string
  name: string
  address: string
  location?: {
    type: string
    coordinates: [number, number]
  } | null
  is_active: boolean
  petrol_price: number
  diesel_price: number
  user_id: string
  image_url?: string
}

interface StatCardProps {
  stat: {
    title: string
    value: string
    change: string
    trend: 'up' | 'down'
    icon: React.ComponentType<any>
    color: string
  }
  index: number
}

interface StatusBadgeProps {
  status: string
}

// CountUp animation component
function CountUp({ to, prefix = '', suffix = '', decimals = 0, duration = 1200 }: {
  to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number
}) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    if (to === 0) { setDisplay(0); return }
    let startTime: number | null = null
    let raf: number
    const animate = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(to * eased)
      if (progress < 1) { raf = requestAnimationFrame(animate) }
      else { setDisplay(to) }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.floor(display).toLocaleString()
  return <>{prefix}{formatted}{suffix}</>
}

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export const StationDashboard: React.FC = () => {

  const { signOut, user } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [darkMode, setDarkMode] = useState(false)
  const [chartAnimated, setChartAnimated] = useState(false)
  const [trendPeriod, setTrendPeriod] = useState<'h2' | 'h1'>('h2')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedOrderRows, setSelectedOrderRows] = useState<Set<string>>(new Set())
  const [activityFilter, setActivityFilter] = useState('All Status') // 80 * 4 = 320px (w-80)
  const [isResizing, setIsResizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [stationData, setStationData] = useState<Station | null>(() => {
    return user ? (getCache<Station>('station_data', user.id) || null) : null
  })
  const [stats, setStats] = useState(() => {
    return user ? (getCache('station_stats', user.id) || {
      todayRevenue: 0,
      todayOrders: 0,
      totalOrders: 0,
      avgOrderValue: 0
    }) : {
      todayRevenue: 0,
      todayOrders: 0,
      totalOrders: 0,
      avgOrderValue: 0
    }
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>(() => {
    return user ? (getCache<Order[]>('station_orders', user.id) || []) : []
  })
  const [agents, setAgents] = useState<Agent[]>(() => {
    return user ? (getCache<Agent[]>('station_agents', user.id) || []) : []
  })
  const [loadingAgents, setLoadingAgents] = useState(false)

  // Sidebar resize handlers
  const startResizing = React.useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = React.useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX
        if (newWidth >= 200 && newWidth <= 500) {
          setSidebarWidth(newWidth)
        }
      }
    },
    [isResizing]
  )

  React.useEffect(() => {
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResizing)
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [resize, stopResizing])

  // Reset and re-trigger chart animation each time the dashboard page is visited
  React.useEffect(() => {
    if (currentPage === 'dashboard') {
      setChartAnimated(false)
      const t = setTimeout(() => setChartAnimated(true), 60)
      return () => clearTimeout(t)
    } else {
      setChartAnimated(false)
    }
  }, [currentPage])

  const [fuelPrices, setFuelPrices] = useState({
    petrol: 0,
    diesel: 0
  })
  const [editingPrices, setEditingPrices] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null)
  const [savingLocation, setSavingLocation] = useState(false)

  useEffect(() => {
    // Initial load when component mounts - enhanced with sign out protection
    
    // Don't load data if signing out
    if (isSigningOut) {
      return
    }
    
    loadStationData()
    
    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      setLoading(false)
    }, 10000) // 10 seconds timeout
    
    return () => clearTimeout(fallbackTimeout)
  }, [user, isSigningOut]) // Add isSigningOut dependency

  // Handle redirect after successful sign out - with better error handling
  useEffect(() => {
    // Only redirect if we're not in the process of signing out and user is null
    if (!user && !loading && !isSigningOut) {
      // Use replace to prevent back button issues
      window.location.replace('/auth/login')
    }
  }, [user, loading, isSigningOut])

  // Enhanced timeout fallback with better logic
  useEffect(() => {
    if (isSigningOut) {
      const timeout = setTimeout(() => {
        // Reset state and force redirect regardless of current state
        setIsSigningOut(false)
        
        // Force redirect with replace to prevent back navigation
        window.location.replace('/auth/login')
      }, 3000) // Reduced to 3 seconds for better UX

      return () => clearTimeout(timeout)
    }
  }, [isSigningOut])

  // Cleanup effect when signing out - enhanced with navigation prevention
  useEffect(() => {
    if (isSigningOut) {
      // Clear all local state immediately
      setStationData(null)
      setRecentOrders([])
      setAgents([])
      setStats({
        todayRevenue: 0,
        todayOrders: 0,
        totalOrders: 0,
        avgOrderValue: 0
      })
      setFuelPrices({
        petrol: 0,
        diesel: 0
      })
      setRefreshing(false)
      setLoadingAgents(false)
      setUpdatingOrderId(null)
      
      // Prevent navigation during sign out
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = 'Sign out in progress...'
        return 'Sign out in progress...'
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [isSigningOut])

  useEffect(() => {
    // Set up comprehensive real-time subscriptions
    if (!stationData?.id || isSigningOut) return

    // Subscribe to station's fuel delivery orders
    const fuelOrdersSubscription = supabase
      .channel(`station-fuel-orders-${stationData.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `station_id=eq.${stationData.id}`
      }, async (payload) => {
        if (!isSigningOut) {
          // Fetch the complete order with all joins
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const orderId = payload.new?.id
            if (orderId) {
              const { data: fullOrder } = await supabase
                .from('orders')
                .select(`
                  *,
                  users!orders_customer_id_fkey(name, phone, avatar_url),
                  agents(id, users!agents_user_id_fkey(name, phone)),
                  stations(name, image_url),
                  vehicles(make, model, year, plate_number)
                `)
                .eq('id', orderId)
                .single()

              if (fullOrder) {
                if (payload.eventType === 'INSERT') {
                  setRecentOrders(prev => [fullOrder as Order, ...prev])
                } else {
                  setRecentOrders(prev => 
                    prev.map(order => order.id === orderId ? fullOrder as Order : order)
                  )
                }
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const orderId = payload.old?.id
            if (orderId) {
              setRecentOrders(prev => prev.filter(order => order.id !== orderId))
            }
          }
        }
      })
      .subscribe()

    // Subscribe to mechanic orders (not tied to station but visible)
    const mechanicOrdersSubscription = supabase
      .channel('station-mechanic-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `service_type=eq.mechanic`
      }, async (payload) => {
        if (!isSigningOut) {
          // Fetch the complete order with all joins
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const orderId = payload.new?.id
            if (orderId) {
              const { data: fullOrder } = await supabase
                .from('orders')
                .select(`
                  *,
                  users!orders_customer_id_fkey(name, phone, avatar_url),
                  agents(id, users!agents_user_id_fkey(name, phone)),
                  stations(name, image_url),
                  vehicles(make, model, year, plate_number)
                `)
                .eq('id', orderId)
                .single()

              if (fullOrder) {
                if (payload.eventType === 'INSERT') {
                  setRecentOrders(prev => [fullOrder as Order, ...prev])
                } else {
                  setRecentOrders(prev => 
                    prev.map(order => order.id === orderId ? fullOrder as Order : order)
                  )
                }
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const orderId = payload.old?.id
            if (orderId) {
              setRecentOrders(prev => prev.filter(order => order.id !== orderId))
            }
          }
        }
      })
      .subscribe()

    // Subscribe to station profile updates
    const stationProfileSubscription = supabase
      .channel(`station-profile-${stationData.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stations',
        filter: `id=eq.${stationData.id}`
      }, (payload) => {
        if (!isSigningOut && payload.new) {
          setStationData(prev => prev ? { ...prev, ...(payload.new as any) } : null)
        }
      })
      .subscribe()

    // Subscribe to agents updates
    const agentsSubscription = supabase
      .channel('station-agents')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents'
      }, (payload) => {
        if (!isSigningOut) {
          loadAgents()
        }
      })
      .subscribe()

    // Subscribe to notifications
    const notificationsSubscription = supabase
      .channel('station-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        if (!isSigningOut && payload.new) {
          toast.success((payload.new as any).message)
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(fuelOrdersSubscription)
      supabase.removeChannel(mechanicOrdersSubscription)
      supabase.removeChannel(stationProfileSubscription)
      supabase.removeChannel(agentsSubscription)
      supabase.removeChannel(notificationsSubscription)
    }
  }, [stationData?.id, user?.id, isSigningOut])
  
  // Set up polling to refresh data every 30 seconds - enhanced with sign out protection
  useEffect(() => {
    if (!stationData?.id || isSigningOut) return
    
    const interval = setInterval(() => {
      if (stationData?.id && !isSigningOut) {
        refreshOrders()
        // Removed checkAndHandleTimeouts() from here - it now runs on its own schedule
      }
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [stationData?.id, isSigningOut]) // Add isSigningOut dependency

  // Check timeouts less frequently (every 5 minutes) for better performance - enhanced with sign out protection
  useEffect(() => {
    if (isSigningOut) return
    
    // Don't run timeout check immediately - wait 2 minutes after station loads
    const initialDelay = setTimeout(() => {
      if (stationData?.id && !isSigningOut) {
        checkAndHandleTimeouts()
        
        // Then check every 5 minutes
        const timeoutInterval = setInterval(() => {
          if (stationData?.id && !isSigningOut) {
            checkAndHandleTimeouts()
          }
        }, 5 * 60 * 1000) // 5 minutes
        
        return () => clearInterval(timeoutInterval)
      }
    }, 2 * 60 * 1000) // Wait 2 minutes before first check
    
    return () => clearTimeout(initialDelay)
  }, [stationData?.id, isSigningOut]) // Add isSigningOut dependency

  const loadStationData = async () => {
    try {

      if (!user || isSigningOut) {

        setLoading(false)
        return
      }

      // Get station profile

      const { data: stationProfile, error: stationError } = await supabase
        .from('stations')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (stationError) {

        throw stationError
      }
      
      if (!stationProfile) {

        throw new Error('Station profile not found')
      }
      
      // Check if we're still not signing out before setting state
      if (isSigningOut) {

        return
      }

      setStationData(stationProfile)
      setFuelPrices({
        petrol: stationProfile.petrol_price,
        diesel: stationProfile.diesel_price
      })
      
      // Cache station data
      if (user?.id) {
        setCache('station_data', stationProfile, user.id)
      }

      // Load agents and orders in parallel
      await Promise.all([
        loadOrders(stationProfile.id),
        loadAgents()
      ])

      // Test database connection and permissions
      await testDatabaseConnection(stationProfile.id)

    } catch (error) {

      // Don't show error if signing out
      if (!isSigningOut) {
        // Show user-friendly error message
        toast.error('Failed to load station data. Please refresh the page and try again.')
      }
    } finally {

      setLoading(false)
    }
  }

  const testDatabaseConnection = async (stationId: string) => {
    try {

      // Test basic select
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('id, status, station_id')
        .eq('station_id', stationId)
        .limit(1)
      
      if (testError) {

      } else {

      }
      
      // Test if we can perform updates (check permissions)
      if (testData && testData.length > 0) {
        const testOrder = testData[0]
        const { error: updateTestError } = await supabase
          .from('orders')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', testOrder.id)
        
        if (updateTestError) {

        } else {

        }
      }
    } catch (error) {

    }
  }

  const loadOrders = async (stationId: string) => {
    try {




      if (!stationId) {

        return
      }
      
      // First, let's do a simple count to see if any orders exist for this station

      const { data: orderCount, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('station_id', stationId)
      
      if (countError) {

      } else {


      }
      
      // Also try without any filters to see if there are ANY orders in the table

      const { data: allOrdersCount, error: allCountError } = await supabase
        .from('orders')
        .select('id, station_id', { count: 'exact' })
        .limit(10)
      
      if (allCountError) {

      } else {


        if (allOrdersCount && allOrdersCount.length > 0) {
          console.log('?? Station IDs in database:', allOrdersCount.map(o => o.station_id))
          console.log('?? Does our station ID match any?', allOrdersCount.some(o => o.station_id === stationId))
        }
      }
      
      // Get orders for this station with all related data
      // Include both fuel delivery orders (with station_id) and mechanic services (service_type = 'mechanic')

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey(name, phone, avatar_url),
          agents(id, users!agents_user_id_fkey(name, phone), is_available, rating),
          vehicles(make, model, plate_number)
        `)
        .or(`station_id.eq.${stationId},service_type.eq.mechanic`)
        .order('created_at', { ascending: false })

      if (ordersError) {


        // Try a simple query without joins as fallback

        const { data: simpleOrders, error: simpleError } = await supabase
          .from('orders')
          .select('*')
          .or(`station_id.eq.${stationId},service_type.eq.mechanic`)
          .order('created_at', { ascending: false })
        
        if (simpleError) {

          throw ordersError // Throw the original error
        } else {


          setRecentOrders(simpleOrders || [])
          return // Exit early with simple data
        }
      }


      console.log('?? First 3 orders:', orders?.slice(0, 3))
      console.log('?? All order IDs:', orders?.map(o => o.id) || [])
      console.log('?? Order statuses:', orders?.map(o => `${o.id}: ${o.status}`) || [])
      console.log('?? Station IDs in orders:', orders?.map(o => o.station_id) || [])
      
      setRecentOrders(orders || [])

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayOrders = orders?.filter(order => order.created_at.startsWith(today)) || []
      const completedOrders = orders?.filter(order => order.status === 'completed') || []
      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const avgOrderValue = completedOrders.length > 0 
        ? completedOrders.reduce((sum, order) => sum + order.total_amount, 0) / completedOrders.length 
        : 0

      const newStats = {
        todayRevenue,
        todayOrders: todayOrders.length,
        totalOrders: orders?.length || 0,
        avgOrderValue
      }

      setStats(newStats)
      
      // Cache orders and stats
      if (user?.id) {
        setCache('station_orders', orders || [], user.id)
        setCache('station_stats', newStats, user.id)
      }
    } catch (error) {

      throw error // Re-throw so calling function can handle it
    }
  }

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {

      // First, let's check what users exist with role 'agent'
      const { data: agentUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', 'agent')
      
      if (usersError) {

      }

      // Then check what records exist in the agents table
      const { data: allAgents, error: allAgentsError } = await supabase
        .from('agents')
        .select(`
          *,
          users!agents_user_id_fkey(name, phone, email, avatar_url, role)
        `)
      
      if (allAgentsError) {

      }

      // Get all agents who can provide fuel delivery service
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          *,
          users!agents_user_id_fkey(name, phone, email, avatar_url)
        `)
        .in('service_type', ['fuel_delivery', 'both'])
        .eq('is_verified', true)
        .order('rating', { ascending: false })

      if (agentsError) {

        throw agentsError
      }
      
      setAgents(agentsData || [])
      
      // Cache agents data
      if (user?.id) {
        setCache('station_agents', agentsData || [], user.id)
      }
    } catch (error) {

    } finally {
      setLoadingAgents(false)
    }
  }
  
  const refreshOrders = async () => {
    if (!stationData?.id || isSigningOut) {
      return
    }
    
    setRefreshing(true)
    try {
      await loadOrders(stationData.id)
    } catch (error) {
      // Silently handle errors during refresh
    } finally {
      if (!isSigningOut) {
        setRefreshing(false)
      }
    }
  }

  const checkAndHandleTimeouts = async () => {
    if (!stationData?.id) return
    
    try {
      // Find orders that are accepted but have been waiting for agent for more than 30 minutes
      // Increased from 10 to 30 minutes to give agents more time to see and accept orders
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      const { data: timedOutOrders, error } = await supabase
        .from('orders')
        .select('id, accepted_at, created_at, service_type')
        .or(`station_id.eq.${stationData.id},service_type.eq.mechanic`)
        .eq('status', 'accepted')
        .is('agent_id', null)
        .lt('accepted_at', thirtyMinutesAgo)
        .not('accepted_at', 'is', null)
      
      if (error) {

        return
      }
      
      if (timedOutOrders && timedOutOrders.length > 0) {
        console.log('Found expired orders (waiting > 30 mins for agent):', timedOutOrders)
        
        // Update expired orders back to pending
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'pending',
            accepted_at: null
          })
          .in('id', timedOutOrders.map(order => order.id))
        
        if (updateError) {

        } else {

          await refreshOrders()
        }
      } else {

      }
    } catch (error) {

    }
  }

  const updateFuelPrices = async () => {
    if (!stationData) return

    try {

      const { error } = await supabase
        .from('stations')
        .update({
          petrol_price: fuelPrices.petrol,
          diesel_price: fuelPrices.diesel
        })
        .eq('id', stationData.id)

      if (error) {

        throw error
      }

      setEditingPrices(false)
      await loadStationData() // Refresh data
    } catch (error) {

      toast.error('Failed to update fuel prices. Please try again.')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setImageFile(file)
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleUpdateProfileImage = async () => {


    if (!imageFile) {
      toast.error('Please select an image first')
      return
    }

    if (!stationData || !stationData.id) {
      toast.error('Station data not loaded. Please refresh the page and try again.')
      return
    }

    setUploadingImage(true)
    
    try {
      // Delete old image if exists
      if (stationData.image_url) {

        try {
          await deleteStationImage(stationData.image_url)
        } catch (deleteError) {

          // Continue anyway
        }
      }

      // Upload new image

      const imageUrl = await uploadStationImage(imageFile, stationData.id)

      // Update station record

      await updateStationImage(stationData.id, imageUrl)

      // Refresh station data

      await loadStationData()

      // Reset state
      setImageFile(null)
      setImagePreview(null)
      setShowEditProfile(false)
      
      toast.success('Profile image updated successfully!')
    } catch (error: any) {

      toast.error(`Failed to update profile image: ${error.message || 'Please try again.'}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleUpdateLocation = async () => {
    if (!selectedCoordinates || !stationData?.id) return

    setSavingLocation(true)
    try {
      // Use RPC function to properly handle PostGIS point type
      const { error } = await supabase
        .rpc('update_station_location', {
          station_id: stationData.id,
          lat: selectedCoordinates[0],
          lng: selectedCoordinates[1]
        })

      if (error) throw error

      // Reload station data to get the updated location
      await loadStationData()

      toast.success('Location updated successfully!')
      setEditingLocation(false)
      setSelectedCoordinates(null)
    } catch (error: any) {
      console.error('Error updating location:', error)
      toast.error('Failed to update location: ' + error.message)
    } finally {
      setSavingLocation(false)
    }
  }

  // Map picker component for location editing
  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setSelectedCoordinates([e.latlng.lat, e.latlng.lng])
      },
    })
    return selectedCoordinates ? <Marker position={selectedCoordinates} /> : null
  }
  
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (updatingOrderId) {
      return // Prevent multiple simultaneous updates
    }
    
    setUpdatingOrderId(orderId)
    
    try {
      if (!orderId) {
        toast.error('Error: No order ID provided')
        setUpdatingOrderId(null)
        return
      }
      
      if (!stationData?.id) {
        toast.error('Error: Station data not loaded')
        setUpdatingOrderId(null)
        return
      }
      
      // First, let's check if the order exists and belongs to this station
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, station_id, customer_id, agent_id, accepted_at, service_type')
        .eq('id', orderId)
        .single()
      
      if (fetchError) {
        toast.error(`Error fetching order: ${fetchError.message}`)
        setUpdatingOrderId(null)
        return
      }
      
      if (!existingOrder) {
        toast.error('Error: Order not found')
        setUpdatingOrderId(null)
        return
      }
      
      if (existingOrder.station_id !== stationData.id && existingOrder.service_type !== 'mechanic') {
        toast.error('Error: Order does not belong to this station')
        setUpdatingOrderId(null)
        return
      }

      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      // Try to update the order
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .or(existingOrder.service_type === 'mechanic' ? 'service_type.eq.mechanic' : `station_id.eq.${stationData.id}`)
        .select()

      if (error) {
        if (error.message.includes('permission') || error.message.includes('policy') || error.code === '42501') {
          toast.error('Permission denied: Station cannot update orders. Please contact support.')
        } else {
          toast.error(`Failed to update order status: ${error.message}`)
        }
        setUpdatingOrderId(null)
        return
      }
      
      if (!updatedOrder || updatedOrder.length === 0) {
        toast.error('Failed to update order. This may be a permission issue.')
        setUpdatingOrderId(null)
        return
      }

      // Update local state immediately for better UX
      setRecentOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, accepted_at: updateData.accepted_at || order.accepted_at }
            : order
        )
      )
      
      if (newStatus === 'accepted') {
        toast.success('Order accepted! It is now available to all agents on their platform.')
      } else {
        toast.success('Order status updated successfully!')
      }
      
      // Refresh orders to get complete data
      await refreshOrders()
      
    } catch (error) {
      toast.error('Failed to update order status. Please try again.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleSignOut = async () => {

    // Prevent multiple simultaneous sign out attempts
    if (isSigningOut) {

      return
    }
    
    setIsSigningOut(true)
    
    // Immediately clear all intervals and subscriptions to prevent further API calls
    setRefreshing(false)
    setLoadingAgents(false)
    setUpdatingOrderId(null)
    
    try {

      // Call the AuthContext signOut method (which handles server + local cleanup)
      await signOut()

      // Clear all component-specific state immediately
      setStationData(null)
      setRecentOrders([])
      setAgents([])
      setStats({
        todayRevenue: 0,
        todayOrders: 0,
        totalOrders: 0,
        avgOrderValue: 0
      })
      setFuelPrices({
        petrol: 0,
        diesel: 0
      })
      setCurrentPage('dashboard')
      setSearchQuery('')
      setStatusFilter('all')
      setTimeFilter('all')
      setEditingPrices(false)

      // Force immediate navigation

      window.location.replace('/auth/login')
      
    } catch (error) {

      // Reset loading state on error
      setIsSigningOut(false)
      
      // Show user-friendly error message
      toast.error('Sign out failed. Redirecting to login page...')
      
      // Force redirect even on error (better UX than staying logged in with errors)
      setTimeout(() => {
        window.location.replace('/auth/login')
      }, 1000)
    }
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'pricing', label: 'Fuel Pricing', icon: DollarSign },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: Settings }
  ]


  const statsData = [
    {
      title: 'Today Revenue',
      value: `?${stats.todayRevenue.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up' as const,
      icon: CreditCard,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Today Orders',
      value: stats.todayOrders.toString(),
      change: '+8',
      trend: 'up' as const,
      icon: ClipboardList,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      change: '+15.3%',
      trend: 'up' as const,
      icon: Truck,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Avg Order Value',
      value: `?${stats.avgOrderValue.toFixed(0)}`,
      change: '+5.2%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600'
    }
  ]

  const StatCard: React.FC<StatCardProps> = ({ stat, index }) => (
    <div 
      className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards'
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            {stat.value}
          </div>
          <div className="text-gray-300 text-sm mb-3">{stat.title}</div>
          <div className={`flex items-center gap-2 text-sm ${
            stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{stat.change} from last week</span>
          </div>
        </div>
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <stat.icon size={24} />
        </div>
      </div>
    </div>
  )

  const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
        case 'accepted': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        case 'in_progress': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30'
        case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30'
        default: return 'bg-white/10 text-gray-300 border-white/20'
      }
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(status)} capitalize`}>
        {status.replace('_', ' ')}
      </span>
    )
  }
  
  const renderOrdersPage = () => {






    // Filter orders based on search and filters - but show all by default
    const filteredOrders = recentOrders.filter(order => {
      // Search filter - only apply if there's actually a search query
      const searchMatch = !searchQuery.trim() || 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.users?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.service_type?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Status filter - only apply if not 'all'
      const statusMatch = statusFilter === 'all' || order.status === statusFilter
      
      // Time filter - only apply if not 'all'
      let timeMatch = true
      if (timeFilter !== 'all') {
        try {
          const orderDate = new Date(order.created_at)
          const today = new Date()
          
          switch (timeFilter) {
            case 'today':
              timeMatch = orderDate.toDateString() === today.toDateString()
              break
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              timeMatch = orderDate >= weekAgo
              break
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              timeMatch = orderDate >= monthAgo
              break
          }
        } catch (error) {

          timeMatch = true // Show order if date parsing fails
        }
      }
      
      const shouldShow = searchMatch && statusMatch && timeMatch
      if (!shouldShow) {

      }
      return shouldShow
    })


    const totalOrders = recentOrders.length
    const pendingOrders = recentOrders.filter(o => o.status === 'pending').length
    const completedOrders = recentOrders.filter(o => o.status === 'completed').length
    const inProgressOrders = recentOrders.filter(o => o.status === 'in_progress').length
    const totalRevenue = recentOrders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total_amount || 0), 0)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${primaryText}`}>Order Management</h2>
            <p className={`${secondaryText} text-sm mt-0.5`}>{recentOrders.length} total orders</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders',  num: totalOrders,     pfx: '',  icon: Package,    iconBg: 'bg-orange-500/15', iconColor: 'text-orange-400', badge: null },
            { label: 'Pending',       num: pendingOrders,   pfx: '',  icon: Clock,      iconBg: 'bg-yellow-500/15', iconColor: 'text-yellow-400', badge: pendingOrders > 0 ? 'Needs action' : null },
            { label: 'In Progress',   num: inProgressOrders, pfx: '', icon: TrendingUp, iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400', badge: null },
            { label: 'Completed',     num: totalRevenue,    pfx: '₵', icon: CheckCircle, iconBg: 'bg-green-500/15', iconColor: 'text-green-400', badge: `${completedOrders} orders` },
          ].map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="backdrop-blur-xl rounded-3xl p-5" style={cardStyleObj}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl ${card.iconBg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  {card.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${card.iconBg} ${card.iconColor} font-medium`}>{card.badge}</span>
                  )}
                </div>
                <p className={`text-2xl font-bold ${primaryText}`}><CountUp to={card.num} prefix={card.pfx} /></p>
                <p className={`text-xs mt-1 ${secondaryText}`}>{card.label}</p>
              </div>
            )
          })}
        </div>

        {/* Orders Table */}
        <div className="rounded-3xl overflow-hidden" style={cardStyleObj}>
          {/* Table header row */}
          <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
              <h3 className={`text-base font-bold ${primaryText}`}>All Orders</h3>
              <span className={`text-xs ${mutedText}`}>{filteredOrders.length} results</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl focus:outline-none text-xs ${selectCls}`}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl focus:outline-none text-xs ${selectCls}`}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              {(searchQuery || statusFilter !== 'all' || timeFilter !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTimeFilter('all') }}
                  className={`px-3 py-1.5 rounded-xl transition-all text-xs ${innerBgHover} ${secondaryText}`}
                >
                  Clear
                </button>
              )}
              <button
                onClick={refreshOrders}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs ${innerBgHover} ${secondaryText}`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Inset dark table */}
          <div className="mx-4 mb-4 rounded-2xl overflow-x-auto" style={{ background: tableBg }}>
            <table className="w-full">
              <thead>
                <tr>
                  {['Order','Customer','Details','Amount','Status','Date','Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                      {recentOrders.length === 0 ? (
                        <>
                          <p className={`font-medium ${secondaryText}`}>No orders available</p>
                          <p className={`text-sm mt-1 ${mutedText}`}>Orders will appear here when customers place orders at your station</p>
                        </>
                      ) : (
                        <>
                          <p className={`font-medium ${secondaryText}`}>No orders match current filters</p>
                          <p className={`text-sm mt-1 ${mutedText}`}>Try adjusting your search or filter criteria</p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const avatarColors = ['from-orange-500 to-pink-500','from-blue-500 to-purple-500','from-green-500 to-teal-500','from-yellow-500 to-orange-500','from-purple-500 to-indigo-500','from-red-500 to-orange-500']
                    const initials = (order.users?.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    const avatarUrl = order.users?.avatar_url
                    const statusCfg: Record<string, { label: string; bg: string; text: string; dot: string }> = {
                      pending:     { label: 'Pending',     bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
                      accepted:    { label: 'Accepted',    bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
                      in_progress: { label: 'In Progress', bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-400' },
                      completed:   { label: 'Completed',   bg: 'bg-green-500/15',  text: 'text-green-400',  dot: 'bg-green-400'  },
                      cancelled:   { label: 'Cancelled',   bg: 'bg-red-500/15',    text: 'text-red-400',    dot: 'bg-red-400'    },
                    }
                    const cfg = statusCfg[order.status] ?? statusCfg['pending']
                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors duration-200 cursor-pointer ${darkMode ? 'hover:bg-white/5' : 'hover:bg-orange-50/50'}`}
                        onClick={() => { setSelectedOrder(order); setShowOrderDetails(true) }}
                      >
                        <td className="px-4 py-4">
                          <p className={`font-semibold font-mono text-sm ${primaryText}`}>#{order.id.slice(0, 8)}</p>
                          <div className={`flex items-center gap-1 text-xs mt-1 ${mutedText}`}>
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{order.delivery_address}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={initials} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display='flex' }} />
                            ) : null}
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarUrl ? 'hidden' : 'flex'}`}>
                              {initials}
                            </div>
                            <div>
                              <p className={`text-sm font-medium leading-tight ${primaryText}`}>{order.users?.name || 'Unknown'}</p>
                              <p className={`text-xs ${mutedText}`}>{order.users?.phone || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className={`capitalize text-sm font-medium ${primaryText}`}>{order.service_type.replace('_', ' ')}</p>
                          {order.service_type === 'fuel_delivery' && (
                            <p className={`text-xs mt-0.5 ${mutedText}`}>{order.fuel_quantity}L {order.fuel_type}</p>
                          )}
                          {order.agents?.users?.name && (
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3 text-blue-400" />
                              <span className="text-xs text-blue-400">{order.agents.users.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-semibold ${primaryText}`}>₵{order.total_amount.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className={`text-sm ${secondaryText}`}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          <p className={`text-xs mt-0.5 ${mutedText}`}>{new Date(order.created_at).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {order.status === 'pending' && (
                              <button
                                onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await updateOrderStatus(order.id, 'accepted') } catch (error) {} }}
                                disabled={updatingOrderId === order.id}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${updatingOrderId === order.id ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'}`}
                              >
                                {updatingOrderId === order.id ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400" />Updating...</> : <><Check className="h-3 w-3" />Accept</>}
                              </button>
                            )}
                            {order.status === 'accepted' && !order.agent_id && (
                              <div className="flex items-center gap-1 text-yellow-400">
                                <Clock className="h-3 w-3 animate-pulse" />
                                <span className="text-xs">Waiting...</span>
                              </div>
                            )}
                            {order.status === 'accepted' && order.agent_id && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs">Assigned</span>
                            )}
                            {order.status === 'in_progress' && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs">In progress</span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setShowOrderDetails(true) }}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderInventoryPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${primaryText}`}>Inventory Management</h2>
            <p className={`${secondaryText} text-sm mt-0.5`}>Monitor your fuel and supplies</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }}>
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fuel Inventory */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <h3 className={`text-lg font-bold ${primaryText} mb-5`}>Fuel Inventory</h3>
            <div className="space-y-5">
              {[
                { name: 'Petrol', pct: 85, used: '15,000L', total: '17,500L', color: 'bg-blue-500', textColor: 'text-blue-400', icon: 'text-blue-400' },
                { name: 'Diesel', pct: 62, used: '9,300L', total: '15,000L', color: 'bg-orange-500', textColor: 'text-orange-400', icon: 'text-orange-400' },
              ].map(fuel => (
                <div key={fuel.name} className={`${innerBg} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Fuel className={`h-5 w-5 ${fuel.icon}`} />
                      <span className={`font-semibold ${primaryText}`}>{fuel.name}</span>
                    </div>
                    <span className={`text-lg font-bold ${fuel.textColor}`}>{fuel.pct}%</span>
                  </div>
                  <div className={`w-full ${progressTrack} rounded-full h-2 mb-2`}>
                    <div className={`${fuel.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${fuel.pct}%` }} />
                  </div>
                  <p className={`text-xs ${mutedText}`}>{fuel.used} / {fuel.total}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Other Inventory */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <h3 className={`text-lg font-bold ${primaryText} mb-5`}>Other Supplies</h3>
            <div className="space-y-3">
              {[
                { name: 'Engine Oil', qty: '45 bottles', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
                { name: 'Brake Fluid', qty: '12 bottles', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
                { name: 'Coolant', qty: '3 bottles', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
              ].map(item => (
                <div key={item.name} className={`flex items-center justify-between p-4 ${innerBgHover} rounded-2xl transition-colors`}>
                  <span className={`font-medium ${secondaryText}`}>{item.name}</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${item.bg} ${item.color}`}>{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPricingPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${primaryText}`}>Fuel Pricing</h2>
            <p className={`${secondaryText} text-sm mt-0.5`}>Update and track fuel prices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Prices */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <h3 className={`text-lg font-bold ${primaryText} mb-5`}>Update Prices</h3>
            <div className="space-y-4">
              {[
                { key: 'petrol' as const, label: 'Petrol Price', icon: 'text-blue-400', iconBg: 'bg-blue-500/20', border: 'focus:border-orange-500' },
                { key: 'diesel' as const, label: 'Diesel Price', icon: 'text-orange-400', iconBg: 'bg-orange-500/20', border: 'focus:border-orange-500' },
              ].map(f => (
                <div key={f.key} className={`${innerBg} rounded-2xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 ${f.iconBg} rounded-xl flex items-center justify-center`}>
                      <Fuel className={`h-4 w-4 ${f.icon}`} />
                    </div>
                    <span className={`font-semibold text-sm ${primaryText}`}>{f.label}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">?</span>
                    <input
                      type="number"
                      step="0.01"
                      value={fuelPrices[f.key]}
                      onChange={(e) => setFuelPrices({...fuelPrices, [f.key]: parseFloat(e.target.value)})}
                      className={`w-full pl-8 pr-4 py-2.5 rounded-xl focus:outline-none transition-colors text-sm ${inputCls}`}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={updateFuelPrices}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 20px rgba(102,126,234,0.4)' }}
              >
                Update Prices
              </button>
            </div>
          </div>

          {/* Price History */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <h3 className={`text-lg font-bold ${primaryText} mb-5`}>Current Prices</h3>
            <div className="space-y-3">
              {[
                { label: 'Petrol', val: fuelPrices.petrol, note: 'Updated 2 hours ago', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
                { label: 'Diesel', val: fuelPrices.diesel, note: 'Updated 2 hours ago', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
              ].map(p => (
                <div key={p.label} className={`flex items-center justify-between p-4 ${innerBg} rounded-2xl`}>
                  <div>
                    <p className={`font-semibold ${primaryText}`}>{p.label}</p>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>{p.note}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-xl text-sm font-bold border ${p.bg} ${p.border} ${p.color}`}>?{p.val}/L</span>
                </div>
              ))}

              {/* Price comparison visual */}
              <div className={`mt-4 p-4 ${innerBg} rounded-2xl`}>
                <p className={`text-xs mb-3 font-medium uppercase tracking-wider ${secondaryText}`}>Price Ratio</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-400">Petrol</span>
                      <span className={mutedText}>{fuelPrices.petrol > 0 ? Math.round(fuelPrices.petrol / (fuelPrices.petrol + fuelPrices.diesel) * 100) : 50}%</span>
                    </div>
                    <div className={`w-full ${progressTrack} rounded-full h-1.5`}>
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${fuelPrices.petrol > 0 ? Math.round(fuelPrices.petrol / (fuelPrices.petrol + fuelPrices.diesel) * 100) : 50}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-orange-400">Diesel</span>
                      <span className={mutedText}>{fuelPrices.diesel > 0 ? Math.round(fuelPrices.diesel / (fuelPrices.petrol + fuelPrices.diesel) * 100) : 50}%</span>
                    </div>
                    <div className={`w-full ${progressTrack} rounded-full h-1.5`}>
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${fuelPrices.diesel > 0 ? Math.round(fuelPrices.diesel / (fuelPrices.petrol + fuelPrices.diesel) * 100) : 50}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAgentsPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${primaryText}`}>Agent Management</h2>
            <p className={`${secondaryText} text-sm mt-0.5`}>Monitor and manage your delivery agents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAgents}
              className={`flex items-center gap-2 px-4 py-2 ${innerBgHover} rounded-xl ${secondaryText} transition-all text-sm`}
            >
              <RefreshCw className={`h-4 w-4 ${loadingAgents ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-blue-500/20 border-blue-500/30 text-blue-300">
              {agents.length} agents
            </span>
          </div>
        </div>

        {/* Agent Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Agents', value: agents.length, icon: Users, color: 'from-orange-500 to-orange-600', glow: 'shadow-orange-500/30' },
            { label: 'Available', value: agents.filter(a => a.is_available).length, icon: () => <div className="w-3.5 h-3.5 bg-green-400 rounded-full animate-pulse" />, color: 'from-green-500 to-green-600', glow: 'shadow-green-500/30' },
            { label: 'Avg Rating', value: agents.length > 0 ? (agents.reduce((s,a) => s + a.rating, 0) / agents.length).toFixed(1) : '0.0', icon: () => <span className="text-base">?</span>, color: 'from-yellow-500 to-yellow-600', glow: 'shadow-yellow-500/30' },
            { label: 'Total Jobs', value: agents.reduce((s, a) => s + a.total_jobs, 0), icon: Truck, color: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/30' },
          ].map((card) => (
            <div key={card.label} className="backdrop-blur-xl rounded-2xl p-4" style={{ background: cardBg }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs mb-1 ${secondaryText}`}>{card.label}</p>
                  <p className={`text-2xl font-bold ${primaryText}`}>{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.glow}`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agents List */}
        <div className="rounded-3xl overflow-hidden" style={cardStyleObj}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
              <h3 className={`text-base font-bold ${primaryText}`}>Available Agents</h3>
              <span className={`text-xs ${mutedText}`}>{agents.length} agents</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 font-medium`}>
                {agents.filter(a => a.is_available).length} online
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-medium`}>
                {agents.filter(a => !a.is_available).length} busy
              </span>
            </div>
          </div>

          {/* Inset table */}
          <div className="mx-4 mb-4 rounded-2xl overflow-x-auto" style={{ background: tableBg }}>
            {loadingAgents ? (
              <div className="text-center py-12">
                <img src={loaderGif} alt="Loading..." className="w-16 h-16 mx-auto mb-3 rounded-lg object-contain opacity-80" />
                <p className={`text-sm ${mutedText}`}>Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-14">
                <div className={`w-14 h-14 ${innerBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Users className="h-7 w-7 text-gray-500" />
                </div>
                <p className={`font-medium ${secondaryText}`}>No agents registered</p>
                <p className={`text-sm mt-1 ${mutedText}`}>Agents will appear once they register for fuel delivery services</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Agent', 'Contact', 'Service', 'Vehicle', 'Rating', 'Jobs', 'Status'].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent, index) => {
                    const avatarColors = ['from-orange-500 to-pink-500','from-blue-500 to-purple-500','from-green-500 to-teal-500','from-yellow-500 to-orange-500','from-purple-500 to-indigo-500','from-red-500 to-orange-500']
                    const initials = (agent.users.name || 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    const avatarUrl = agent.users.avatar_url
                    const serviceColor =
                      agent.service_type === 'fuel_delivery' ? 'bg-orange-500/15 text-orange-400' :
                      agent.service_type === 'mechanic'       ? 'bg-purple-500/15 text-purple-400' :
                                                                'bg-blue-500/15 text-blue-400'
                    return (
                      <tr key={agent.id} className={`transition-colors duration-200 ${darkMode ? 'hover:bg-white/5' : 'hover:bg-orange-50/50'}`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={initials} className="w-9 h-9 rounded-full object-cover"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display='flex' }} />
                              ) : null}
                              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} items-center justify-center text-white text-xs font-bold ${avatarUrl ? 'hidden' : 'flex'}`}>
                                {initials}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${darkMode ? 'border-[#111111]' : 'border-[#f8f9fa]'} ${agent.is_available ? 'bg-green-500' : 'bg-red-400'}`} />
                            </div>
                            <p className={`text-sm font-semibold ${primaryText}`}>{agent.users.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={`text-sm ${secondaryText}`}>{agent.users.phone || '—'}</p>
                          <p className={`text-xs ${mutedText}`}>{agent.users.email || ''}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${serviceColor}`}>
                            {agent.service_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {agent.vehicle_info ? (
                            <div>
                              <p className={`text-sm ${secondaryText}`}>{agent.vehicle_info.make} {agent.vehicle_info.model}</p>
                              {agent.vehicle_info.plate_number && <p className={`text-xs ${mutedText}`}>{agent.vehicle_info.plate_number}</p>}
                            </div>
                          ) : (
                            <span className={`text-xs ${mutedText}`}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400 text-sm">★</span>
                            <span className={`text-sm font-semibold ${primaryText}`}>{agent.rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-medium ${primaryText}`}>{agent.total_jobs}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${agent.is_available ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${agent.is_available ? 'bg-green-400' : 'bg-red-400'}`} />
                            {agent.is_available ? 'Available' : 'Busy'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAnalyticsPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${primaryText}`}>Analytics &amp; Reports</h2>
            <p className={`${secondaryText} text-sm mt-0.5`}>Overview of your station performance</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }}>
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue Trends */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 bg-green-500/20 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <h3 className={`text-base font-bold ${primaryText}`}>Revenue Trends</h3>
            </div>
            <div className="space-y-3">
              {[
                { period: 'This Week', value: `?${(stats.todayRevenue * 7).toLocaleString()}` },
                { period: 'This Month', value: `?${(stats.todayRevenue * 30).toLocaleString()}` },
                { period: 'This Year', value: `?${(stats.todayRevenue * 365).toLocaleString()}` },
              ].map(row => (
                <div key={row.period} className={`flex items-center justify-between p-3 ${innerBg} rounded-xl`}>
                  <span className={`text-sm ${secondaryText}`}>{row.period}</span>
                  <span className="text-green-400 font-semibold text-sm">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Analytics */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className={`text-base font-bold ${primaryText}`}>Order Analytics</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Completion Rate', value: '92%', color: 'text-blue-400' },
                { label: 'Avg Response Time', value: '5 mins', color: 'text-blue-400' },
                { label: 'Customer Rating', value: '4.8 ?', color: 'text-yellow-400' },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between p-3 ${innerBg} rounded-xl`}>
                  <span className={`text-sm ${secondaryText}`}>{row.label}</span>
                  <span className={`font-semibold text-sm ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fuel Sales */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                <Fuel className="h-4 w-4 text-orange-400" />
              </div>
              <h3 className={`text-base font-bold ${primaryText}`}>Fuel Sales Mix</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Petrol', pct: 68, color: 'bg-blue-500', textColor: 'text-blue-400' },
                { label: 'Diesel', pct: 32, color: 'bg-orange-500', textColor: 'text-orange-400' },
              ].map(fuel => (
                <div key={fuel.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={secondaryText}>{fuel.label}</span>
                    <span className={`font-semibold ${fuel.textColor}`}>{fuel.pct}%</span>
                  </div>
                  <div className={`w-full ${progressTrack} rounded-full h-2`}>
                    <div className={`${fuel.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${fuel.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderProfilePage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${primaryText}`}>Station Profile</h2>
            <p className={`${secondaryText} text-sm mt-0.5`}>Your station information and metrics</p>
          </div>
          <button
            onClick={() => {
              if (!stationData) {
                toast.error('Please wait for station data to load')
                return
              }
              setShowEditProfile(true)
            }}
            disabled={!stationData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }}
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Station Info */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <h3 className={`text-lg font-bold ${primaryText} mb-5`}>Station Information</h3>

            {/* Station Image */}
            <div className="mb-5">
              <label className={`block text-xs mb-2 font-medium uppercase tracking-wider ${secondaryText}`}>Station Image</label>
              <div className="relative w-full h-44 rounded-2xl overflow-hidden">
                {stationData?.image_url ? (
                  <img
                    src={stationData.image_url}
                    alt={stationData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/30 to-orange-600/30">
                    <Camera className="h-10 w-10 text-white/30" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs mb-1.5 font-medium uppercase tracking-wider ${secondaryText}`}>Station Name</label>
                <input
                  type="text"
                  value={stationData?.name || ''}
                  readOnly
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none cursor-default ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1.5 font-medium uppercase tracking-wider ${secondaryText}`}>Address</label>
                <textarea
                  value={stationData?.address || ''}
                  readOnly
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none cursor-default h-20 resize-none ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1.5 font-medium uppercase tracking-wider ${secondaryText}`}>Status</label>
                <div className={`flex items-center gap-2 px-4 py-2.5 ${innerBg} rounded-xl`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${stationData?.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-sm font-medium ${stationData?.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {stationData?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="backdrop-blur-xl rounded-3xl p-6" style={{ background: cardBg }}>
            <h3 className={`text-lg font-bold ${primaryText} mb-5`}>Performance Metrics</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Orders Served', value: stats.totalOrders, color: 'text-white' },
                { label: 'Total Revenue', value: `?${(stats.todayRevenue * 30).toLocaleString()}`, color: 'text-green-400' },
                { label: 'Average Order Value', value: `?${stats.avgOrderValue.toFixed(0)}`, color: 'text-blue-400' },
                { label: 'Customer Rating', value: '4.8 ?', color: 'text-yellow-400' },
              ].map(metric => (
                <div key={metric.label} className={`flex items-center justify-between p-4 ${innerBgHover} rounded-2xl transition-colors`}>
                  <span className={`text-sm ${secondaryText}`}>{metric.label}</span>
                  <span className={`font-semibold text-sm ${metric.color}`}>{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }


  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-5">

            {/* ── ROW 1: 2×2 stat cards + Banner ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* 2×2 stat cards */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-5">
                {[
                  { label: 'Today Revenue',   num: stats.todayRevenue,          pfx: '₵', badge: '+12.5%', up: true,  icon: CreditCard,    iconBg: 'bg-white/20',      iconColor: 'text-white',       cardStyle: { background: 'linear-gradient(135deg,#f97316 0%,#ea580c 60%,#c2410c 100%)', boxShadow: darkMode ? '0 8px 32px rgba(249,115,22,0.18)' : '0 8px 32px rgba(249,115,22,0.45)' }, colored: true  },
                  { label: 'Total Revenue',   num: stats.todayRevenue * 30,     pfx: '₵', badge: '+9.47%',  up: true,  icon: TrendingUp,    iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-500',    cardStyle: undefined, colored: false },
                  { label: 'Total Orders',    num: stats.totalOrders,           pfx: '',  badge: '-3.51%',  up: false, icon: Package,       iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500',  cardStyle: undefined, colored: false },
                  { label: 'Avg Order Value', num: stats.avgOrderValue,         pfx: '₵', badge: '+9.51%',  up: true,  icon: ClipboardList, iconBg: 'bg-green-500/10',  iconColor: 'text-green-500',   cardStyle: undefined, colored: false },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
                    style={card.cardStyle ?? cardStyleObj}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 ${card.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                        <card.icon size={16} className={card.colored ? 'text-white' : (card.iconColor || 'text-gray-500')} />
                      </div>
                      <svg className={`w-4 h-4 cursor-pointer transition-colors ${card.colored ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <p className={`text-xs font-medium mb-1 ${card.colored ? 'text-white/70' : secondaryText}`}>{card.label}</p>
                    <p className={`text-3xl font-bold mb-2 ${card.colored ? 'text-white' : primaryText}`}><CountUp to={card.num} prefix={card.pfx} /></p>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        card.colored
                          ? 'bg-white/20 text-white'
                          : card.up ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'
                      }`}>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={card.up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                        </svg>
                        {card.badge}
                      </span>
                      <span className={`text-xs ${card.colored ? 'text-white/60' : mutedText}`}>vs last month</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Banner card */}
              <div className="rounded-2xl p-5 flex flex-col justify-between overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)', boxShadow: darkMode ? '0 12px 40px rgba(249,115,22,0.18)' : '0 12px 40px rgba(249,115,22,0.5)' }}>
                {/* Decorative bubbles */}
                <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute -right-4 bottom-8 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute right-5 top-5 w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="relative z-10">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1.5">Station Insights</p>
                  <h2 className="text-white text-xl font-black leading-tight mb-1.5">Maximize Your<br />Station Revenue<br />with Smart Data</h2>
                  <p className="text-white/65 text-xs mb-3">Track sales, agents & orders in real time.</p>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-3 py-1.5">
                    <svg className="w-4 h-4 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                    </svg>
                    <span className="text-white/50 text-xs flex-1">Search orders or analytics...</span>
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 relative z-10">
                  <button onClick={() => setCurrentPage('analytics')} className="flex-1 bg-white text-orange-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-orange-50 transition-colors">Analyse Data</button>
                  <button onClick={() => setCurrentPage('orders')} className="flex-1 bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/30 transition-colors">Manage Orders</button>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Sales Trends chart + Growth callout + 3 mini cards ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* Sales Trends bar chart — 3 cols */}
              <div className="lg:col-span-3 rounded-2xl p-6" style={cardStyleObj}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className={`text-base font-bold ${primaryText}`}>Sales Trends</h3>
                    <p className={`text-xs mt-0.5 ${secondaryText}`}>{trendPeriod === 'h2' ? 'July – December' : 'January – June'}</p>
                  </div>
                  <select
                    value={trendPeriod}
                    onChange={e => {
                      setTrendPeriod(e.target.value as 'h2' | 'h1')
                      setChartAnimated(false)
                      setTimeout(() => setChartAnimated(true), 60)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs focus:outline-none cursor-pointer ${
                      darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                    <option value="h2">July – December</option>
                    <option value="h1">Jan – June</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className={`flex flex-col justify-between text-right w-10 flex-shrink-0 pb-7 text-xs ${mutedText}`}>
                    {['$50K','$40K','$30K','$20K','$10K','$0'].map(l => <span key={l} className="leading-none">{l}</span>)}
                  </div>
                  <div className="min-w-0 flex-[0_1_52%] flex flex-col">
                    <div className="flex items-end gap-2 h-48 relative">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                        {[0,1,2,3,4,5].map(i => <div key={i} className={`w-full border-t ${darkMode ? 'border-white/5' : 'border-gray-100'}`} />)}
                      </div>
                      {(trendPeriod === 'h2' ? [
                        { month: 'July',      pct: 52, delay: 0,   value: '₵21,320',  active: false },
                        { month: 'August',    pct: 35, delay: 80,  value: '₵14,350',  active: false },
                        { month: 'September', pct: 78, delay: 160, value: `₵${(stats.todayRevenue * 78 / 10).toLocaleString()}`, active: true  },
                        { month: 'October',   pct: 48, delay: 240, value: '₵19,680',  active: false },
                        { month: 'November',  pct: 62, delay: 320, value: '₵25,420',  active: false },
                        { month: 'December',  pct: 70, delay: 400, value: '₵28,700',  active: false },
                      ] : [
                        { month: 'January',   pct: 45, delay: 0,   value: '₵18,450',  active: false },
                        { month: 'February',  pct: 60, delay: 80,  value: '₵24,600',  active: false },
                        { month: 'March',     pct: 55, delay: 160, value: '₵22,550',  active: false },
                        { month: 'April',     pct: 40, delay: 240, value: '₵16,400',  active: false },
                        { month: 'May',       pct: 68, delay: 320, value: '₵27,880',  active: false },
                        { month: 'June',      pct: 58, delay: 400, value: '₵23,780',  active: true  },
                      ]).map((bar) => (
                        <div key={bar.month} className="flex-1 flex flex-col items-center justify-end h-full pb-7">
                          <div className="relative flex items-end justify-center w-full h-full group">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-xl whitespace-nowrap pointer-events-none z-10 font-semibold shadow-lg text-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              {bar.month}<br /><span className="text-orange-400">{bar.value}</span>
                            </div>
                            {/* Bar — fixed narrow width, fully rounded top */}
                            <div className="w-7 rounded-t-2xl cursor-pointer group-hover:brightness-110" style={{
                              height: chartAnimated ? `${bar.pct}%` : '0%',
                              transition: `height 700ms cubic-bezier(0.34,1.2,0.64,1) ${bar.delay}ms`,
                              background: bar.active
                                ? 'linear-gradient(to top, #c2410c, #f97316)'
                                : darkMode ? 'rgba(249,115,22,0.25)' : 'rgba(249,115,22,0.18)',
                              boxShadow: bar.active ? '0 -4px 20px rgba(249,115,22,0.3)' : 'none',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {(trendPeriod === 'h2'
                        ? ['July','August','September','October','November','December']
                        : ['January','February','March','April','May','June']
                      ).map(m => (
                        <div key={m} className="flex-1 text-center">
                          <span className={`text-xs ${mutedText}`}>{m.slice(0,3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className={`w-px self-stretch mx-1 ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`} />

                  {/* Donut chart — fuel sales breakdown */}
                  <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      {/* SVG donut — r=50, circumference=314.16 */}
                      <svg width="148" height="148" viewBox="0 0 148 148">
                        {/* Track */}
                        <circle cx="74" cy="74" r="50" fill="none"
                          stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                          strokeWidth="16" />
                        {/* Petrol — 45% → 141.37 of 314.16 */}
                        <circle cx="74" cy="74" r="50" fill="none"
                          stroke="url(#donutOrange)" strokeWidth="16"
                          strokeLinecap="round"
                          transform="rotate(-90 74 74)"
                          className="cursor-pointer hover:stroke-[20]"
                          style={{ strokeDasharray: chartAnimated ? '141.37 314.16' : '0 314.16', strokeDashoffset: 0, transition: 'stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1) 200ms' }}
                        />
                        {/* Diesel — 35% → 109.96 */}
                        <circle cx="74" cy="74" r="50" fill="none"
                          stroke="#f59e0b" strokeWidth="16"
                          strokeLinecap="round"
                          strokeDashoffset="-141.37"
                          transform="rotate(-90 74 74)"
                          className="cursor-pointer hover:stroke-[20]"
                          style={{ strokeDasharray: chartAnimated ? '109.96 314.16' : '0 314.16', transition: 'stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1) 450ms' }}
                        />
                        {/* LPG — 20% → 62.83 */}
                        <circle cx="74" cy="74" r="50" fill="none"
                          stroke={darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'} strokeWidth="16"
                          strokeLinecap="round"
                          strokeDashoffset="-251.33"
                          transform="rotate(-90 74 74)"
                          className="cursor-pointer hover:stroke-[20]"
                          style={{ strokeDasharray: chartAnimated ? '62.83 314.16' : '0 314.16', transition: 'stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1) 700ms' }}
                        />
                        <defs>
                          <linearGradient id="donutOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#c2410c" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                        {/* Center label */}
                        <text x="74" y="69" textAnchor="middle" fontSize="15" fontWeight="700"
                          fill={darkMode ? '#ffffff' : '#111111'}>Fuel</text>
                        <text x="74" y="85" textAnchor="middle" fontSize="11"
                          fill={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}>Mix</text>
                      </svg>
                    </div>
                    {/* Legend */}
                    <div className="space-y-1.5 w-full">
                      {[
                        { label: 'Petrol', pct: '45%', color: 'bg-orange-500' },
                        { label: 'Diesel', pct: '35%', color: 'bg-amber-400' },
                        { label: 'LPG',    pct: '20%', color: darkMode ? 'bg-white/20' : 'bg-gray-300' },
                      ].map(seg => (
                        <div key={seg.label} className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${seg.color}`} />
                            <span className={`text-xs ${secondaryText}`}>{seg.label}</span>
                          </div>
                          <span className={`text-xs font-semibold ${primaryText}`}>{seg.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Growth callout — 1 col */}
              <div className="rounded-2xl p-6 flex flex-col justify-center" style={cardStyleObj}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${secondaryText}`}>Sales Growth</p>
                <p className="text-5xl font-black text-orange-500 leading-none mb-1">+<CountUp to={10} suffix="%" /></p>
                <p className={`text-sm mb-5 ${secondaryText}`}>from previous semester</p>
                <div className="flex items-end gap-1 h-10">
                  {[40,65,45,80,55,90,70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{
                      height: `${h}%`,
                      background: i === 5 ? 'linear-gradient(to top,#c2410c,#f97316)' : darkMode ? 'rgba(249,115,22,0.25)' : 'rgba(249,115,22,0.18)',
                    }} />
                  ))}
                </div>
                <button onClick={() => setCurrentPage('analytics')} className="mt-4 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors text-left">
                  View Full Report →
                </button>
              </div>

              {/* 3 mini metric cards — 1 col */}
              <div className="flex flex-col gap-5">
                {/* Revenue Potential */}
                <div className="flex-1 rounded-2xl p-4" style={cardStyleObj}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs ${secondaryText} mb-0.5`}>Revenue Potential</p>
                      <p className={`text-xl font-bold ${primaryText}`}><CountUp to={stats.todayRevenue * 30} prefix="₵" /></p>
                      <p className={`text-xs ${mutedText}`}>in this month</p>
                    </div>
                    <div className="flex items-end gap-0.5 h-10">
                      {[50,70,45,85,60].map((h, i) => (
                        <div key={i} className="w-2 rounded-t-sm" style={{ height: `${h}%`, background: i === 3 ? '#f97316' : darkMode ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.18)' }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Order Completion */}
                <div className="flex-1 rounded-2xl p-4" style={cardStyleObj}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        <p className={`text-xs ${secondaryText}`}>Order Completion</p>
                      </div>
                      <p className={`text-xl font-bold ${primaryText}`}><CountUp to={recentOrders.filter(o => o.status === 'completed').length} /></p>
                      <p className={`text-xs ${mutedText}`}>orders completed</p>
                    </div>
                    <div className="flex items-end gap-0.5 h-10">
                      {[60,40,80,55,90].map((h, i) => (
                        <div key={i} className="w-2 rounded-t-sm" style={{ height: `${h}%`, background: i === 4 ? '#f97316' : darkMode ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.18)' }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Pending Revenue */}
                <div className="flex-1 rounded-2xl p-4" style={cardStyleObj}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        <p className={`text-xs ${secondaryText}`}>Pending Revenue</p>
                      </div>
                      <p className={`text-xl font-bold ${primaryText}`}><CountUp to={recentOrders.filter(o => o.status === 'pending').length * stats.avgOrderValue} prefix="₵" /></p>
                      <p className={`text-xs ${mutedText}`}>awaiting completion</p>
                    </div>
                    <svg className="w-12 h-10" viewBox="0 0 48 32" fill="none">
                      <polyline points="0,28 8,20 16,24 24,12 32,18 40,8 48,14" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="40" cy="8" r="3" fill="#f97316" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 3: Recent Order Activities ── */}
            {(() => {
              const displayed = recentOrders.slice(0, 6).filter(o =>
                activityFilter === 'All Status' ? true : o.status === activityFilter.toLowerCase().replace(' ', '_')
              )
              const toggleRow = (id: string) => setSelectedOrderRows(prev => {
                const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
              })
              const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
                pending:     { label: 'Pending',     bg: 'bg-yellow-500/15', text: 'text-yellow-500', dot: 'bg-yellow-500' },
                in_progress: { label: 'In Progress', bg: 'bg-blue-500/15',   text: 'text-blue-500',   dot: 'bg-blue-500'   },
                completed:   { label: 'Completed',   bg: 'bg-green-500/15',  text: 'text-green-600',  dot: 'bg-green-500'  },
                cancelled:   { label: 'Cancelled',   bg: 'bg-red-500/15',    text: 'text-red-500',    dot: 'bg-red-500'    },
              }
              return (
                <div className="rounded-2xl overflow-hidden" style={cardStyleObj}>
                  <div className="flex items-center justify-between px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
                      <h3 className={`text-base font-bold ${primaryText}`}>Recent Order Activities</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={activityFilter}
                        onChange={e => setActivityFilter(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs focus:outline-none cursor-pointer ${
                          darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {['All Status','Pending','In Progress','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => setCurrentPage('orders')} className={`p-1.5 rounded-xl transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mx-4 mb-4 rounded-2xl overflow-x-auto" style={{ background: tableBg }}>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="px-5 py-3 w-10"><div className={`w-4 h-4 rounded border ${darkMode ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-white'}`} /></th>
                          {['Customer','Fuel Type','Amount','Status','Date'].map(h => (
                            <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.length === 0 ? (
                          <tr><td colSpan={6} className={`px-6 py-10 text-center text-sm ${mutedText}`}>No recent orders</td></tr>
                        ) : displayed.map((order, i) => {
                          const cfg = statusConfig[order.status] ?? statusConfig['pending']
                          const initials = (order.users?.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                          const avatarColors = ['from-orange-500 to-pink-500','from-blue-500 to-purple-500','from-green-500 to-teal-500','from-yellow-500 to-orange-500','from-purple-500 to-indigo-500','from-red-500 to-orange-500']
                          const avatarUrl = order.users?.avatar_url
                          const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          const isSelected = selectedOrderRows.has(order.id)
                          return (
                            <tr key={order.id} onClick={() => toggleRow(order.id)}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-orange-500/10'
                                  : darkMode ? 'hover:bg-white/5' : 'hover:bg-orange-50/50'
                              }`}
                            >
                              <td className="px-5 py-3.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSelected ? 'bg-orange-500 border-orange-500' : darkMode ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-white'
                                }`}>
                                  {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={initials} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display='flex' }} />
                                  ) : null}
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarUrl ? 'hidden' : 'flex'}`}>{initials}</div>
                                  <div>
                                    <p className={`text-sm font-medium leading-tight ${primaryText}`}>{order.users?.name || 'Unknown'}</p>
                                    <p className={`text-xs ${mutedText}`}>{order.users?.phone || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5"><span className={`text-sm capitalize ${secondaryText}`}>{order.fuel_type || order.service_type?.replace('_',' ') || '—'}</span></td>
                              <td className="px-4 py-3.5"><span className={`text-sm font-semibold ${primaryText}`}>₵{order.total_amount?.toFixed(2) || '0.00'}</span></td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-3.5"><span className={`text-sm ${secondaryText}`}>{date}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

          </div>
        )

      case 'orders':
        return renderOrdersPage()
        
      case 'inventory':
        return renderInventoryPage()
        
      case 'pricing':
        return renderPricingPage()
        
      case 'agents':
        return renderAgentsPage()
        
      case 'analytics':
        return renderAnalyticsPage()
        
      case 'profile':
        return renderProfilePage()
        
      default:
        return (
          <div className="flex items-center justify-center h-64 backdrop-blur-xl rounded-2xl" style={cardStyleObj}>
            <div className={`text-center ${primaryText}`}>
              <div className="text-4xl mb-4">🚧</div>
              <h3 className={`text-xl font-semibold mb-2 ${primaryText}`}>Page Under Construction</h3>
              <p className={secondaryText}>This page is being built with amazing features!</p>
            </div>
          </div>
        )
    }
  }

  if (loading) {
    const handleClearAll = () => {

      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#ef1b22' }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#ef1b22' }}>
          {/* Clear & Refresh Button - Top Right */}
          <button
            onClick={handleClearAll}
            className="absolute top-6 right-6 p-3 text-white hover:text-white/80 transition-all duration-300 hover:scale-110 z-20"
            title="Clear All Data & Refresh"
          >
            <RefreshCw className="h-6 w-6" />
          </button>
          
          <div className="text-center z-10">
            <img 
              src={loaderGif} 
              alt="Loading..." 
              className="w-48 h-48 mx-auto mb-6 rounded-lg object-contain"
            />
            <h2 className="text-xl font-semibold text-white mb-2">Just a moment while we load your station...</h2>
            <p className="text-gray-200">Setting up your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if user is null (signed out) or actively signing out
  if (!user || isSigningOut) {
    const handleClearAll = () => {

      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#ef1b22' }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#ef1b22' }}>
          {/* Clear & Refresh Button - Top Right */}
          <button
            onClick={handleClearAll}
            className="absolute top-6 right-6 p-3 text-white hover:text-white/80 transition-all duration-300 hover:scale-110 z-20"
            title="Clear All Data & Refresh"
          >
            <RefreshCw className="h-6 w-6" />
          </button>
          
          <div className="text-center z-10">
            <img 
              src={loaderGif} 
              alt="Loading..." 
              className="w-48 h-48 mx-auto mb-6 rounded-lg object-contain"
            />
            <h2 className="text-xl font-semibold text-white mb-2">
              {isSigningOut ? 'See you soon!' : 'Taking you back...'}
            </h2>
            <p className="text-gray-200">
              {isSigningOut ? 'We\'re signing you out securely.' : 'Redirecting to login page.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const rootBg = darkMode ? '#111111' : '#f0f2f5'
  const sidebarBg = darkMode ? '#161616' : '#ffffff'
  const headerBg = darkMode ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)'
  const primaryText = darkMode ? 'text-white' : 'text-gray-900'
  const secondaryText = darkMode ? 'text-gray-400' : 'text-gray-500'
  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400'
  const cardStyleObj: React.CSSProperties = darkMode ? { background: cardBg } : { background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }
  const tableBg = darkMode ? '#111111' : '#f8f9fa'
  const navItemActive = darkMode ? 'bg-white/10 backdrop-blur-xl' : 'bg-orange-50'
  const navItemInactive = darkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
  const navIconInactiveBg = darkMode ? 'bg-white/5' : 'bg-gray-100'
  const navIconInactiveColor = darkMode ? 'text-white' : 'text-gray-500'
  const navLabelActive = darkMode ? 'text-white' : 'text-gray-900'
  const hoverBg = darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
  const bottomBtnBg = darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
  const bottomBtnIconBg = darkMode ? 'bg-white/10' : 'bg-gray-200'
  const toggleLabelColor = darkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
  const innerBg = darkMode ? 'bg-white/5' : 'bg-gray-100'
  const innerBgHover = darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
  const inputCls = darkMode ? 'bg-white/5 text-white placeholder-gray-500 focus:bg-white/10' : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-200'
  const selectCls = darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'
  const progressTrack = darkMode ? 'bg-white/10' : 'bg-gray-200'

  return (
    <div className="min-h-screen text-white" style={{ background: rootBg, userSelect: isResizing ? 'none' : 'auto' }}>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(249, 115, 22, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(249, 115, 22, 0.6);
          }
        }
      `}</style>

      <div className="flex h-screen overflow-hidden">
        {/* Vision UI Sidebar - Fixed */}
        <div 
          className="hidden md:flex flex-col h-[calc(100vh-2rem)] relative rounded-3xl m-4 flex-shrink-0 overflow-hidden"
          style={{ 
            width: sidebarCollapsed ? '80px' : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : 'width 300ms',
            background: sidebarBg
          }}
        >
          {/* Resize Handle */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-orange-500/50 transition-colors group z-50"
            >
              <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-purple-500/0 group-hover:bg-orange-500 rounded-full transition-all" />
            </div>
          )}

          {/* Logo with gradient line - Fixed at top */}
          <div className={`${sidebarCollapsed ? 'px-3' : 'px-6'} py-6 pb-4 flex-shrink-0`}>
            <div className={`flex items-center mb-4 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300`}>
                <img src={logo1} alt="FillUp" className="w-full h-full object-contain" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className={`text-sm font-semibold ${primaryText} tracking-wider`}>
                    FILL UP
                  </h1>
                  <p className={`${secondaryText} text-xs`}>Station</p>
                </div>
              )}
            </div>
            {/* Gradient separator line */}
            <div 
              className="h-px w-full"
              style={{
                background: 'linear-gradient(90deg, rgba(224, 225, 226, 0) 0%, rgb(224, 225, 226) 49.52%, rgba(224, 225, 226, 0) 100%)'
              }}
            />
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2 pb-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center p-3 rounded-2xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : 'gap-3'} ${
                      currentPage === item.id
                        ? navItemActive
                        : navItemInactive
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      currentPage === item.id
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/50'
                        : navIconInactiveBg
                    }`}>
                      <item.icon size={18} className={currentPage === item.id ? 'text-white' : navIconInactiveColor} />
                    </div>
                    {!sidebarCollapsed && (
                      <span className={`font-medium text-sm ${
                        currentPage === item.id ? navLabelActive : 'text-gray-400'
                      }`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* Help Card */}
            {!sidebarCollapsed && (
              <div className="mt-4 mb-6">
                <div 
                  className="rounded-3xl p-5 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  }}
                >
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3">
                      <Settings size={24} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">Need help?</h3>
                    <p className="text-white/80 text-xs mb-4">Please check our docs</p>
                    <button className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-all">
                      DOCUMENTATION
                    </button>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Dark Mode Toggle + Logout - Fixed at bottom */}
          {!sidebarCollapsed ? (
            <div className="px-4 pb-6 flex-shrink-0 space-y-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Switch to blue theme' : 'Switch to dark mode'}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-transparent ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-all group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${bottomBtnIconBg} flex items-center justify-center flex-shrink-0`}>
                    {darkMode ? (
                      <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.061-1.06l-1.59-1.591z" />
                      </svg>
                    ) : (
                      <svg className={`w-4 h-4 ${navIconInactiveColor}`} fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${toggleLabelColor} transition-colors`}>
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </div>
                {/* Toggle pill */}
                <div className={`w-10 h-5 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                  darkMode ? 'bg-orange-500' : 'bg-white/20'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                    darkMode ? 'left-5' : 'left-0.5'
                  }`} />
                </div>
              </button>
              <button
                onClick={async () => {
                  if (await showConfirm('Are you sure you want to sign out?', 'Sign Out')) {
                    handleSignOut()
                  }
                }}
                disabled={isSigningOut}
                className={`w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:transform hover:scale-105 flex items-center justify-center gap-2 ${
                  isSigningOut ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)'
                }}
              >
                {isSigningOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={18} />
                    <span>Log Out</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 flex-shrink-0 space-y-2">
              {/* Dark Mode icon-only */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Switch to blue theme' : 'Switch to dark mode'}
                className={`w-full p-3 bg-transparent ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'} rounded-xl transition-all flex items-center justify-center`}
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.061-1.06l-1.59-1.591z" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 ${navIconInactiveColor}`} fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={async () => {
                  if (await showConfirm('Are you sure you want to sign out?', 'Sign Out')) {
                    handleSignOut()
                  }
                }}
                className={`w-full p-3 ${bottomBtnBg} rounded-xl transition-all`}
                title="Log Out"
              >
                <LogOut size={20} className="text-gray-400 mx-auto" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Sidebar — backdrop */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        )}
        {/* Mobile Sidebar — drawer */}
        <div
          className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col overflow-hidden transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ background: sidebarBg }}
        >
          <div className="px-5 py-5 pb-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={logo1} alt="FillUp" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className={`text-sm font-semibold ${primaryText} tracking-wider`}>FILL UP</h1>
                  <p className={`${secondaryText} text-xs`}>Station</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className={`p-2 ${hoverBg} rounded-xl transition-colors`}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(224,225,226,0) 0%, rgb(224,225,226) 49.52%, rgba(224,225,226,0) 100%)' }} />
          </div>
          <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => { setCurrentPage(item.id); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${currentPage === item.id ? navItemActive : navItemInactive}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${currentPage === item.id ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/50' : navIconInactiveBg}`}>
                      <item.icon size={18} className={currentPage === item.id ? 'text-white' : navIconInactiveColor} />
                    </div>
                    <span className={`font-medium text-sm ${currentPage === item.id ? navLabelActive : 'text-gray-400'}`}>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="px-4 pb-6 flex-shrink-0 space-y-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-transparent ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl ${bottomBtnIconBg} flex items-center justify-center flex-shrink-0`}>
                  {darkMode
                    ? <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.061-1.06l-1.59-1.591z" /></svg>
                    : <svg className={`w-4 h-4 ${navIconInactiveColor}`} fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" /></svg>
                  }
                </div>
                <span className={`text-sm font-medium ${toggleLabelColor}`}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all duration-300 relative flex-shrink-0 ${darkMode ? 'bg-orange-500' : 'bg-white/20'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${darkMode ? 'left-5' : 'left-0.5'}`} />
              </div>
            </button>
            <button
              onClick={async () => { if (await showConfirm('Are you sure you want to sign out?', 'Sign Out')) { handleSignOut() } }}
              disabled={isSigningOut}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
            >
              <LogOut size={18} />
              <span>{isSigningOut ? 'Signing Out...' : 'Log Out'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
          {/* Header - Vision UI Style */}
          <header className="sticky top-0 z-40 p-4">
            <div
              className="px-6 py-4 backdrop-blur-2xl rounded-3xl"
              style={{ background: headerBg }}
            >
              <div className="flex items-center justify-between">
                {/* Left - Toggle + Breadcrumb */}
                <div className="flex items-center gap-3">
                  {/* Mobile hamburger */}
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className={`md:hidden p-2 ${hoverBg} rounded-xl transition-colors`}
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {/* Desktop collapse toggle */}
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={`hidden md:flex p-2 ${hoverBg} rounded-xl transition-colors`}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    <ChevronRight size={18} className={`text-gray-400 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                  <div>
                    <div className={`flex items-center gap-2 ${secondaryText} text-xs mb-1`}>
                      <Home size={12} />
                      <span>/</span>
                      <span>{menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}</span>
                    </div>
                    <h2 className={`text-lg font-bold ${primaryText}`}>
                      {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
                    </h2>
                  </div>
                </div>

                {/* Right - Search + Actions */}
                <div className="flex items-center gap-3">
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder={currentPage === 'orders' ? 'Search by ID, customer, address...' : currentPage === 'agents' ? 'Search agents...' : currentPage === 'inventory' ? 'Search inventory...' : 'Search...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-56 pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${darkMode ? 'bg-white/5 text-white placeholder-gray-500 focus:bg-white/10' : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-200'}`}
                    />
                  </div>
                  <button className={`relative p-2 ${hoverBg} rounded-xl transition-colors`}>
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  <div className="relative group">
                    <button className={`flex items-center gap-2.5 px-2 py-1.5 ${hoverBg} rounded-2xl transition-colors`}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {stationData?.image_url ? (
                          <img src={stationData.image_url} alt={stationData.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center font-bold text-white text-sm">
                            {stationData?.name?.charAt(0) || 'S'}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2" style={{ borderColor: headerBg }} />
                      </div>
                      {/* Name + role */}
                      <div className="text-left hidden sm:block">
                        <p className={`text-sm font-semibold leading-tight ${primaryText}`}>{stationData?.name || 'Station'}</p>
                        <p className={`text-xs ${secondaryText}`}>Admin Store</p>
                      </div>
                      <ChevronDown size={14} className={`${secondaryText} hidden sm:block`} />
                    </button>
                    <div className="absolute right-0 mt-2 w-56 backdrop-blur-2xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden shadow-xl" style={{ background: darkMode ? 'rgba(22,22,22,0.97)' : 'rgba(255,255,255,0.97)', boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
                      <div className={`p-4 border-b ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                        <p className={`font-semibold text-sm ${primaryText}`}>{stationData?.name || 'Station'}</p>
                        <p className={`text-xs mt-0.5 ${secondaryText}`}>{user?.email || 'Station Partner'}</p>
                      </div>
                      <div className="p-2">
                        <button onClick={() => setCurrentPage('profile')} className={`w-full flex items-center gap-3 px-3 py-2 text-left ${secondaryText} ${hoverBg} rounded-xl transition-colors text-sm`}>
                          <User size={14} /><span>Profile</span>
                        </button>
                        <button onClick={() => setCurrentPage('profile')} className={`w-full flex items-center gap-3 px-3 py-2 text-left ${secondaryText} ${hoverBg} rounded-xl transition-colors text-sm`}>
                          <Settings size={14} /><span>Settings</span>
                        </button>
                      </div>
                      <div className={`p-2 border-t ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                        <button onClick={async () => { if (await showConfirm('Are you sure you want to sign out?', 'Sign Out')) { handleSignOut() } }} disabled={isSigningOut} className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm">
                          <LogOut size={14} /><span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30"
        style={{ background: sidebarBg, borderTop: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {menuItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                currentPage === item.id
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30'
                  : navIconInactiveBg
              }`}>
                <item.icon size={17} className={currentPage === item.id ? 'text-white' : navIconInactiveColor} />
              </div>
              <span className={`text-[10px] font-medium leading-none ${
                currentPage === item.id ? 'text-orange-500' : 'text-gray-400'
              }`}>{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp scrollbar-hide">
            <style dangerouslySetInnerHTML={{
              __html: `.scrollbar-hide::-webkit-scrollbar { display: none; }
                       .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`
            }} />
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Order Details</h3>
                <p className="text-gray-400 text-sm">Complete order information</p>
              </div>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:rotate-90"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Order ID & Status */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Order ID</p>
                      <p className="text-white font-mono text-xl font-bold">#{selectedOrder.id.slice(0, 8)}</p>
                    </div>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-lg rounded-2xl p-6 hover:border-orange-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Customer Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Name</span>
                      <span className="text-white font-medium">{selectedOrder.users?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Phone</span>
                      <span className="text-white font-medium">{selectedOrder.users?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Fuel className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Service Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Service Type</span>
                      <span className="text-white font-medium capitalize">{selectedOrder.service_type.replace('_', ' ')}</span>
                    </div>
                    {selectedOrder.service_type === 'fuel_delivery' && (
                      <>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-400 text-sm">Fuel Type</span>
                          <span className="text-white font-medium capitalize">{selectedOrder.fuel_type}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-400 text-sm">Quantity</span>
                          <span className="text-white font-bold text-lg">{selectedOrder.fuel_quantity}L</span>
                        </div>
                      </>
                    )}
                    {selectedOrder.vehicles && (
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Vehicle</span>
                        <span className="text-white font-medium">{selectedOrder.vehicles.make} {selectedOrder.vehicles.model}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-lg rounded-2xl p-6 hover:border-orange-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Delivery Location</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm block mb-2">Address</span>
                      <p className="text-white font-medium leading-relaxed">{selectedOrder.delivery_address}</p>
                    </div>
                    {selectedOrder.notes && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm block mb-2">Special Notes</span>
                        <p className="text-white leading-relaxed">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Agent Information */}
                {selectedOrder.agents?.users && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-white font-semibold text-lg">Agent Assigned</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Name</span>
                        <span className="text-white font-medium">{selectedOrder.agents.users.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-400 text-sm">Phone</span>
                        <span className="text-white font-medium">{selectedOrder.agents.users.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-lg rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Payment Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Platform Fee</span>
                      <span className="text-white font-medium">?{selectedOrder.platform_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Agent Fee</span>
                      <span className="text-white font-medium">?{selectedOrder.agent_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
                      <span className="text-emerald-400 font-semibold">Total Amount</span>
                      <span className="text-white font-bold text-2xl">?{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 backdrop-blur-lg rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Timeline</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <span className="text-gray-400 text-sm block">Created</span>
                        <span className="text-white font-medium text-sm">
                          {new Date(selectedOrder.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {selectedOrder.accepted_at && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <span className="text-gray-400 text-sm block">Accepted</span>
                          <span className="text-white font-medium text-sm">
                            {new Date(selectedOrder.accepted_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedOrder.completed_at && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <span className="text-gray-400 text-sm block">Completed</span>
                          <span className="text-white font-medium text-sm">
                            {new Date(selectedOrder.completed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">Edit Station Profile</h3>
              <button
                onClick={() => {
                  setShowEditProfile(false)
                  setImageFile(null)
                  setImagePreview(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Current Station Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Current Station Image
                </label>
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 mb-4 flex items-center justify-center">
                  {stationData?.image_url ? (
                    <img 
                      src={stationData.image_url} 
                      alt={stationData.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-orange-700">
                      <Camera className="h-12 w-12 text-white opacity-50 mb-2" />
                      <p className="text-white text-sm">No image uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload New Image */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-blue-900 font-semibold">Update Station Image</h4>
                    <p className="text-blue-700 text-sm">Upload a new photo to replace the current one</p>
                  </div>
                </div>

                {!imagePreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-10 w-10 text-blue-400 mb-3" />
                      <p className="mb-2 text-sm text-gray-600">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="New station preview"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Station Info (Read-only) */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Station Information</h4>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Station Name</label>
                  <div className="text-sm font-medium text-gray-900">{stationData?.name}</div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Address</label>
                  <div className="text-sm text-gray-900">{stationData?.address}</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  To update other station information, please contact support.
                </p>
              </div>

              {/* GPS Location Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-blue-900 font-semibold">Station GPS Location</h4>
                      <p className="text-blue-700 text-sm">Set your exact location for agent navigation</p>
                    </div>
                  </div>
                  {!editingLocation && (
                    <button
                      onClick={() => {
                        setEditingLocation(true)
                        // Initialize with current location if available
                        if (stationData?.location?.coordinates) {
                          setSelectedCoordinates([stationData.location.coordinates[1], stationData.location.coordinates[0]])
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {stationData?.location?.coordinates ? 'Update Location' : 'Set Location'}
                    </button>
                  )}
                </div>

                {stationData?.location?.coordinates && !editingLocation && (
                  <div className="mb-3 p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Current Location:</strong> {stationData.location.coordinates[1].toFixed(6)}, {stationData.location.coordinates[0].toFixed(6)}
                    </p>
                  </div>
                )}

                {!stationData?.location?.coordinates && !editingLocation && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ?? No GPS location set. Click "Set Location" to add your station's coordinates.
                    </p>
                  </div>
                )}

                {editingLocation && (
                  <div>
                    {selectedCoordinates && (
                      <div className="mb-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Selected Location:</strong> {selectedCoordinates[0].toFixed(6)}, {selectedCoordinates[1].toFixed(6)}
                        </p>
                      </div>
                    )}
                    <div className="h-96 rounded-lg overflow-hidden border-2 border-blue-300 mb-3">
                      <MapContainer
                        center={
                          selectedCoordinates ||
                          (stationData?.location?.coordinates 
                            ? [stationData.location.coordinates[1], stationData.location.coordinates[0]] 
                            : [5.6037, -0.187]) // Default: Accra, Ghana
                        }
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationPicker />
                      </MapContainer>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingLocation(false)
                          setSelectedCoordinates(null)
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateLocation}
                        disabled={!selectedCoordinates || savingLocation}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingLocation ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save Location
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowEditProfile(false)
                  setImageFile(null)
                  setImagePreview(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfileImage}
                disabled={!imageFile || uploadingImage}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingImage ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Update Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

