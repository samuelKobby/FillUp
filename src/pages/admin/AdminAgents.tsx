import React, { useState, useEffect } from 'react'
import { 
  UserCheck, 
  Search, 
  Filter, 
  Star,
  MapPin,
  Phone,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Download,
  Activity,
  Fuel,
  Wrench
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import loaderGif from '../../assets/lodaer.gif'

interface Agent {
  id: string
  user_id: string
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  vehicle_info: any
  license_number: string | null
  is_verified: boolean
  is_available: boolean
  rating: number
  total_jobs: number
  created_at: string
  users: {
    name: string | null
    email: string
    phone: string | null
  }
}

export const AdminAgents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    filterAgents()
  }, [agents, searchTerm, serviceFilter, statusFilter])

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          users(name, email, phone)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAgents = () => {
    let filtered = agents

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(agent =>
        agent.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.users?.phone?.includes(searchTerm) ||
        agent.license_number?.includes(searchTerm)
      )
    }

    // Service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(agent => agent.service_type === serviceFilter)
    }

    // Status filter
    if (statusFilter === 'verified') {
      filtered = filtered.filter(agent => agent.is_verified)
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(agent => !agent.is_verified)
    } else if (statusFilter === 'available') {
      filtered = filtered.filter(agent => agent.is_available)
    } else if (statusFilter === 'unavailable') {
      filtered = filtered.filter(agent => !agent.is_available)
    }

    setFilteredAgents(filtered)
  }

  const toggleAgentVerification = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_verified: !currentStatus })
        .eq('id', agentId)

      if (error) throw error
      
      setAgents(agents.map(agent => 
        agent.id === agentId 
          ? { ...agent, is_verified: !currentStatus }
          : agent
      ))
    } catch (error) {
      console.error('Error updating agent verification:', error)
    }
  }

  const toggleAgentAvailability = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_available: !currentStatus })
        .eq('id', agentId)

      if (error) throw error
      
      setAgents(agents.map(agent => 
        agent.id === agentId 
          ? { ...agent, is_available: !currentStatus }
          : agent
      ))
    } catch (error) {
      console.error('Error updating agent availability:', error)
    }
  }

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'fuel_delivery': return <Fuel className="h-4 w-4" />
      case 'mechanic': return <Wrench className="h-4 w-4" />
      case 'both': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getServiceColor = (serviceType: string) => {
    switch (serviceType) {
      case 'fuel_delivery': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'mechanic': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'both': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <img 
            src={loaderGif} 
            alt="Loading..."
            className="w-48 h-48 mx-auto object-contain"
          />
          <p className="mt-4 text-xl font-medium text-white">Loading Agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Agent Management</h1>
          <p className="text-gray-300">Manage service providers and their verification status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{agents.length}</div>
            <div className="text-gray-300 text-sm">Total Agents</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {agents.filter(a => a.is_verified).length}
            </div>
            <div className="text-gray-300 text-sm">Verified</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {agents.filter(a => a.is_available).length}
            </div>
            <div className="text-gray-300 text-sm">Available</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {agents.filter(a => !a.is_verified).length}
            </div>
            <div className="text-gray-300 text-sm">Pending</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents by name, email, phone, or license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Services</option>
                <option value="fuel_delivery">Fuel Delivery</option>
                <option value="mechanic">Mechanic</option>
                <option value="both">Both Services</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Agents Table */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Agents ({filteredAgents.length})
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
              <Plus className="h-4 w-4" />
              Add Agent
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Agent</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Service Type</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Contact</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Performance</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Joined</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent, index) => (
                  <tr 
                    key={agent.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.4s ease-out forwards'
                    }}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {agent.users?.name?.charAt(0) || agent.users?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {agent.users?.name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-400">{agent.users?.email}</p>
                          {agent.license_number && (
                            <p className="text-xs text-gray-500">License: {agent.license_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getServiceColor(agent.service_type)}`}>
                        {getServiceIcon(agent.service_type)}
                        <span className="capitalize">{agent.service_type.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Phone className="h-3 w-3" />
                          <span>{agent.users?.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <MapPin className="h-3 w-3" />
                          <span>{agent.is_available ? 'Available' : 'Unavailable'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-white">{agent.rating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {agent.total_jobs} jobs completed
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                          agent.is_verified 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {agent.is_verified ? 'Verified' : 'Pending'}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ml-1 ${
                          agent.is_available 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {agent.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        {!agent.is_verified && (
                          <button
                            onClick={() => toggleAgentVerification(agent.id, agent.is_verified)}
                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => toggleAgentAvailability(agent.id, agent.is_available)}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                            agent.is_available
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                          }`}
                        >
                          {agent.is_available ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                          {agent.is_available ? 'Suspend' : 'Activate'}
                        </button>
                        <button className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg text-xs transition-colors">
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}