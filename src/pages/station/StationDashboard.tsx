import React, { useState, useEffect } from 'react'
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
  Camera
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { uploadStationImage, updateStationImage, deleteStationImage } from '../../lib/imageUpload'
import loaderGif from '../../assets/lodaer.gif'
import { getCache, setCache } from '../../lib/cache'

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

export const StationDashboard: React.FC = () => {

  const { signOut, user } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320) // 80 * 4 = 320px (w-80)
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
                  users!orders_customer_id_fkey(name, phone),
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
                  users!orders_customer_id_fkey(name, phone),
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
        alert('Failed to load station data. Please refresh the page and try again.')
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
          console.log('📋 Station IDs in database:', allOrdersCount.map(o => o.station_id))
          console.log('🔍 Does our station ID match any?', allOrdersCount.some(o => o.station_id === stationId))
        }
      }
      
      // Get orders for this station with all related data
      // Include both fuel delivery orders (with station_id) and mechanic services (service_type = 'mechanic')

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey(name, phone),
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


      console.log('📋 First 3 orders:', orders?.slice(0, 3))
      console.log('🆔 All order IDs:', orders?.map(o => o.id) || [])
      console.log('📍 Order statuses:', orders?.map(o => `${o.id}: ${o.status}`) || [])
      console.log('🏢 Station IDs in orders:', orders?.map(o => o.station_id) || [])
      
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

      alert('Failed to update fuel prices. Please try again.')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
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
      alert('Please select an image first')
      return
    }

    if (!stationData || !stationData.id) {
      alert('Station data not loaded. Please refresh the page and try again.')
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
      
      alert('Profile image updated successfully!')
    } catch (error: any) {

      alert(`Failed to update profile image: ${error.message || 'Please try again.'}`)
    } finally {
      setUploadingImage(false)
    }
  }
  
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (updatingOrderId) {
      return // Prevent multiple simultaneous updates
    }
    
    setUpdatingOrderId(orderId)
    
    try {
      if (!orderId) {
        alert('Error: No order ID provided')
        setUpdatingOrderId(null)
        return
      }
      
      if (!stationData?.id) {
        alert('Error: Station data not loaded')
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
        alert(`Error fetching order: ${fetchError.message}`)
        setUpdatingOrderId(null)
        return
      }
      
      if (!existingOrder) {
        alert('Error: Order not found')
        setUpdatingOrderId(null)
        return
      }
      
      if (existingOrder.station_id !== stationData.id && existingOrder.service_type !== 'mechanic') {
        alert('Error: Order does not belong to this station')
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
          alert('Permission denied: Station cannot update orders. Please contact support.')
        } else {
          alert(`Failed to update order status: ${error.message}`)
        }
        setUpdatingOrderId(null)
        return
      }
      
      if (!updatedOrder || updatedOrder.length === 0) {
        alert('Failed to update order. This may be a permission issue.')
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
        alert('Order accepted! It is now available to all agents on their platform.')
      } else {
        alert('Order status updated successfully!')
      }
      
      // Refresh orders to get complete data
      await refreshOrders()
      
    } catch (error) {
      alert('Failed to update order status. Please try again.')
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
      alert('Sign out failed. Redirecting to login page...')
      
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
      value: `₵${stats.todayRevenue.toLocaleString()}`,
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
      value: `₵${stats.avgOrderValue.toFixed(0)}`,
      change: '+5.2%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600'
    }
  ]

  const StatCard: React.FC<StatCardProps> = ({ stat, index }) => (
    <div 
      className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:transform hover:-translate-y-2 transition-all duration-500 overflow-hidden"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards'
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      
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
        case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
        case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200'
        case 'in_progress': return 'bg-purple-100 text-purple-700 border-purple-200'
        case 'completed': return 'bg-green-100 text-green-700 border-green-200'
        case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
        default: return 'bg-gray-100 text-gray-700 border-gray-200'
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


    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <div className="flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
              {recentOrders.length} total orders loaded
            </span>
            <button 
              onClick={refreshOrders}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-600 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Orders
            </button>
            <button 
              onClick={() => {






                if (stationData?.id) {

                  loadOrders(stationData.id)
                } else {

                }
                
                // Also try a simple query without joins
                if (stationData?.id) {

                  supabase
                    .from('orders')
                    .select('*')
                    .or(`station_id.eq.${stationData.id},service_type.eq.mechanic`)
                    .then(({ data, error }) => {
                      if (error) {

                      } else {


                      }
                    })
                    
                  // Also check for ALL orders to see if there's any data

                  supabase
                    .from('orders')
                    .select('id, station_id, status, created_at')
                    .limit(5)
                    .then(({ data, error }) => {
                      if (error) {

                      } else {

                        if (data && data.length > 0) {
                          console.log('🏢 Available station IDs:', [...new Set(data.map(o => o.station_id))])

                          console.log('🔍 Station ID match found:', data.some(o => o.station_id === stationData.id))
                        }
                      }
                    })
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-600 transition-all duration-300"
            >
              Debug
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders by ID, customer, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500"
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
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setTimeFilter('all')

                }}
                className="px-4 py-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-600 transition-all duration-300 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Orders Table */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Order</th>
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Customer</th>
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Details</th>
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Amount</th>
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Status</th>
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Date</th>
                  <th className="text-left py-4 px-2 text-gray-600 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {recentOrders.length === 0 ? (
                        <>
                          <p>No orders available</p>
                          <p className="text-sm mt-2">Orders will appear here when customers place orders at your station</p>
                        </>
                      ) : (
                        <>
                          <p>No orders match current filters</p>
                          <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
                          <p className="text-xs mt-1 text-gray-500">
                            Total orders loaded: {recentOrders.length} | Current filters: Status={statusFilter}, Time={timeFilter}
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: 'fadeInUp 0.4s ease-out forwards'
                      }}
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowOrderDetails(true)
                      }}
                    >
                      <td className="py-4 px-2">
                        <div>
                          <p className="font-semibold text-gray-900">#{order.id.slice(0, 8)}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-xs">{order.delivery_address}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div>
                          <p className="font-medium text-gray-900">{order.users?.name || 'No name'}</p>
                          <p className="text-sm text-gray-500">{order.users?.phone || 'No phone'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div>
                          <p className="text-gray-900 capitalize font-medium">{order.service_type.replace('_', ' ')}</p>
                          {order.service_type === 'fuel_delivery' && (
                            <p className="text-sm text-gray-500">
                              {order.fuel_quantity}L {order.fuel_type}
                            </p>
                          )}
                          {order.vehicles && (
                            <p className="text-xs text-gray-500">
                              {order.vehicles.make} {order.vehicles.model}
                            </p>
                          )}
                          {order.agents?.users?.name && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Users className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-600">
                                Agent: {order.agents.users.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-semibold text-gray-900">₵{order.total_amount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-700">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center space-x-2">
                          {order.status === 'pending' && (
                            <button
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()




                                try {
                                  await updateOrderStatus(order.id, 'accepted')

                                } catch (error) {

                                }
                              }}
                              disabled={updatingOrderId === order.id}
                              className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 font-medium ${
                                updatingOrderId === order.id
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                              }`}
                            >
                              {updatingOrderId === order.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3" />
                                  Accept Order
                                </>
                              )}
                            </button>
                          )}
                          {order.status === 'accepted' && !order.agent_id && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-yellow-600">
                                <Clock className="h-3 w-3 animate-pulse" />
                                <span className="text-xs font-medium">Waiting for agent...</span>
                              </div>
                            </div>
                          )}
                          {order.status === 'accepted' && order.agent_id && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
                                Agent assigned
                              </span>
                            </div>
                          )}
                          {order.status === 'in_progress' && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium">
                                In progress
                              </span>
                            </div>
                          )}
                          {order.status === 'completed' && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
                                Completed
                              </span>
                            </div>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrder(order)
                              setShowOrderDetails(true)
                            }}
                            className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-600 font-medium transition-all duration-300">
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
        
        {/* Fuel Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Inventory</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Fuel className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Petrol</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">15,000L / 17,500L</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Fuel className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Diesel</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">62%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">9,300L / 15,000L</p>
              </div>
            </div>
          </div>
          
          {/* Other Inventory */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Items</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900 font-medium">Engine Oil</span>
                <span className="text-green-600 font-semibold">45 bottles</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900 font-medium">Brake Fluid</span>
                <span className="text-yellow-600 font-semibold">12 bottles</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900 font-medium">Coolant</span>
                <span className="text-red-600 font-semibold">3 bottles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPricingPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Fuel Pricing Management</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Prices</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Fuel className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Petrol Price</span>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={fuelPrices.petrol}
                  onChange={(e) => setFuelPrices({...fuelPrices, petrol: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Fuel className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Diesel Price</span>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={fuelPrices.diesel}
                  onChange={(e) => setFuelPrices({...fuelPrices, diesel: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              
              <button
                onClick={updateFuelPrices}
                className="w-full bg-green-50 hover:bg-green-100 text-green-600 font-medium py-3 px-4 rounded-lg transition-colors border border-green-200"
              >
                Update Prices
              </button>
            </div>
          </div>
          
          {/* Price History */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-gray-900 font-medium">Petrol</p>
                  <p className="text-xs text-gray-500">Updated 2 hours ago</p>
                </div>
                <span className="text-blue-600 font-semibold">₵{fuelPrices.petrol}/L</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-gray-900 font-medium">Diesel</p>
                  <p className="text-xs text-gray-500">Updated 2 hours ago</p>
                </div>
                <span className="text-orange-600 font-semibold">₵{fuelPrices.diesel}/L</span>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Agent Management</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={loadAgents}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-600 font-medium transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 ${loadingAgents ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
              {agents.length} agents available
            </span>
          </div>
        </div>
        
        {/* Agent Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {agents.filter(agent => agent.is_available).length}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {agents.length > 0 
                    ? (agents.reduce((sum, agent) => sum + agent.rating, 0) / agents.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <div className="text-yellow-500 text-2xl">⭐</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Jobs</p>
                <p className="text-2xl font-bold text-purple-600">
                  {agents.reduce((sum, agent) => sum + agent.total_jobs, 0)}
                </p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
        
        {/* Agents List */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Agents</h3>
          
          {loadingAgents ? (
            <div className="text-center py-12">
              <img 
                src={loaderGif} 
                alt="Loading..." 
                className="w-24 h-24 mx-auto mb-6 rounded-lg object-contain"
              />
              <p className="text-gray-500 text-lg">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No agents available</p>
              <p className="text-sm mt-2">Agents will appear here once they register for fuel delivery services</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map((agent, index) => (
                <div 
                  key={agent.id}
                  className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-300"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.4s ease-out forwards'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold text-white">
                          {agent.users.name?.charAt(0) || 'A'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          agent.is_available ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{agent.users.name}</h4>
                        <p className="text-sm text-gray-600">{agent.users.phone}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            agent.service_type === 'fuel_delivery' 
                              ? 'bg-blue-100 text-blue-700'
                              : agent.service_type === 'mechanic'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {agent.service_type.replace('_', ' ')}
                          </span>
                          {agent.license_number && (
                            <span className="text-xs text-gray-500">
                              License: {agent.license_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(agent.rating) ? 'text-yellow-500' : 'text-gray-300'
                              }`}
                            >
                              ⭐
                            </div>
                          ))}
                          <span className="text-sm text-yellow-600 ml-1 font-semibold">
                            {agent.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium">{agent.total_jobs} total jobs</p>
                        <p className={`font-semibold ${agent.is_available ? 'text-green-600' : 'text-red-600'}`}>
                          {agent.is_available ? 'Available' : 'Busy'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {agent.vehicle_info && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700 font-medium">
                        Vehicle: {agent.vehicle_info?.make} {agent.vehicle_info?.model} - {agent.vehicle_info?.plate_number}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderAnalyticsPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-600 font-medium transition-all duration-300">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">This Week</span>
                <span className="text-green-600 font-semibold">₵{(stats.todayRevenue * 7).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">This Month</span>
                <span className="text-green-600 font-semibold">₵{(stats.todayRevenue * 30).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">This Year</span>
                <span className="text-green-600 font-semibold">₵{(stats.todayRevenue * 365).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Analytics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completion Rate</span>
                <span className="text-blue-600 font-semibold">92%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="text-blue-600 font-semibold">5 mins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Customer Rating</span>
                <span className="text-yellow-600 font-semibold">4.8 ⭐</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Sales</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Petrol</span>
                <span className="text-blue-600 font-semibold">68%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Diesel</span>
                <span className="text-orange-600 font-semibold">32%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderProfilePage = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Station Profile</h2>
          <button 
            onClick={() => {
              if (!stationData) {
                alert('Please wait for station data to load')
                return
              }
              setShowEditProfile(true)
            }}
            disabled={!stationData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-600 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Station Information</h3>
            
            {/* Station Image */}
            <div className="mb-6">
              <label className="block text-gray-600 text-sm mb-2 font-medium">Station Image</label>
              <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {stationData?.image_url ? (
                  <img 
                    src={stationData.image_url} 
                    alt={stationData.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
                    <Camera className="h-12 w-12 text-white opacity-50" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1 font-medium">Station Name</label>
                <input
                  type="text"
                  value={stationData?.name || ''}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1 font-medium">Address</label>
                <textarea
                  value={stationData?.address || ''}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 h-20"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1 font-medium">Status</label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${stationData?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-900 font-medium">
                    {stationData?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Total Orders Served</span>
                <span className="text-gray-900 font-semibold">{stats.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Total Revenue</span>
                <span className="text-green-600 font-semibold">₵{(stats.todayRevenue * 30).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Average Order Value</span>
                <span className="text-blue-600 font-semibold">₵{stats.avgOrderValue.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">Customer Rating</span>
                <span className="text-yellow-600 font-semibold">4.8 ⭐</span>
              </div>
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
          <div className="space-y-6">
            {/* Top Section: Date Filter */}
            <div className="flex items-center justify-between">
              <select className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500">
                <option>01 Jan - 30 Jun</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>

            {/* Stats Grid - 4 Cards in a Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Users</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-gray-900">{stats.todayOrders.toLocaleString()}</p>
                </div>
                {/* Mini Chart Placeholder */}
                <div className="h-12 flex items-end gap-1">
                  {[30, 50, 40, 60, 45, 70, 65].map((height, i) => (
                    <div key={i} className="flex-1 bg-blue-200 rounded-t" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>

              {/* Total Orders Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Orders</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
                </div>
                {/* Mini Bar Chart */}
                <div className="h-12 flex items-end gap-1">
                  {[40, 30, 50, 35, 45, 70, 90].map((height, i) => (
                    <div key={i} className="flex-1 bg-orange-200 rounded-t" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>

              {/* Total Sales Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Sales</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-gray-900">{(stats.todayRevenue * 10).toLocaleString()}</p>
                </div>
                {/* Mini Bar Chart */}
                <div className="h-12 flex items-end gap-1">
                  {[50, 60, 45, 70, 55, 65, 50].map((height, i) => (
                    <div key={i} className="flex-1 bg-blue-200 rounded-t" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>

              {/* Total Pending Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Pending</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-4xl font-bold text-gray-900">
                    {recentOrders.filter(o => o.status === 'pending').length.toLocaleString()}
                  </p>
                </div>
                {/* Mini Line Chart */}
                <div className="h-12 flex items-end gap-1">
                  {[60, 55, 65, 50, 70, 75, 65].map((height, i) => (
                    <div key={i} className="flex-1 bg-green-200 rounded-t" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Section: Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Summary (Bar Chart) */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Product Summary</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Gas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Oil</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-gray-600">Diesel</span>
                    </div>
                  </div>
                </div>
                {/* Bar Chart Visualization */}
                <div className="h-64 flex items-end justify-between gap-4">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, i) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center gap-1">
                        {/* Diesel (Gray) */}
                        <div className="w-full bg-gray-300 rounded-t" style={{ height: `${[30, 35, 25, 40, 30, 25, 35][i]}px` }}></div>
                        {/* Oil (Green) */}
                        <div className="w-full bg-green-500 rounded-t" style={{ height: `${[60, 70, 80, 90, 75, 85, 80][i]}px` }}></div>
                        {/* Gas (Blue) */}
                        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${[80, 90, 100, 110, 95, 130, 120][i]}px` }}></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders Donut Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Orders</h3>
                {/* Donut Chart */}
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="24"
                    />
                    {/* Completed (Blue) - 53% */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="24"
                      strokeDasharray="265 502"
                      strokeDashoffset="0"
                    />
                    {/* Pending (Light Blue) - 19% */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="24"
                      strokeDasharray="95 502"
                      strokeDashoffset="-265"
                    />
                    {/* In Progress (Orange) - 15% */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="24"
                      strokeDasharray="75 502"
                      strokeDashoffset="-360"
                    />
                    {/* Cancelled (Purple) - 13% */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="24"
                      strokeDasharray="67 502"
                      strokeDashoffset="-435"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-gray-900">{stats.totalOrders}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Completed</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {recentOrders.filter(o => o.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {recentOrders.filter(o => o.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">In Progress</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {recentOrders.filter(o => o.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Cancelled</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {recentOrders.filter(o => o.status === 'cancelled').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Sales Summary Line Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Sales Summary</h3>
                <select className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-500">
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Daily</option>
                </select>
              </div>
              {/* Line Chart */}
              <div className="h-64 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-gray-400">
                  <span>₵80</span>
                  <span>₵60</span>
                  <span>₵40</span>
                  <span>₵20</span>
                  <span>0</span>
                </div>
                {/* Chart area */}
                <div className="ml-12 h-full flex items-end justify-between gap-8 border-b border-l border-gray-200">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
                    const heights = [40, 35, 50, 30, 85, 45];
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center relative group">
                        <div 
                          className="absolute bottom-0 w-2 bg-gradient-to-t from-orange-500 to-orange-300 rounded-t-full cursor-pointer hover:from-orange-600 hover:to-orange-400 transition-all"
                          style={{ height: `${heights[i]}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            ₵{(stats.todayRevenue * (heights[i] / 10)).toFixed(0)}
                          </div>
                        </div>
                        <span className="absolute -bottom-6 text-xs text-gray-500">{month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
          <div className="flex items-center justify-center h-64 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
            <div className="text-center text-white">
              <div className="text-4xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold mb-2">Page Under Construction</h3>
              <p className="text-gray-300">This page is being built with amazing features!</p>
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
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
            box-shadow: 0 0 5px rgba(99, 102, 241, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.6);
          }
        }
      `}</style>

      <div className="flex">
        {/* Sidebar */}
        <div 
          className="bg-gray-900 min-h-screen flex flex-col relative"
          style={{ 
            width: sidebarCollapsed ? '80px' : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : 'width 300ms'
          }}
        >
          {/* Resize Handle */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors group"
            >
              <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500/0 group-hover:bg-blue-500 rounded-full transition-all" />
            </div>
          )}
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                {stationData?.image_url ? (
                  <img 
                    src={stationData.image_url} 
                    alt={stationData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={logo1} alt="FillUp" className="w-full h-full object-contain" />
                )}
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-white">{stationData?.name || 'FillUp'}</h1>
                  <p className="text-gray-400 text-xs">Station</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Menu Label */}
          {!sidebarCollapsed && (
            <div className="px-6 py-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Main Menu</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      currentPage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    {!sidebarCollapsed && (
                      <span className="font-medium text-sm">{item.label}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Preference Section */}
          {!sidebarCollapsed && (
            <div className="px-6 py-4 border-t border-gray-800">
              <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-4">Preference</p>
              <ul className="space-y-1">
                <li>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-300">
                    <Settings size={20} />
                    <span className="font-medium text-sm">Settings</span>
                  </button>
                </li>
                <li>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-300">
                    <Activity size={20} />
                    <span className="font-medium text-sm">Help</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* User Profile */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={() => {

                if (window.confirm('Are you sure you want to sign out?')) {

                  handleSignOut()
                }
              }}
              disabled={isSigningOut}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-all duration-300 ${
                isSigningOut ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSigningOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && <span>Log Out</span>}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Menu size={20} />
                </button>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders, transaction etc..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* New Order Button */}
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-orange-500/30">
                  <Plus size={20} />
                  New Order
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></div>
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                </div>

                {/* Profile Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center font-semibold text-white">
                      {stationData?.name?.charAt(0) || 'S'}
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{stationData?.name || 'Station'}</p>
                      <p className="text-sm text-gray-500">{user?.email || 'Station Partner'}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => setCurrentPage('profile')}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <User size={16} />
                        <span className="text-sm">Profile</span>
                      </button>
                      <button 
                        onClick={() => setCurrentPage('profile')}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Settings size={16} />
                        <span className="text-sm">Settings</span>
                      </button>
                    </div>
                    <div className="p-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to sign out?')) {
                            handleSignOut()
                          }
                        }}
                        disabled={isSigningOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        <span className="text-sm">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Sort by: <button className="text-blue-600 hover:underline">01 Jan - 30 Jun</button>
              </p>
            </div>
            {renderPage()}
          </main>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl animate-slideUp scrollbar-hide">
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
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Order ID</p>
                      <p className="text-white font-mono text-xl font-bold">#{selectedOrder.id.slice(0, 8)}</p>
                    </div>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
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
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-green-500/30 transition-all duration-300">
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
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-orange-500/30 transition-all duration-300">
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
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-300">
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
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-emerald-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-white font-semibold text-lg">Payment Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Platform Fee</span>
                      <span className="text-white font-medium">₵{selectedOrder.platform_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm">Agent Fee</span>
                      <span className="text-white font-medium">₵{selectedOrder.agent_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
                      <span className="text-emerald-400 font-semibold">Total Amount</span>
                      <span className="text-white font-bold text-2xl">₵{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all duration-300">
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
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
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