import React, { useState, useEffect } from 'react'
import { 
  MapPin, 
  Search, 
  Filter, 
  Star,
  Phone,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Download,
  Activity,
  Fuel,
  Clock,
  DollarSign
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import loaderGif from '../../assets/lodaer.gif'

interface Station {
  id: string
  user_id: string
  name: string
  address: string
  phone: string | null
  fuel_types: string[]
  petrol_price: number
  diesel_price: number
  is_verified: boolean
  is_active: boolean
  operating_hours: any
  created_at: string
  users: {
    name: string | null
    email: string
    phone: string | null
  }
}

export const AdminStations: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([])
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fuelTypeFilter, setFuelTypeFilter] = useState('all')

  useEffect(() => {
    loadStations()
  }, [])

  useEffect(() => {
    filterStations()
  }, [stations, searchTerm, statusFilter, fuelTypeFilter])

  const loadStations = async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select(`
          *,
          users(name, email, phone)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStations(data || [])
    } catch (error) {
      console.error('Error loading stations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterStations = () => {
    let filtered = stations

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.phone?.includes(searchTerm)
      )
    }

    // Status filter
    if (statusFilter === 'verified') {
      filtered = filtered.filter(station => station.is_verified)
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(station => !station.is_verified)
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(station => station.is_active)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(station => !station.is_active)
    }

    // Fuel type filter
    if (fuelTypeFilter !== 'all') {
      filtered = filtered.filter(station => 
        station.fuel_types?.includes(fuelTypeFilter)
      )
    }

    setFilteredStations(filtered)
  }

  const toggleStationVerification = async (stationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('stations')
        .update({ is_verified: !currentStatus })
        .eq('id', stationId)

      if (error) throw error
      
      setStations(stations.map(station => 
        station.id === stationId 
          ? { ...station, is_verified: !currentStatus }
          : station
      ))
    } catch (error) {
      console.error('Error updating station verification:', error)
    }
  }

  const toggleStationStatus = async (stationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('stations')
        .update({ is_active: !currentStatus })
        .eq('id', stationId)

      if (error) throw error
      
      setStations(stations.map(station => 
        station.id === stationId 
          ? { ...station, is_active: !currentStatus }
          : station
      ))
    } catch (error) {
      console.error('Error updating station status:', error)
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
          <p className="mt-4 text-xl font-medium text-white">Loading Stations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Station Management</h1>
          <p className="text-gray-300">Manage fuel stations and their verification status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{stations.length}</div>
            <div className="text-gray-300 text-sm">Total Stations</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {stations.filter(s => s.is_verified).length}
            </div>
            <div className="text-gray-300 text-sm">Verified</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {stations.filter(s => s.is_active).length}
            </div>
            <div className="text-gray-300 text-sm">Active</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {stations.filter(s => !s.is_verified).length}
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
                placeholder="Search stations by name, address, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={fuelTypeFilter}
                onChange={(e) => setFuelTypeFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Fuel Types</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Stations Table */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Stations ({filteredStations.length})
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
              <Plus className="h-4 w-4" />
              Add Station
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Station</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Location</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Fuel Prices</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Contact</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Joined</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStations.map((station, index) => (
                  <tr 
                    key={station.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.4s ease-out forwards'
                    }}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                          <Fuel className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{station.name}</p>
                          <p className="text-sm text-gray-400">{station.users?.name || 'No manager'}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {station.fuel_types?.map((type, idx) => (
                              <span key={idx} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-xs">{station.address}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>24/7 Operations</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="h-3 w-3 text-green-400" />
                          <span className="text-white">Petrol: ₵{station.petrol_price}/L</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="h-3 w-3 text-orange-400" />
                          <span className="text-white">Diesel: ₵{station.diesel_price}/L</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Phone className="h-3 w-3" />
                          <span>{station.phone || station.users?.phone || 'No phone'}</span>
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-xs">
                          {station.users?.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                          station.is_verified 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {station.is_verified ? 'Verified' : 'Pending'}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ml-1 ${
                          station.is_active 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {station.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(station.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        {!station.is_verified && (
                          <button
                            onClick={() => toggleStationVerification(station.id, station.is_verified)}
                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => toggleStationStatus(station.id, station.is_active)}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                            station.is_active
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                          }`}
                        >
                          {station.is_active ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                          {station.is_active ? 'Deactivate' : 'Activate'}
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