import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Check, X, ChevronDown, ChevronUp, User, Phone, Mail, Calendar, 
  MapPin, FileText, Truck, Wrench, Car, AlertCircle, Search,
  RefreshCw, Filter, ArrowUpDown, Info, CheckCircle, XCircle, Clock
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type AgentApplication = {
  id: string
  auth_id: string
  email: string
  name: string
  phone: string
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  license_number: string | null
  vehicle_info: {
    make?: string
    model?: string
    year?: string
    plateNumber?: string
    color?: string
  } | null
  experience: string | null
  location: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string | null
  created_at: string
  updated_at?: string
  reviewed_at?: string | null
  reviewed_by?: string | null
}

export const AgentApplications: React.FC = () => {
  const [applications, setApplications] = useState<AgentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'email'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })
  
  const { userRole } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    // Check if user is admin
    if (userRole !== 'admin') {
      navigate('/dashboard')
      return
    }
    
    fetchApplications()
    fetchStats()
  }, [userRole, navigate, filter])
  
  const fetchStats = async () => {
    try {
      // Get counts for each status type
      const { data: pendingCount, error: pendingError } = await supabase
        .from('pending_agents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        
      const { data: approvedCount, error: approvedError } = await supabase
        .from('pending_agents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        
      const { data: rejectedCount, error: rejectedError } = await supabase
        .from('pending_agents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected')
        
      const { data: totalCount, error: totalError } = await supabase
        .from('pending_agents')
        .select('id', { count: 'exact', head: true })
        
      if (pendingError || approvedError || rejectedError || totalError) throw new Error('Error fetching stats')
      
      setStats({
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0,
        rejected: rejectedCount?.count || 0,
        total: totalCount?.count || 0
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }
  
  const fetchApplications = async () => {
    setLoading(true)
    setError('')
    
    try {
      let query = supabase
        .from('pending_agents')
        .select('*')
      
      // Apply filters
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }
      
      // Apply search if there's a query
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      
      const { data, error } = await query
      
      if (error) throw error
      
      setApplications(data as AgentApplication[])
    } catch (err: any) {
      console.error('Error fetching applications:', err)
      setError('Failed to load agent applications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  const refreshData = () => {
    setRefreshing(true)
    fetchApplications()
    fetchStats()
  }
  
  const handleSort = (field: 'created_at' | 'name' | 'email') => {
    if (sortBy === field) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Change sort field and set default order
      setSortBy(field)
      setSortOrder('asc')
    }
  }
  
  const approveApplication = async (id: string) => {
    setProcessingId(id)
    setError('')
    
    try {
      // Get current user ID for admin tracking
      const { data: userData } = await supabase.auth.getUser()
      const adminId = userData.user?.id
      
      if (!adminId) {
        throw new Error('Admin ID not found')
      }
      
      const { data, error } = await supabase.rpc('approve_agent_application', {
        application_id: id,
        admin_id: adminId,
        admin_notes: adminNotes
      })
      
      if (error) throw error
      
      // Refresh the applications list and stats
      await fetchApplications()
      await fetchStats()
      setAdminNotes('')
      
      // Show success message
      setError('')
    } catch (err: any) {
      console.error('Error approving application:', err)
      setError(`Failed to approve application: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }
  
  const rejectApplication = async (id: string) => {
    setProcessingId(id)
    setError('')
    
    try {
      // Get current user ID for admin tracking
      const { data: userData } = await supabase.auth.getUser()
      const adminId = userData.user?.id
      
      if (!adminId) {
        throw new Error('Admin ID not found')
      }
      
      const { data, error } = await supabase.rpc('reject_agent_application', {
        application_id: id,
        admin_id: adminId,
        admin_notes: adminNotes
      })
      
      if (error) throw error
      
      // Refresh the applications list and stats
      await fetchApplications()
      await fetchStats()
      setAdminNotes('')
      
      // Show success message
      setError('')
    } catch (err: any) {
      console.error('Error rejecting application:', err)
      setError(`Failed to reject application: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }
  
  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      // Clear admin notes when switching between applications
      setAdminNotes('')
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'fuel_delivery':
        return <Truck className="h-5 w-5 text-blue-500" />
      case 'mechanic':
        return <Wrench className="h-5 w-5 text-green-500" />
      case 'both':
        return (
          <div className="flex -space-x-1">
            <Truck className="h-5 w-5 text-blue-500" />
            <Wrench className="h-5 w-5 text-green-500" />
          </div>
        )
      default:
        return null
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Pending</span>
      case 'approved':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Approved</span>
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Rejected</span>
      default:
        return null
    }
  }
  
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Agent Applications</h1>
            <p className="text-gray-300">
              Review and manage service agent applications
            </p>
          </div>
          
          <Button 
            onClick={refreshData} 
            variant="outline"
            disabled={refreshing}
            className="flex items-center border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-yellow-500/20 p-3">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-300">Pending Applications</dt>
                <dd>
                  <div className="text-3xl font-bold text-white">{stats.pending}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-green-500/20 p-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-300">Approved Applications</dt>
                <dd>
                  <div className="text-3xl font-bold text-green-400">{stats.approved}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-red-500/20 p-3">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-300">Rejected Applications</dt>
                <dd>
                  <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-blue-500/20 p-3">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-300">Total Applications</dt>
                <dd>
                  <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Search and filters */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Search by name, email or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Applications</option>
              </select>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as any)
                  setSortOrder(order as any)
                }}
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
            <h3 className="text-lg font-medium text-white">No applications found</h3>
            <p className="mt-1 text-sm text-gray-300">
              {filter === 'pending' 
                ? 'There are no pending applications to review at this time.' 
                : `No ${filter === 'all' ? '' : filter} applications found.`}
            </p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/10">
              {applications.map((app) => (
                <li key={app.id} className="hover:bg-gray-50">
                  <div 
                    className="px-6 py-5 cursor-pointer"
                    onClick={() => toggleExpand(app.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-white">{app.name}</h3>
                            <div className="ml-2">{getStatusBadge(app.status)}</div>
                          </div>
                          <div className="flex items-center mt-1">
                            <Mail className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-300">{app.email}</span>
                            <span className="mx-2 text-gray-500">|</span>
                            <Phone className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-300">{app.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          {getServiceIcon(app.service_type)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {app.service_type === 'fuel_delivery' 
                              ? 'Fuel Delivery' 
                              : app.service_type === 'mechanic' 
                                ? 'Mechanic' 
                                : 'Both Services'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500">{formatDate(app.created_at)}</span>
                        </div>
                        {expandedId === app.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedId === app.id && (
                    <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                      {/* Application status and metadata */}
                      {(app.status === 'approved' || app.status === 'rejected') && (
                        <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white">
                          <div className="flex items-center mb-2">
                            {app.status === 'approved' ? (
                              <div className="bg-green-100 p-2 rounded-full">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="bg-red-100 p-2 rounded-full">
                                <XCircle className="h-5 w-5 text-red-600" />
                              </div>
                            )}
                            
                            <h4 className="ml-2 text-lg font-medium">
                              Application {app.status === 'approved' ? 'Approved' : 'Rejected'}
                            </h4>
                          </div>
                          
                          {app.reviewed_at && (
                            <div className="text-sm text-gray-500">
                              <strong>Reviewed on:</strong> {formatDate(app.reviewed_at)}
                            </div>
                          )}
                          
                          {app.admin_notes && (
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-500">Admin Notes</label>
                              <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                                {app.admin_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                            Personal Information
                          </h4>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Full Name</label>
                                <div className="mt-1 font-medium">{app.name}</div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Email</label>
                                <div className="mt-1">{app.email}</div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Phone</label>
                                <div className="mt-1">{app.phone}</div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Location</label>
                                <div className="mt-1 flex items-center">
                                  <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                                  {app.location}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Driver's License</label>
                                <div className="mt-1 flex items-center">
                                  <FileText className="h-4 w-4 text-gray-400 mr-1" />
                                  {app.license_number || 'Not provided'}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Application Date</label>
                                <div className="mt-1 flex items-center">
                                  <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                  {formatDate(app.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                            Service Details
                          </h4>
                          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500">Service Type</label>
                              <div className="mt-1 flex items-center">
                                {getServiceIcon(app.service_type)}
                                <span className="ml-2">
                                  {app.service_type === 'fuel_delivery' 
                                    ? 'Fuel Delivery' 
                                    : app.service_type === 'mechanic' 
                                      ? 'Mechanic' 
                                      : 'Both Services'}
                                </span>
                              </div>
                            </div>
                            
                            {app.service_type !== 'mechanic' && app.vehicle_info && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Vehicle Information</label>
                                <div className="mt-2 bg-gray-50 p-3 rounded border border-gray-200">
                                  <div className="flex items-center mb-2">
                                    <Car className="h-4 w-4 text-gray-400 mr-1" />
                                    <span className="font-medium text-sm">
                                      {app.vehicle_info.make} {app.vehicle_info.model}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {app.vehicle_info.year && (
                                      <div>
                                        <span className="text-gray-500">Year:</span> {app.vehicle_info.year}
                                      </div>
                                    )}
                                    {app.vehicle_info.plateNumber && (
                                      <div>
                                        <span className="text-gray-500">Plate:</span> {app.vehicle_info.plateNumber}
                                      </div>
                                    )}
                                    {app.vehicle_info.color && (
                                      <div>
                                        <span className="text-gray-500">Color:</span> {app.vehicle_info.color}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {app.experience && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Experience & Skills</label>
                                <div className="mt-1 text-sm bg-gray-50 p-3 rounded border border-gray-200">
                                  {app.experience}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {app.status === 'pending' && (
                        <div className="mt-6">
                          <div className="bg-white p-4 rounded-lg border border-orange-200 border-l-4 mb-6">
                            <div className="flex items-start">
                              <Info className="h-5 w-5 text-orange-500 mr-2 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-medium text-orange-800">Action Required</h4>
                                <p className="mt-1 text-sm text-orange-700">
                                  This application requires your review. Once approved, a user account will be created and the agent
                                  can begin accepting service requests.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-2">
                              Admin Notes (optional)
                            </label>
                            <textarea
                              id="adminNotes"
                              rows={3}
                              className="block w-full rounded-md border border-gray-300 p-3 focus:border-orange-500 focus:ring-orange-500"
                              placeholder="Add notes about this application..."
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              These notes will be stored with the application record and visible to other admins.
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={() => approveApplication(app.id)}
                              disabled={processingId === app.id}
                              className="bg-green-600 hover:bg-green-700 flex items-center"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Approve Application
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => rejectApplication(app.id)}
                              disabled={processingId === app.id}
                              className="flex items-center"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject Application
                            </Button>
                            
                            {processingId === app.id && (
                              <div className="flex items-center ml-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-orange-500 mr-2"></div>
                                <span className="text-sm text-gray-500">Processing...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
