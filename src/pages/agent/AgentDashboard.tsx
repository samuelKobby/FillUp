import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import logo1 from '../../assets/logo1.png'
import { 
  DashboardSquare01Icon,
  UserMultiple02Icon,
  Location01Icon,
  Task01Icon,
  CreditCardIcon,
  FavouriteIcon,
  Settings01Icon,
  ArrowDown01Icon,
  Menu01Icon,
  TrendingUp01Icon,
  TrendingDown01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  FuelStationIcon,
  Home01Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ViewIcon,
  Navigation01Icon,
  Clock01Icon,
  Activity02Icon,
  CallIcon,
  MessageMultiple02Icon,
  Loading03Icon,
  Mail01Icon,
  Cancel01Icon,
  Notification02Icon,
  Wrench01Icon
} from 'hugeicons-react'
import { MapPin, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'
import loaderGif from '../../assets/lodaer.gif'

// Countdown component for timeout display (24 hours from created_at)
const TimeoutCountdown: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const created = new Date(createdAt).getTime()
      const timeoutTime = created + (24 * 60 * 60 * 1000) // 24 hours after creation
      const difference = timeoutTime - now

      if (difference <= 0) {
        setTimeLeft(0)
        setExpired(true)
      } else {
        setTimeLeft(difference)
        setExpired(false)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [createdAt])

  if (expired) {
    return (
      <span className="text-red-400 text-xs flex items-center space-x-1">
        <AlertCircleIcon className="h-3 w-3" />
        <span>Expired</span>
      </span>
    )
  }

  const minutes = Math.floor(timeLeft / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  const isUrgent = minutes < 2
  const colorClass = isUrgent ? 'text-red-400' : 'text-yellow-400'

  return (
    <span className={`${colorClass} text-xs flex items-center space-x-1`}>
      <Clock01Icon className="h-3 w-3" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')} left</span>
    </span>
  )
}

export const AgentDashboard: React.FC = () => {
  const { signOut, userProfile, user, updateProfile } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320) // 80 * 4 = 320px (w-80)
  const [isResizing, setIsResizing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [agentData, setAgentData] = useState<any>(null)
  const [stats, setStats] = useState({
    totalEarnings: 0,
    todayJobs: 0,
    completedJobs: 0,
    rating: 0
  })

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
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [isAvailable, setIsAvailable] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false) // Add sign-out state
  const [hasNewOrders, setHasNewOrders] = useState(false) // Track if new orders are available
  
  // Support form state
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user && !isSigningOut) {
      loadAgentData()
    }
  }, [user?.id, isSigningOut]) // Add isSigningOut dependency

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
  
  useEffect(() => {
    // Set up real-time subscriptions for orders and agent profile
    if (!agentData?.id || isSigningOut) return
    
    // Subscribe to all orders for available orders list
    const allOrdersSubscription = supabase
      .channel('agent-all-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        if (!isSigningOut) {
          refreshAvailableOrders()
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          toast.success('Real-time updates connected!')
        }
      })

    // Subscribe to this agent's assigned orders
    const myOrdersSubscription = supabase
      .channel('agent-my-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `agent_id=eq.${agentData.id}`
      }, (payload) => {
        if (!isSigningOut) {
          refreshData()
        }
      })
      .subscribe()

    // Subscribe to agent profile changes
    const agentProfileSubscription = supabase
      .channel('agent-profile')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'agents',
        filter: `id=eq.${agentData.id}`
      }, (payload) => {
        if (!isSigningOut && payload.new) {
          setAgentData(prev => prev ? { ...prev, ...(payload.new as any) } : null)
        }
      })
      .subscribe()

    // Subscribe to notifications
    const notificationsSubscription = supabase
      .channel('agent-notifications')
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
      supabase.removeChannel(allOrdersSubscription)
      supabase.removeChannel(myOrdersSubscription)
      supabase.removeChannel(agentProfileSubscription)
      supabase.removeChannel(notificationsSubscription)
    }
  }, [agentData?.id, user?.id, isSigningOut])
  
  // Set up two different polling intervals:
  // 1. For available orders (more frequent)
  // 2. For full data refresh (less frequent)
  // Periodic refresh intervals disabled for debugging
  /*
  useEffect(() => {
    if (!agentData?.id || isSigningOut) return
    
    // Check for new available orders every 15 seconds
    const availableOrdersInterval = setInterval(() => {
      if (!isSigningOut) {
        refreshAvailableOrders()
      }
    }, 15000)
    
    // Full data refresh every 45 seconds
    const fullRefreshInterval = setInterval(() => {
      if (!isSigningOut) {
        refreshData()
      }
    }, 45000)
    
    return () => {
      clearInterval(availableOrdersInterval)
      clearInterval(fullRefreshInterval)
    }
  }, [agentData?.id, isSigningOut]) // Add isSigningOut dependency
  */

  // Client-side filtering for expired orders and already assigned orders (less frequent)
  // Disabled for debugging
  /*
  useEffect(() => {
    if (availableOrders.length === 0 || isSigningOut) return
    
    const filterExpiredOrders = () => {
      if (isSigningOut) return // Don't filter if signing out
      
      const currentTime = new Date()
      setAvailableOrders(prevOrders => {
        const filtered = prevOrders.filter(order => {
          // Filter based on:
          // 1. Order is still within 24-hour time window (using created_at)
          // 2. Order isn't assigned to another agent
          // 3. Order has a station assigned
          const orderTime = new Date(order.created_at);
          const isWithinTimeWindow = (currentTime.getTime() - orderTime.getTime()) <= (24 * 60 * 60 * 1000); // 24 hours
          const isAvailableToAccept = order.agent_id === null;
          const hasStation = order.station_id !== null;
          
          return isWithinTimeWindow && isAvailableToAccept && hasStation;
        });
        
        // Only log if orders were actually filtered out
        return filtered
      })
    }

    // Check every 30 seconds for expired orders instead of 5 seconds
    const interval = setInterval(filterExpiredOrders, 30000)
    
    return () => clearInterval(interval)
  }, [availableOrders.length, isSigningOut]) // Add isSigningOut dependency
  */

  // Cleanup effect when signing out - enhanced with navigation prevention
  useEffect(() => {
    if (isSigningOut) {
      // Clear all local state immediately
      setAgentData(null)
      setStats({
        totalEarnings: 0,
        todayJobs: 0,
        completedJobs: 0,
        rating: 0
      })
      setAvailableOrders([])
      setMyOrders([])
      setRefreshing(false)
      
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

  const loadAgentData = async () => {
    if (!user || isSigningOut) return

    try {
      // Get agent profile
      const { data: agentProfile, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (agentError) {
        console.error('Error loading agent profile:', agentError)
        throw agentError
      }
      
      setAgentData(agentProfile)
      setIsAvailable(agentProfile.is_available)

      await refreshData(agentProfile.id)
    } catch (error) {
      console.error('Error loading agent data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Function to refresh only available orders (lighter operation)
  const refreshAvailableOrders = async () => {
    if (!agentData?.id || isSigningOut) return
    
    setRefreshing(true)
    
    try {
      // SIMPLIFIED: Get ALL orders first to see what's in the database
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey(name, phone, email, avatar_url),
          vehicles(make, model, plate_number, fuel_type, image_url),
          stations(name, address, phone, location, image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (allOrdersError) {
        console.error('❌ Error fetching all orders:', allOrdersError)
        throw allOrdersError
      }

      // Filter to show only orders that agents can accept:
      // 1. Status is 'accepted' (confirmed by station, not 'pending')
      // 2. Not assigned to any agent (agent_id is null)
      // 3. Has a station assigned (station_id is not null)
      // 4. Within reasonable time window (not too old)
      const availableForAgents = allOrders?.filter(order => {
        const isAvailableStatus = order.status === 'accepted' // Only station-confirmed orders
        const notAssigned = order.agent_id === null
        const hasStation = order.station_id !== null
        const orderTime = new Date(order.created_at)
        const now = new Date()
        const isRecent = (now.getTime() - orderTime.getTime()) <= (24 * 60 * 60 * 1000) // 24 hours
        
        return isAvailableStatus && notAssigned && hasStation && isRecent
      }) || []
      
      setAvailableOrders(availableForAgents)
      
    } catch (error) {
      console.error('Error refreshing available orders:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const refreshData = async (agentId = agentData?.id) => {
    if (!agentId || isSigningOut) return
    
    setRefreshing(true)
    
    try {
      // Get agent's orders AND all orders for debugging
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey(name, phone, avatar_url),
          vehicles(make, model, plate_number, image_url),
          stations(name, address, phone, location, image_url)
        `)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error loading orders:', ordersError)
        throw ordersError
      }

      // Get available orders - simplified query to show ALL orders
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey(name, phone, email, avatar_url),
          vehicles(make, model, plate_number, image_url),
          stations(name, address, phone, location, image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (availableError) {
        console.error('Error loading available orders:', availableError)
        throw availableError
      }
      
      // Filter available orders to show only those that agents can accept
      const availableForAgents = available?.filter(order => {
        const isAvailableStatus = order.status === 'accepted' // Only station-confirmed orders
        const notAssigned = order.agent_id === null
        const hasStation = order.station_id !== null
        const orderTime = new Date(order.created_at)
        const now = new Date()
        const isRecent = (now.getTime() - orderTime.getTime()) <= (24 * 60 * 60 * 1000) // 24 hours
        
        return isAvailableStatus && notAssigned && hasStation && isRecent
      }) || []
      
      setAvailableOrders(availableForAgents)

      // Set agent's specific orders (orders assigned to this agent)
      const agentOrders = orders?.filter(order => order.agent_id === agentId) || []
      setMyOrders(agentOrders)

      // Calculate stats only if we have agentData
      if (agentData) {
        const today = new Date().toISOString().split('T')[0]
        const todayOrders = agentOrders?.filter(order => order.created_at.startsWith(today)) || []
        const completedOrders = agentOrders?.filter(order => order.status === 'completed') || []
        const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.agent_fee || 0), 0)

        setStats({
          totalEarnings,
          todayJobs: todayOrders.length,
          completedJobs: completedOrders.length,
          rating: agentData.rating || 0
        })
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
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
    
    try {
      // Call the AuthContext signOut method (which handles server + local cleanup)
      await signOut()
      
      // Clear all component-specific state immediately
      setAgentData(null)
      setAvailableOrders([])
      setMyOrders([])
      setStats({
        totalEarnings: 0,
        todayJobs: 0,
        completedJobs: 0,
        rating: 0
      })
      setCurrentPage('dashboard')
      setHasNewOrders(false)
      
      // Force immediate navigation
      window.location.replace('/auth/login')
      
    } catch (error) {
      console.error('❌ Sign out error:', error)
      
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

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // In a real app, this would submit to your support system
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Support request submitted successfully! We\'ll get back to you within 24 hours.')
      setSupportForm({ subject: '', message: '', priority: 'medium' })
    } catch (error) {
      alert('Failed to submit support request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAvailability = async () => {
    if (!agentData) return

    try {
      const newStatus = !isAvailable
      const { error } = await supabase
        .from('agents')
        .update({ is_available: newStatus })
        .eq('id', agentData.id)

      if (error) {
        console.error('Error updating availability:', error)
        throw error
      }
      setIsAvailable(newStatus)
    } catch (error) {
      console.error('Error updating availability:', error)
      alert('Failed to update availability. Please try again.')
    }
  }

  const acceptOrder = async (orderId: string) => {
    if (!agentData) {
      console.error('❌ No agent data available')
      alert('Agent data not loaded. Please refresh the page.')
      return
    }

    try {
      // First check if the order is still available (not assigned to another agent)
      const { data: currentOrder, error: checkError } = await supabase
        .from('orders')
        .select('agent_id, status')
        .eq('id', orderId)
        .single()
        
      if (checkError) {
        console.error('❌ Error checking order:', checkError)
        alert('Failed to check order status. Please try again.')
        return
      }
        
      if (!currentOrder) {
        console.error('❌ Order not found')
        alert('This order is no longer available')
        return
      }
      
      if (currentOrder.agent_id !== null) {
        alert('This order has already been assigned to another agent')
        refreshData() // Refresh to get updated data
        return
      }
      
      // Now try to update the order - simplified query without the double filter
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, agent_id, status')
        .eq('id', orderId)
        .single()
      
      if (verifyError || !verifyOrder) {
        console.error('❌ Order not found during verification:', verifyError)
        alert('Order not found. It may have been removed or assigned to another agent.')
        refreshData()
        return
      }
      
      if (verifyOrder.agent_id !== null) {
        alert('This order has already been assigned to another agent during verification')
        refreshData()
        return
      }
      
      // Now attempt the update with additional conditions for safety
      const { data: updateResult, error } = await supabase
        .from('orders')
        .update({ 
          agent_id: agentData.id,
          status: 'in_progress',
          accepted_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select() // Return the updated record

      // Additional check - let's see if the order changed at all
      if (updateResult && updateResult.length > 0) {
        // Success - order was updated
      } else {
        // Update failed - check order state
        const { data: postUpdateCheck, error: postUpdateError } = await supabase
          .from('orders')
          .select('id, agent_id, status, updated_at')
          .eq('id', orderId)
          .single()
        
        if (postUpdateCheck && postUpdateCheck.agent_id !== null) {
          alert('This order was just assigned to another agent. Please try a different order.')
          refreshData()
          return
        } else {
          // Try a simple update to see if we have write permissions
          const { data: testUpdate, error: testError } = await supabase
            .from('orders')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select()
          
          if (testError) {
            alert(`Database permission error: ${testError.message}`)
            return
          } else if (!testUpdate || testUpdate.length === 0) {
            const { data: currentUser } = await supabase.auth.getUser()
            alert('Database update blocked - this might be a Row Level Security policy issue. Check your database permissions.')
            return
          }
        }
      }

      if (error) {
        console.error('❌ Error accepting order:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        alert(`Failed to accept order: ${error.message}`)
        return
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ No rows were updated')
        alert('Failed to accept order - no changes made')
        return
      }
      
      // Show success message
      alert('Order accepted successfully! You can view it in "My Jobs".')
      
      // Close modal if open
      setShowOrderModal(false)
      setSelectedOrderDetails(null)
      
      // Instead of full refresh, just update local state
      setAvailableOrders(prev => {
        const filtered = prev.filter(order => order.id !== orderId)
        return filtered
      })
      
      // Add to my orders with updated status
      const acceptedOrder = availableOrders.find(order => order.id === orderId)
      if (acceptedOrder) {
        const updatedOrder = {
          ...acceptedOrder,
          agent_id: agentData.id,
          status: 'in_progress',
          accepted_at: new Date().toISOString()
        }
        setMyOrders(prev => [updatedOrder, ...prev])
      }
      
      // Minimal refresh after 2 seconds to ensure consistency
      setTimeout(() => {
        refreshData()
      }, 2000)
    } catch (error) {
      console.error('Error accepting order:', error)
      alert('Failed to accept order. Please try again.')
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updateData: any = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()

      if (error) {
        console.error('❌ Error updating order status:', error)
        throw error
      }
      
      // Update local state immediately instead of full refresh
      setMyOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }
          : order
      ))
      
      // Show success message
      if (status === 'completed') {
        alert('🎉 Job completed successfully! Payment will be processed.')
      }
      
      // Light refresh after 2 seconds for consistency
      setTimeout(() => {
        refreshData()
      }, 2000)
    } catch (error) {
      console.error('❌ Error updating order status:', error)
      alert('Failed to update order status. Please try again.')
    }
  }

  const viewOrderDetails = (order: any) => {
    setSelectedOrderDetails(order)
    setShowOrderModal(true)
  }

  const startDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Update local state
      setMyOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'in_progress', started_at: new Date().toISOString() }
          : order
      ))

      alert('Delivery started! Navigate to the customer location.')
    } catch (error) {
      console.error('Error starting delivery:', error)
      alert('Failed to start delivery. Please try again.')
    }
  }

  const completeDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Update local state
      setMyOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'completed', completed_at: new Date().toISOString() }
          : order
      ))

      alert('Delivery completed successfully! Payment will be processed.')
      setShowOrderModal(false)
      setSelectedOrderDetails(null)
    } catch (error) {
      console.error('Error completing delivery:', error)
      alert('Failed to complete delivery. Please try again.')
    }
  }

  const callCustomer = (phoneNumber: string) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`
    } else {
      alert('Customer phone number not available')
    }
  }

  const openMaps = (address: string, coordinates?: { lat: number; lng: number }) => {
    if (address || coordinates) {
      let encodedDestination: string
      
      // Use coordinates if available (more accurate), otherwise use address
      if (coordinates) {
        encodedDestination = `${coordinates.lat},${coordinates.lng}`
      } else {
        encodedDestination = encodeURIComponent(address)
      }
      
      // Check platform
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isIOS) {
        // Use Apple Maps for iOS
        if (coordinates) {
          window.location.href = `http://maps.apple.com/?daddr=${coordinates.lat},${coordinates.lng}`
        } else {
          window.location.href = `http://maps.apple.com/?daddr=${encodedDestination}`
        }
      } else if (isAndroid) {
        // For Android, use Google Maps web URL
        if (coordinates) {
          const googleMapsUrl = `https://maps.google.com/maps?daddr=${coordinates.lat},${coordinates.lng}&dirflg=d`
          window.location.href = googleMapsUrl
        } else {
          const googleMapsUrl = `https://maps.google.com/maps?daddr=${encodedDestination}&dirflg=d`
          window.location.href = googleMapsUrl
        }
      } else if (isMobile) {
        // For other mobile devices, use standard Google Maps
        const googleMapsUrl = coordinates 
          ? `https://maps.google.com/maps?daddr=${coordinates.lat},${coordinates.lng}&dirflg=d`
          : `https://maps.google.com/maps?daddr=${encodedDestination}&dirflg=d`
        window.location.href = googleMapsUrl
      } else {
        // For desktop, offer more options
        const options = coordinates 
          ? [
              { name: 'Google Maps', url: `https://maps.google.com/maps?daddr=${coordinates.lat},${coordinates.lng}&dirflg=d` },
              { name: 'Waze', url: `https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}` },
              { name: 'Bing Maps', url: `https://www.bing.com/maps?rtp=~pos.${coordinates.lat}_${coordinates.lng}` }
            ]
          : [
              { name: 'Google Maps', url: `https://maps.google.com/maps?daddr=${encodedDestination}&dirflg=d` },
              { name: 'Waze', url: `https://waze.com/ul?q=${encodedDestination}` },
              { name: 'Bing Maps', url: `https://www.bing.com/maps?rtp=~pos.${encodedDestination}` }
            ]
        
        // Show selection dialog
        const choice = prompt(
          'Choose navigation service:\n' +
          '1 - Google Maps\n' +
          '2 - Waze\n' +
          '3 - Bing Maps\n' +
          'Enter 1, 2, or 3:'
        )
        
        const selectedIndex = parseInt(choice || '1') - 1
        const selectedOption = options[selectedIndex] || options[0]
        
        window.location.href = selectedOption.url
      }
    } else {
      alert('Delivery address not available')
    }
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardSquare01Icon },
    { id: 'available', label: 'Available Jobs', icon: Task01Icon },
    { id: 'my-jobs', label: 'My Jobs', icon: UserMultiple02Icon },
    { id: 'earnings', label: 'Earnings', icon: CreditCardIcon },
    { id: 'profile', label: 'Profile', icon: Settings01Icon },
    { id: 'support', label: 'Support', icon: MessageMultiple02Icon }
  ]

  const statsData = [
    {
      title: 'Total Earnings',
      value: `₵${stats.totalEarnings.toLocaleString()}`,
      change: '+15.3%',
      trend: 'up',
      icon: CreditCardIcon,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Jobs Today',
      value: stats.todayJobs.toString(),
      change: '+2',
      trend: 'up',
      icon: Task01Icon,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Completed Jobs',
      value: stats.completedJobs.toString(),
      change: '+8.1%',
      trend: 'up',
      icon: CheckmarkCircle02Icon,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Rating',
      value: stats.rating.toFixed(1),
      change: '+0.2',
      trend: 'up',
      icon: FavouriteIcon,
      color: 'from-yellow-500 to-yellow-600'
    }
  ]

  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        case 'accepted': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
        case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      }
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(status)} capitalize`}>
        {status.replace('_', ' ')}
      </span>
    )
  }
  
  const renderAvailableJobsPage = () => {
    return (
      <div className="min-h-screen bg-gray-900 pb-32">
        {/* Profile Header Bar */}
        <div className="bg-gray-900 px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-700">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lime-400 to-lime-500 text-gray-900 text-lg font-bold">
                  {userProfile?.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Available Jobs</p>
              <h3 className="text-base font-semibold text-white">{availableOrders.length} New Orders</h3>
            </div>
          </div>
          <button 
            onClick={() => refreshAvailableOrders()}
            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"
          >
            <Loading03Icon className={`h-5 w-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Job Cards */}
        <div className="px-4 space-y-3">
          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center mt-4">
              <Task01Icon size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No available jobs at the moment</p>
              <p className="text-xs text-gray-400 mt-1">Jobs will appear here when customers place orders</p>
            </div>
          ) : (
            availableOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                    {order.service_type === 'fuel_delivery' && order.vehicles?.image_url ? (
                      <img 
                        src={order.vehicles.image_url} 
                        alt={`${order.vehicles.make} ${order.vehicles.model}`}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : order.stations?.image_url ? (
                      <img 
                        src={order.stations.image_url} 
                        alt={order.stations.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        {order.service_type === 'fuel_delivery' ? (
                          <FuelStationIcon size={24} className="text-gray-600" />
                        ) : (
                          <Wrench01Icon size={24} className="text-gray-600" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {order.service_type === 'fuel_delivery' ? 'Fuel Delivery Order' : 'Mechanic Service'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {order.users?.name || 'Customer'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Location01Icon size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">
                            {order.delivery_address.length > 30 
                              ? order.delivery_address.substring(0, 30) + '...' 
                              : order.delivery_address}
                          </span>
                        </div>
                        {order.service_type === 'fuel_delivery' && (
                          <p className="text-xs text-blue-600 mt-1">
                            {order.fuel_quantity}L {order.fuel_type}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-lime-400 px-3 py-2 rounded-xl text-center ml-2 flex-shrink-0">
                        <div className="text-xs font-medium text-gray-900">
                          ₵{order.agent_fee?.toFixed(0) || '0'}
                        </div>
                        <div className="text-[10px] text-gray-700">Fee</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="flex-1 bg-gray-900 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors"
                      >
                        Accept Order
                      </button>
                      <button 
                        onClick={() => viewOrderDetails(order)}
                        className="bg-blue-500 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-blue-600 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }
  
  const renderMyJobsPage = () => {
    const activeJobs = myOrders.filter(o => o.agent_id === agentData?.id && ['accepted', 'in_progress'].includes(o.status))
    const completedJobs = myOrders.filter(o => o.status === 'completed')
    
    return (
      <div className="min-h-screen bg-gray-900 pb-32">
        {/* Profile Header Bar */}
        <div className="bg-gray-900 px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-700">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lime-400 to-lime-500 text-gray-900 text-lg font-bold">
                  {userProfile?.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">My Jobs</p>
              <h3 className="text-base font-semibold text-white">{activeJobs.length} Active Jobs</h3>
            </div>
          </div>
          <button 
            onClick={() => refreshData()}
            className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"
          >
            <Loading03Icon className={`h-5 w-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Active Jobs Section */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Active Jobs</h3>
            <span className="bg-lime-400 text-gray-900 px-3 py-1 rounded-full text-xs font-semibold">
              {activeJobs.length}
            </span>
          </div>

          <div className="space-y-3">
            {activeJobs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <UserMultiple02Icon size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No active jobs</p>
                <p className="text-xs text-gray-400 mt-1">Check available jobs to accept new work</p>
              </div>
            ) : (
              activeJobs.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                      {order.service_type === 'fuel_delivery' && order.vehicles?.image_url ? (
                        <img 
                          src={order.vehicles.image_url} 
                          alt={`${order.vehicles.make} ${order.vehicles.model}`}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : order.stations?.image_url ? (
                        <img 
                          src={order.stations.image_url} 
                          alt={order.stations.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-100">
                          {order.service_type === 'fuel_delivery' ? (
                            <FuelStationIcon size={24} className="text-blue-600" />
                          ) : (
                            <Wrench01Icon size={24} className="text-blue-600" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 text-sm">
                              {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              order.status === 'in_progress' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status === 'in_progress' ? 'In Progress' : 'Accepted'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {order.users?.name || 'Customer'}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-500 truncate">
                              {order.delivery_address.length > 30 
                                ? order.delivery_address.substring(0, 30) + '...' 
                                : order.delivery_address}
                            </span>
                          </div>
                          {order.service_type === 'fuel_delivery' && (
                            <p className="text-xs text-blue-600 mt-1">
                              {order.fuel_quantity}L {order.fuel_type}
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-lime-400 px-3 py-2 rounded-xl text-center ml-2 flex-shrink-0">
                          <div className="text-xs font-medium text-gray-900">
                            ₵{order.agent_fee?.toFixed(0) || '0'}
                          </div>
                          <div className="text-[10px] text-gray-700">Fee</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === 'accepted' ? (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'in_progress')}
                            className="flex-1 bg-blue-500 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-blue-600 transition-colors"
                          >
                            Start Job
                          </button>
                        ) : (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="flex-1 bg-green-500 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-green-600 transition-colors"
                          >
                            Complete Job
                          </button>
                        )}
                        <button 
                          onClick={() => viewOrderDetails(order)}
                          className="bg-gray-900 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Jobs Section */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Completed Jobs</h3>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
              {completedJobs.length}
            </span>
          </div>

          <div className="space-y-3">
            {completedJobs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <CheckmarkCircle02Icon size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No completed jobs yet</p>
              </div>
            ) : (
              completedJobs.slice(0, 5).map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                      {order.service_type === 'fuel_delivery' && order.vehicles?.image_url ? (
                        <img 
                          src={order.vehicles.image_url} 
                          alt={`${order.vehicles.make} ${order.vehicles.model}`}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : order.stations?.image_url ? (
                        <img 
                          src={order.stations.image_url} 
                          alt={order.stations.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-green-100">
                          {order.service_type === 'fuel_delivery' ? (
                            <FuelStationIcon size={24} className="text-green-600" />
                          ) : (
                            <Wrench01Icon size={24} className="text-green-600" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 text-sm">
                              {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
                            </h4>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              Completed
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {order.users?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(order.completed_at || order.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-base font-bold text-gray-900">
                            ₵{order.agent_fee?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-[10px] text-gray-500">Earned</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderEarningsPage = () => {
    // Calculate earnings data from completed orders
    const completedOrders = myOrders.filter(order => order.status === 'completed')
    
    const today = new Date()
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const todayEarnings = completedOrders
      .filter(order => new Date(order.completed_at || order.updated_at).toDateString() === today.toDateString())
      .reduce((sum, order) => sum + (order.agent_fee || 0), 0)
    
    const weekEarnings = completedOrders
      .filter(order => new Date(order.completed_at || order.updated_at) >= thisWeek)
      .reduce((sum, order) => sum + (order.agent_fee || 0), 0)
    
    const monthEarnings = completedOrders
      .filter(order => new Date(order.completed_at || order.updated_at) >= thisMonth)
      .reduce((sum, order) => sum + (order.agent_fee || 0), 0)
    
    const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.agent_fee || 0), 0)
    
    // Group earnings by date for chart
    const earningsHistory = completedOrders.reduce((acc, order) => {
      const date = new Date(order.completed_at || order.updated_at).toDateString()
      acc[date] = (acc[date] || 0) + (order.agent_fee || 0)
      return acc
    }, {} as Record<string, number>)
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: date.toDateString(),
        amount: earningsHistory[date.toDateString()] || 0
      }
    }).reverse()

    const maxAmount = Math.max(...last7Days.map(d => d.amount), 1)

    return (
      <div className="min-h-screen bg-gray-900">
        {/* Dark Header with Total Earnings */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-6 pt-8 pb-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-white">My Earnings</h2>
            <div className="flex gap-3">
              <button className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                <Notification02Icon size={20} className="text-white" />
              </button>
              <button className="w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center">
                <Settings01Icon size={20} className="text-gray-900" />
              </button>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-lime-400 mb-2">
              ₵{totalEarnings.toFixed(2)}
            </div>
            <p className="text-gray-400 text-sm">
              Cash out with Mtn or At pay
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-pink-50 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-1">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock01Icon size={20} className="text-pink-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-pink-500">
                    {(() => {
                      // Calculate total hours from completed orders
                      // Estimate 1 hour per delivery on average
                      const totalHours = completedOrders.length
                      return totalHours
                    })()}
                  </div>
                  <div className="text-xs text-gray-600">Hours</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Time Spent</p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-1">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FuelStationIcon size={20} className="text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">{completedOrders.length}</div>
                  <div className="text-xs text-gray-600">Deliveries</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Total Deliveries</p>
            </div>
          </div>
        </div>

        {/* White Content Section */}
        <div className="bg-white rounded-t-[32px] -mt-4 relative z-10 px-6 pt-8 pb-32">
          {/* Average Earnings */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Average Earnings</h3>
              <p className="text-sm text-gray-500 mt-1">Weekly</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                ₵{(weekEarnings || 340).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="mb-8">
            <div className="flex items-end justify-between h-56 gap-2">
              {last7Days.map((day, index) => {
                const heightPercent = (day.amount / maxAmount) * 100
                const isToday = day.fullDate === today.toDateString()
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col justify-end mb-3" style={{ height: '180px' }}>
                      <div className="text-center mb-2">
                        <div className="text-xs font-semibold text-gray-900">
                          ₵{day.amount.toFixed(0)}
                        </div>
                      </div>
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday ? 'bg-lime-400' : 'bg-gray-900'
                        }`}
                        style={{ 
                          height: `${Math.max(heightPercent, day.amount > 0 ? 10 : 4)}%`,
                          minHeight: day.amount > 0 ? '20px' : '8px'
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 font-medium">{day.date}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Success Orders */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Success Orders</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                All delivery orders and mechanical services to track from here. All delivery from order are here. Track here.
              </p>
            </div>
            
            {/* Recent Transactions */}
            <div className="space-y-3 pt-2">
              {completedOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {order.service_type === 'fuel_delivery' ? (
                        <FuelStationIcon size={22} className="text-green-600" />
                      ) : (
                        <Wrench01Icon size={22} className="text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.completed_at || order.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    ₵{(order.agent_fee || 0).toFixed(2)}
                  </div>
                </div>
              ))}
              
              {completedOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <CreditCardIcon size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium">No earnings yet</p>
                  <p className="text-xs mt-1">Complete your first job to start earning!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSupportPage = () => {
    const faqItems = [
      {
        question: "How do I get paid?",
        answer: "Payments are processed automatically after job completion. Earnings are transferred to your registered payment method within 1-2 business days."
      },
      {
        question: "What if a customer cancels an order?",
        answer: "If a customer cancels after you've accepted the job, you may still receive a cancellation fee. Contact support for specific cases."
      },
      {
        question: "How do I update my availability?",
        answer: "Use the availability toggle on your dashboard. When offline, you won't receive new job requests."
      },
      {
        question: "What should I do if I encounter issues during a job?",
        answer: "Contact customer support immediately through this page or call our emergency hotline. We're available 24/7 to assist you."
      },
      {
        question: "How are delivery routes optimized?",
        answer: "Our system uses GPS and traffic data to suggest the most efficient routes. You can also use your preferred navigation app."
      }
    ]

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">Support</h2>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
              24/7 Available
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <button className="card-mobile md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl p-4 text-center hover:bg-white/15 transition-all">
            <CallIcon size={24} className="mx-auto mb-2 text-blue-400" />
            <div className="text-sm font-medium text-white">Emergency</div>
            <div className="text-xs text-gray-300">24/7 Hotline</div>
          </button>
          <button className="card-mobile md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl p-4 text-center hover:bg-white/15 transition-all">
            <MessageSquare size={24} className="mx-auto mb-2 text-green-400" />
            <div className="text-sm font-medium text-white">Live Chat</div>
            <div className="text-xs text-gray-300">Instant Help</div>
          </button>
          <button className="card-mobile md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl p-4 text-center hover:bg-white/15 transition-all">
            <Mail01Icon size={24} className="mx-auto mb-2 text-purple-400" />
            <div className="text-sm font-medium text-white">Email</div>
            <div className="text-xs text-gray-300">Written Support</div>
          </button>
        </div>

        {/* Support Form */}
        <div className="card-mobile md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Submit Support Request</h3>
          <form onSubmit={handleSupportSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
              <input
                type="text"
                value={supportForm.subject}
                onChange={(e) => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of your issue"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                value={supportForm.priority}
                onChange={(e) => setSupportForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                value={supportForm.message}
                onChange={(e) => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Please describe your issue in detail..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <ArrowRight02Icon size={16} />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="card-mobile md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqItems.map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                  <span className="text-sm font-medium text-white">{faq.question}</span>
                  <ArrowDown01Icon size={16} className="text-gray-400 group-open:transform group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 px-3 py-2 text-sm text-gray-300 bg-white/5 rounded-lg">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="card-mobile md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CallIcon size={16} className="text-blue-400" />
              <div>
                <div className="text-sm font-medium text-white">Emergency Hotline</div>
                <div className="text-sm text-gray-300">+233 (0) 123 456 789</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail01Icon size={16} className="text-green-400" />
              <div>
                <div className="text-sm font-medium text-white">Email Support</div>
                <div className="text-sm text-gray-300">agent-support@fillup.com</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock01Icon size={16} className="text-purple-400" />
              <div>
                <div className="text-sm font-medium text-white">Business Hours</div>
                <div className="text-sm text-gray-300">24/7 Support Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    // Show order details as a full screen page
    if (selectedOrderDetails) {
      return renderOrderDetailsPage()
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="min-h-screen bg-gray-900 pb-32">
            {/* Profile Header Bar */}
            <div className="bg-gray-900 px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-700">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lime-400 to-lime-500 text-gray-900 text-lg font-bold">
                      {userProfile?.name?.charAt(0) || 'A'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Hi, Good morning</p>
                  <h3 className="text-base font-semibold text-white">{userProfile?.name || 'Matthew'}</h3>
                </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
            <Notification02Icon size={20} className="text-white" />
          </button>
        </div>            {/* Dark Header Card with Earnings */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 mx-4 mt-4 mb-6 rounded-3xl p-6 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 rounded-full -mr-16 -mt-16"></div>
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400">Open for service orders</p>
                  <h3 className="text-sm font-semibold text-white mb-2">Delivery Status</h3>
                </div>
                
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    toggleAvailability()
                  }}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-lime-400' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                      isAvailable ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-xs text-gray-400 mb-1">Today's Earning</p>
                <h2 className="text-4xl font-bold text-lime-400 mb-1">
                  ₵{(() => {
                    const today = new Date()
                    const todayEarnings = myOrders
                      .filter(order => 
                        order.status === 'completed' && 
                        new Date(order.completed_at || order.updated_at).toDateString() === today.toDateString()
                      )
                      .reduce((sum, order) => sum + (order.agent_fee || 0), 0)
                    return todayEarnings.toFixed(2)
                  })()}
                </h2>
                <p className="text-xs text-gray-300">{userProfile?.name || 'Sam Curren'}</p>
              </div>
            </div>

            {/* Stats Chart Cards */}
            <div className="px-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {/* Earnings Chart Card - Red/Down */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 border border-gray-700/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">EARNINGS</p>
                      <p className="text-[10px] text-gray-500">Total</p>
                    </div>
                    <div className="w-6 h-6 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-xs">💵</span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="text-2xl font-bold text-white">
                      ₵{(() => {
                        const totalEarnings = myOrders
                          .filter(order => order.status === 'completed')
                          .reduce((sum, order) => sum + (order.agent_fee || 0), 0)
                        return totalEarnings.toFixed(2)
                      })()}
                    </h3>
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <span>↓</span> 5.39%
                    </p>
                  </div>

                  {/* Mini Chart - Red */}
                  <div className="h-12 flex items-end gap-0.5">
                    {[20, 35, 25, 45, 30, 50, 35, 40, 30, 45, 35, 30, 40, 35, 45, 40, 35, 30, 35, 40].map((height, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-red-500/40 rounded-t-sm"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Jobs Chart Card - Green/Up */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 border border-gray-700/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">JOBS</p>
                      <p className="text-[10px] text-gray-500">Completed</p>
                    </div>
                    <div className="w-6 h-6 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="text-2xl font-bold text-white">
                      {myOrders.filter(o => o.status === 'completed').length}
                    </h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span>↑</span> 3.42%
                    </p>
                  </div>

                  {/* Mini Chart - Green */}
                  <div className="h-12 flex items-end gap-0.5">
                    {[30, 25, 35, 30, 40, 35, 30, 35, 40, 45, 40, 50, 45, 50, 55, 50, 45, 50, 55, 50].map((height, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-green-500/40 rounded-t-sm"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Your New Jobs Section */}
            <div className="px-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Your New Jobs</h3>
                <button className="text-xs text-lime-400">See more</button>
              </div>

              {/* Job Cards */}
              <div className="space-y-3">
                {availableOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                        {order.service_type === 'fuel_delivery' && order.vehicles?.image_url ? (
                          <img 
                            src={order.vehicles.image_url} 
                            alt={`${order.vehicles.make} ${order.vehicles.model}`}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : order.stations?.image_url ? (
                          <img 
                            src={order.stations.image_url} 
                            alt={order.stations.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            {order.service_type === 'fuel_delivery' ? (
                              <FuelStationIcon size={24} className="text-gray-600" />
                            ) : (
                              <Wrench01Icon size={24} className="text-gray-600" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">
                              {order.service_type === 'fuel_delivery' ? 'King Of Burger' : 'Garden Homes'}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {order.service_type === 'fuel_delivery' ? 'Burger, Pizzas, Chicken' : 'Garden at Manhattan Square'}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Location01Icon size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-500 truncate">
                                {order.delivery_address.length > 30 
                                  ? order.delivery_address.substring(0, 30) + '...' 
                                  : order.delivery_address}
                              </span>
                            </div>
                          </div>
                          
                          <div className="bg-lime-400 px-3 py-2 rounded-xl text-center ml-2 flex-shrink-0">
                            <div className="text-xs font-medium text-gray-900">
                              ₵{order.total_amount.toFixed(0)}
                            </div>
                            <div className="text-[10px] text-gray-700">KM</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => acceptOrder(order.id)}
                            className="flex-1 bg-gray-900 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors"
                          >
                            Accept Order
                          </button>
                          <button className="bg-pink-500 text-white py-2.5 px-4 rounded-xl text-xs font-medium hover:bg-pink-600 transition-colors">
                            REJECT
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {availableOrders.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center">
                    <Task01Icon size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">No available jobs at the moment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
        
      case 'available':
        return renderAvailableJobsPage()
        
      case 'my-jobs':
        return renderMyJobsPage()

      case 'earnings':
        return renderEarningsPage()

      case 'support':
        return renderSupportPage()

      case 'profile':
        return (
          <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="px-4 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">My profile</h2>
              <div className="flex items-center gap-4">
                <button className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <Activity02Icon size={18} className="text-white" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white">5</span>
                </button>
                <button 
                  onClick={() => {
                    setEditForm({
                      name: userProfile?.name || '',
                      phone: userProfile?.phone || '',
                      email: userProfile?.email || ''
                    })
                    setShowEditProfile(true)
                  }}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
                >
                  <Settings01Icon size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="flex justify-center mt-4">
              <div className="relative">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile.name || 'Agent'} 
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-3xl font-bold text-white border-4 border-blue-500">
                    {userProfile?.name?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
            </div>

            {/* Name and Badge */}
            <div className="text-center mt-4">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-xl font-bold text-white">{userProfile?.name || 'Agent'}</h3>
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {agentData?.service_type?.replace('_', ' ') || 'Service Provider'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-2 mt-4 px-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{stats.completedJobs}</p>
                <p className="text-xs text-gray-400">Jobs Done</p>
              </div>
              <div className="text-gray-600 mx-2">•</div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  ⭐ {agentData?.rating?.toFixed(1) || '5.0'}
                </p>
                <p className="text-xs text-gray-400">Rating</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 mt-6 px-4">
              <button 
                onClick={toggleAvailability}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isAvailable 
                    ? 'bg-lime-400 text-gray-900'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Activity02Icon size={16} />
                  {isAvailable ? 'Online' : 'Go Online'}
                </div>
              </button>
              <button className="px-4 py-2.5 rounded-xl border border-gray-700 text-white font-semibold text-sm flex items-center gap-2">
                <FavouriteIcon size={16} />
                Jobs
              </button>
              <button className="px-4 py-2.5 rounded-xl border border-gray-700 text-white font-semibold text-sm flex items-center gap-2">
                <CreditCardIcon size={16} />
                Earnings
              </button>
            </div>

            {/* Profile Details */}
            <div className="mt-8 px-4 space-y-2">
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <UserMultiple02Icon size={20} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Recent Activity</p>
                    <p className="text-white font-medium">{stats.todayJobs} jobs today</p>
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className="space-y-3">
                  {myOrders.slice(0, 3).map((order, index) => (
                    <div key={order.id} className="bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-600 rounded-lg overflow-hidden">
                          {order.service_type === 'fuel_delivery' && order.vehicles?.image_url ? (
                            <img 
                              src={order.vehicles.image_url} 
                              alt={`${order.vehicles.make} ${order.vehicles.model}`}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : order.stations?.image_url ? (
                            <img 
                              src={order.stations.image_url} 
                              alt={order.stations.name}
                              className="w-full h-full object-cover"
                            />
                          ) : order.service_type === 'fuel_delivery' ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <FuelStationIcon size={20} className="text-blue-400" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Wrench01Icon size={20} className="text-orange-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
                          </p>
                          <p className="text-gray-400 text-xs">
                            ₵{order.total_amount?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to sign out?')) {
                    handleSignOut()
                  }
                }}
                disabled={isSigningOut}
                className={`w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all ${
                  isSigningOut ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSigningOut ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                    <span className="font-medium">Signing Out...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight02Icon size={20} />
                    <span className="font-medium">Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )

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
      console.log('🧹 Clearing all local storage and session data')
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ef1b22' }}>
        {/* Clear & Refresh Button - Top Right */}
        <button
          onClick={handleClearAll}
          className="absolute top-6 right-6 p-3 text-white hover:text-white/80 transition-all duration-300 hover:scale-110 z-20"
          title="Clear All Data & Refresh"
        >
          <RefreshCw className="h-6 w-6" />
        </button>
        
        <div className="text-center relative">
          <img 
            src={loaderGif} 
            alt="Loading..."
            className="w-48 h-48 mx-auto object-contain"
          />
          <p className="mt-4 text-xl font-medium text-white">Just a moment while we load your dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is null (signed out) or actively signing out
  if (!user || isSigningOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {isSigningOut ? 'Signing out...' : 'Redirecting...'}
          </h2>
          <p className="text-gray-300">
            {isSigningOut ? 'Please wait while we sign you out securely.' : 'Taking you to the login page.'}
          </p>
        </div>
      </div>
    )
  }

  // Order Details Page Component 
  const renderOrderDetailsPage = () => {
    if (!selectedOrderDetails) return null

    const order = selectedOrderDetails
    const isMyOrder = order.agent_id === agentData?.id
    const canStart = isMyOrder && order.status === 'accepted'
    const inProgress = isMyOrder && order.status === 'in_progress'

    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-gray-800 sticky top-0 z-10 border-b border-gray-700">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setSelectedOrderDetails(null)
                }}
                className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
              >
                <ArrowRight02Icon size={20} className="text-white rotate-180" />
              </button>
              <h2 className="text-lg font-bold text-white">Order Details</h2>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)', paddingBottom: '20px' }}>
          <div className="px-4">
            {/* Service Details Card with Customer Overlay on Vehicle */}
            <div className="bg-gray-800 rounded-xl p-4 mt-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                {order.service_type === 'fuel_delivery' ? 'Fuel Details' : 'Service Details'}
              </h3>
              
              <div className="flex gap-3">
                {/* Vehicle Image with Customer Overlay - Now Circular */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  {/* Main circular image container */}
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700">
                    {order.vehicles?.image_url ? (
                      <img 
                        src={order.vehicles.image_url} 
                        alt={`${order.vehicles.make} ${order.vehicles.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-700"><svg width="28" height="28" fill="none" stroke="currentColor" class="text-gray-500"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg></div>`
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {order.service_type === 'fuel_delivery' ? (
                          <FuelStationIcon size={28} className="text-gray-500" />
                        ) : (
                          <Wrench01Icon size={28} className="text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Customer Avatar Overlay - positioned outside the main circle */}
                  {order.users && (
                    <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full border-3 border-gray-900 overflow-hidden bg-green-500 shadow-lg">
                      {order.users.avatar_url ? (
                        <img 
                          src={order.users.avatar_url} 
                          alt={order.users.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-sm font-semibold">${order.users.name?.charAt(0) || 'C'}</div>`
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold">
                          {order.users.name?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Info */}
                <div className="flex-1">
                  <h4 className="font-semibold text-white">
                    {order.service_type === 'fuel_delivery' 
                      ? `${order.fuel_quantity}L ${order.fuel_type?.toUpperCase() || 'Fuel'}`
                      : order.mechanic_service?.replace('_', ' ')?.toUpperCase() || 'Mechanic Service'
                    }
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    {order.vehicles 
                      ? `${order.vehicles.make} ${order.vehicles.model} • ${order.vehicles.plate_number}`
                      : order.users?.name || 'Customer'
                    }
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white">₵{order.total_amount?.toFixed(2)}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">
                      Fee: ₵{order.agent_fee?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup Location with Station Image */}
            {order.stations && (
              <div className="bg-gray-800 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  {/* Station Image */}
                  {order.stations.image_url ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      <img 
                        src={order.stations.image_url} 
                        alt={order.stations.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-green-500/20"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-green-400"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path></svg></div>`
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <FuelStationIcon size={20} className="text-green-400" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Pickup Location</p>
                    <p className="text-sm font-semibold text-white">{order.stations.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.stations.address}</p>
                  </div>
                  <button
                    onClick={() => {
                      const coordinates = order.stations.location?.coordinates ? {
                        lat: order.stations.location.coordinates[1],
                        lng: order.stations.location.coordinates[0]
                      } : undefined
                      openMaps(order.stations.address, coordinates)
                    }}
                    className="text-green-400 text-xs font-medium flex items-center gap-1"
                  >
                    <Navigation01Icon size={14} />
                    12.5 Km
                  </button>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="bg-gray-800 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Location01Icon size={16} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Delivery Address</p>
                  <p className="text-sm font-medium text-white">{order.delivery_address || 'Address not provided'}</p>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mt-4">
              <div className="w-full h-48 bg-gray-800 rounded-2xl overflow-hidden relative">
                {/* Simple map placeholder with route visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 300 200" preserveAspectRatio="none">
                    {/* Background pattern */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="300" height="200" fill="url(#grid)"/>
                    
                    {/* Route path */}
                    <path
                      d="M 60 160 Q 80 120, 120 100 T 240 40"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                      fill="none"
                      opacity="0.6"
                    />
                  </svg>
                  
                  {/* Pickup marker */}
                  <div className="absolute" style={{ bottom: '20px', left: '60px' }}>
                    <div className="w-10 h-10 bg-green-500 rounded-full shadow-lg flex items-center justify-center">
                      <FuelStationIcon size={20} className="text-white" />
                    </div>
                  </div>
                  
                  {/* Delivery markers */}
                  <div className="absolute" style={{ top: '40px', right: '60px' }}>
                    <div className="w-10 h-10 bg-red-500 rounded-full shadow-lg flex items-center justify-center border-4 border-gray-800">
                      <Location01Icon size={20} className="text-white" />
                    </div>
                  </div>
                  
                  {/* Additional location markers */}
                  <div className="absolute" style={{ top: '100px', left: '120px' }}>
                    <div className="w-8 h-8 bg-red-500 rounded-full shadow-md flex items-center justify-center border-3 border-gray-800">
                      <Location01Icon size={16} className="text-white" />
                    </div>
                  </div>
                  
                  <div className="absolute" style={{ bottom: '80px', left: '30px' }}>
                    <div className="w-6 h-6 bg-red-500 rounded-full shadow-md flex items-center justify-center border-2 border-gray-800">
                      <Location01Icon size={12} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            {order.users && (
              <div className="bg-gray-800 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-green-500 flex-shrink-0">
                      {order.users.avatar_url ? (
                        <img 
                          src={order.users.avatar_url} 
                          alt={order.users.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white font-semibold">${order.users.name?.charAt(0) || 'C'}</div>`
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                          {order.users.name?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{order.users.name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{order.users.phone || 'No phone'}</p>
                    </div>
                  </div>
                  {order.users.phone && (
                    <button
                      onClick={() => callCustomer(order.users.phone)}
                      className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                    >
                      <CallIcon size={18} className="text-white" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-4 safe-bottom">
          {!isMyOrder && order.agent_id === null && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setSelectedOrderDetails(null)
                }}
                className="flex-1 py-4 bg-gray-700 text-white rounded-2xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  acceptOrder(order.id)
                  setShowOrderModal(false)
                  setSelectedOrderDetails(null)
                }}
                className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600 transition-colors shadow-lg"
              >
                Accept Order
              </button>
            </div>
          )}
          
          {canStart && (
            <button
              onClick={() => startDelivery(order.id)}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Navigation01Icon size={18} />
              Start Delivery
            </button>
          )}
          
          {inProgress && (
            <div className="space-y-3">
              <button
                onClick={() => completeDelivery(order.id)}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <CheckmarkCircle02Icon size={18} />
                Complete Delivery
              </button>
              
              <div className="flex gap-3">
                {order.users?.phone && (
                  <button
                    onClick={() => callCustomer(order.users.phone)}
                    className="flex-1 py-3 bg-gray-700 text-white border-2 border-gray-600 rounded-2xl font-medium hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CallIcon size={18} className="text-green-400" />
                    Call
                  </button>
                )}
                <button
                  onClick={() => {
                    // Send message functionality
                  }}
                  className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageMultiple02Icon size={18} />
                  Send Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)' }}>
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
        
        /* Mobile-first responsive styles */
        @media (max-width: 768px) {
          .mobile-container {
            padding-bottom: 0;
          }
          
          .mobile-header {
            padding: 1rem;
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .mobile-content {
            padding: 0;
            min-height: 100vh;
            overflow-y: auto;
            position: relative;
          }
          
          .stat-card-mobile {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 1rem;
            padding: 1rem;
          }
          
          .card-mobile {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 1rem;
            margin-bottom: 1rem;
          }
        }
      `}</style>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Vision UI Sidebar - Fixed */}
        <div 
          className="h-screen flex flex-col relative rounded-3xl m-4 flex-shrink-0 overflow-hidden w-80"
          style={{ 
            transition: 'width 300ms',
            background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)'
          }}
        >
          {/* Logo with gradient line - Fixed at top */}
          <div className="p-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo1} alt="FillUp" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white tracking-wider">
                  FILLUP AGENT
                </h1>
              </div>
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
          <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentPage(item.id)
                      // Clear new orders indicator when navigating to available tab
                      if (item.id === 'available') {
                        setHasNewOrders(false)
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${
                      currentPage === item.id
                        ? 'bg-white/10 backdrop-blur-xl'
                        : 'hover:bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      currentPage === item.id
                        ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 shadow-lg shadow-purple-500/50'
                        : 'bg-white/5'
                    }`}>
                      <item.icon size={18} className="text-white" />
                    </div>
                    <span className={`font-medium text-sm relative ${
                      currentPage === item.id ? 'text-white' : 'text-gray-400'
                    }`}>
                      {item.label}
                      {item.id === 'available' && hasNewOrders && currentPage !== 'available' && (
                        <span className="absolute -top-1 -right-4 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout Button - Fixed at bottom */}
          <div className="px-4 pb-6 flex-shrink-0">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to sign out?')) {
                  handleSignOut()
                }
              }}
              disabled={isSigningOut}
              className={`w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:transform hover:scale-105 flex items-center justify-center gap-2 ${
                isSigningOut ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
              }}
            >
              {isSigningOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <ArrowRight02Icon size={18} />
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
          {/* Header - Vision UI Style */}
          <header className="sticky top-0 z-40 p-4">
            <div 
              className="px-6 py-4 backdrop-blur-2xl rounded-3xl"
              style={{ background: 'rgba(6, 11, 40, 0.7)' }}
            >
              <div className="flex items-center justify-between">
                {/* Left Side - Breadcrumb */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Home01Icon size={12} />
                    <span>/</span>
                    <span>{menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
                  </h2>
                </div>

                {/* Right Side - Actions */}
                <div className="flex items-center gap-3">
                  {/* Availability Toggle */}
                  <button
                    onClick={toggleAvailability}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      isAvailable 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium">
                      {isAvailable ? 'Available' : 'Offline'}
                    </span>
                  </button>

                  {/* Rating Badge */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <span className="text-sm font-medium text-gray-400">Rating:</span>
                    <span className="text-sm font-bold text-white">⭐ {agentData?.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Desktop Page Content */}
          <main className="flex-1 p-6 overflow-y-auto" style={{ position: 'relative' }}>
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={currentPage}
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
                  zIndex: 50,
                  willChange: 'transform, opacity',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Desktop Floating Action Button */}
        <div className="fixed bottom-8 right-8">
          <button className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:shadow-blue-500/25 hover:transform hover:scale-110 transition-all duration-300 animate-pulse-glow">
            <Activity02Icon size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden mobile-container">
        {/* Mobile Page Content */}
        <main className="mobile-content" style={{ position: 'relative' }}>
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={currentPage}
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
                zIndex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                willChange: 'transform, opacity'
              }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation - Hide when viewing order details */}
        {!selectedOrderDetails && (
          <nav style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            height: '70px',
            background: 'rgba(31, 41, 55, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '35px',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div className="flex items-center justify-around w-full px-2">
              {menuItems.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id)
                    // Clear new orders indicator when navigating to available tab
                    if (item.id === 'available') {
                      setHasNewOrders(false)
                    }
                  }}
                  className="flex items-center justify-center transition-all relative"
                >
                  <div className={`p-3 rounded-full transition-all ${
                    currentPage === item.id
                      ? 'bg-lime-400 scale-110'
                      : 'bg-transparent'
                  }`}>
                    <item.icon 
                      size={20} 
                      color={currentPage === item.id ? '#1F2937' : '#9CA3AF'}
                    />
                  </div>
                  {item.id === 'available' && hasNewOrders && currentPage !== 'available' && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && ReactDOM.createPortal(
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-[9999]"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
            onClick={() => setShowEditProfile(false)}
          />
          <div 
            className="fixed top-0 left-0 right-0 bottom-0 z-[10000] overflow-y-auto"
            style={{ position: 'fixed' }}
          >
            <div className="min-h-screen bg-gray-900 px-4 py-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setShowEditProfile(false)}
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"
                >
                  <ArrowRight02Icon size={20} className="text-white rotate-180" />
                </button>
                <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
                <div className="w-10"></div>
              </div>

              {/* Profile Picture */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                    />
                  ) : userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt={userProfile.name || 'Agent'} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-blue-500">
                      {editForm.name?.charAt(0) || userProfile?.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <label 
                    htmlFor="profile-image" 
                    className="absolute bottom-0 right-0 w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-lime-500 transition-colors"
                  >
                    <input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setImageFile(file)
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 mb-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Full name</label>
                  <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="bg-transparent text-white flex-1 outline-none"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone number</label>
                  <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="bg-transparent text-white flex-1 outline-none"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="bg-transparent text-white flex-1 outline-none"
                      placeholder="Enter email"
                    />
                  </div>
                </div>

                {/* Username (Read-only) */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Username</label>
                  <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between opacity-50">
                    <input
                      type="text"
                      value={'@' + (userProfile?.email?.split('@')[0] || 'agent')}
                      readOnly
                      className="bg-transparent text-white flex-1 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={async () => {
                  if (!user) {
                    console.error('No user found')
                    return
                  }
                  
                  try {
                    setSavingProfile(true)
                    
                    // Upload image if changed
                    let avatarUrl = userProfile?.avatar_url
                    if (imageFile) {
                      const { uploadAgentImage, deleteAgentImage } = await import('../../lib/imageUpload')
                      
                      // Delete old image if exists
                      if (userProfile?.avatar_url) {
                        try {
                          await deleteAgentImage(userProfile.avatar_url)
                        } catch (error) {
                          console.warn('⚠️ Failed to delete old image:', error)
                        }
                      }
                      
                      // Upload new image
                      avatarUrl = await uploadAgentImage(imageFile, user.id)
                    }
                    
                    // Update profile
                    const { error } = await supabase
                      .from('users')
                      .update({
                        name: editForm.name,
                        phone: editForm.phone,
                        avatar_url: avatarUrl
                      })
                      .eq('id', user.id)
                    
                    if (error) {
                      console.error('❌ Database update error:', error)
                      throw error
                    }
                    
                    // Update the auth context
                    await updateProfile({
                      name: editForm.name,
                      phone: editForm.phone,
                      avatar_url: avatarUrl
                    })
                    
                    // Reload data
                    await loadAgentData()
                    
                    // Close modal and reset state
                    setShowEditProfile(false)
                    setImageFile(null)
                    setImagePreview(null)
                    
                    alert('Profile updated successfully!')
                  } catch (error) {
                    console.error('❌ Error updating profile:', error)
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    alert('Failed to update profile: ' + errorMessage)
                  } finally {
                    setSavingProfile(false)
                  }
                }}
                disabled={savingProfile}
                className="w-full py-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>

              {/* Delete Account Button */}
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    alert('Account deletion is not yet implemented')
                  }
                }}
                className="w-full py-4 mt-4 bg-transparent border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/10 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}