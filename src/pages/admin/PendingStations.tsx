import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Download,
  Fuel,
  DollarSign,
  Phone,
  User,
  Mail,
  Eye,
  Clock,
  MapPin
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import loaderGif from '../../assets/lodaer.gif'

type PendingStation = {
  id: string
  auth_id: string
  email: string
  name: string
  phone: string | null
  station_name: string
  station_address: string
  location: { type: string; coordinates: [number, number] } | null
  station_phone: string | null
  fuel_types: string[]
  petrol_price: number
  diesel_price: number
  operating_hours: any
  description: string | null
  image_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export const PendingStations: React.FC = () => {
  const [stations, setStations] = useState<PendingStation[]>([])
  const [filteredStations, setFilteredStations] = useState<PendingStation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const { userRole } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/dashboard')
      return
    }

    loadStations()
  }, [userRole, navigate])

  useEffect(() => {
    let filtered = stations

    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter(station =>
        station.station_name?.toLowerCase().includes(query) ||
        station.station_address?.toLowerCase().includes(query) ||
        station.name?.toLowerCase().includes(query) ||
        station.email?.toLowerCase().includes(query) ||
        station.phone?.toLowerCase().includes(query) ||
        station.station_phone?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(station => station.status === statusFilter)
    }

    setFilteredStations(filtered)
  }, [stations, searchTerm, statusFilter])

  const loadStations = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_stations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStations((data as PendingStation[]) || [])
    } catch (error) {
      console.error('Error loading pending stations:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveStation = async (id: string) => {
    try {
      setProcessingId(id)
      const { data: userData } = await supabase.auth.getUser()
      const adminId = userData.user?.id

      if (!adminId) throw new Error('Admin ID not found')

      const { error } = await supabase.rpc('approve_station_application', {
        application_id: id,
        admin_id: adminId,
        admin_notes: adminNotes
      })

      if (error) throw error

      setAdminNotes('')
      await loadStations()
    } catch (error) {
      console.error('Error approving station:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const rejectStation = async (id: string) => {
    try {
      setProcessingId(id)
      const { data: userData } = await supabase.auth.getUser()
      const adminId = userData.user?.id

      if (!adminId) throw new Error('Admin ID not found')

      const { error } = await supabase.rpc('reject_station_application', {
        application_id: id,
        admin_id: adminId,
        admin_notes: adminNotes
      })

      if (error) throw error

      setAdminNotes('')
      await loadStations()
    } catch (error) {
      console.error('Error rejecting station:', error)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <img src={loaderGif} alt="Loading..." className="w-48 h-48 mx-auto object-contain" />
          <p className="mt-4 text-xl font-medium text-white">Loading Pending Stations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pending Stations</h1>
          <p className="text-gray-300">Review station registrations before they are added to the live stations table.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{stations.length}</div>
            <div className="text-gray-300 text-sm">Total Applications</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">{stations.filter(station => station.status === 'pending').length}</div>
            <div className="text-gray-300 text-sm">Pending</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{stations.filter(station => station.status === 'approved').length}</div>
            <div className="text-gray-300 text-sm">Approved</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">{stations.filter(station => station.status === 'rejected').length}</div>
            <div className="text-gray-300 text-sm">Rejected</div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search stations by name, manager, email, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Applications ({filteredStations.length})</h3>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Admin notes for approval/rejection..."
              className="w-72 h-20 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Station</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Submitted By</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Fuel / Prices</th>
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
                          <p className="font-medium text-white">{station.station_name}</p>
                          <p className="text-sm text-gray-400 truncate max-w-xs">{station.station_address}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {station.fuel_types?.map((type, idx) => (
                              <span key={idx} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded capitalize">
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
                          <User className="h-3 w-3" />
                          <span>{station.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Mail className="h-3 w-3" />
                          <span>{station.email}</span>
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
                          <span>{station.station_phone || station.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-xs">{station.station_address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                        station.status === 'approved'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : station.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {station.status}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(station.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                          onClick={() => window.open(`mailto:${station.email}`, '_self')}
                        >
                          <Eye className="h-3 w-3" />
                          Contact
                        </button>
                        {station.status === 'pending' && (
                          <>
                            <button
                              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                              disabled={processingId === station.id}
                              onClick={() => approveStation(station.id)}
                            >
                              <CheckCircle className="h-3 w-3" />
                              {processingId === station.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                              disabled={processingId === station.id}
                              onClick={() => rejectStation(station.id)}
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
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