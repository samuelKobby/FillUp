import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  TrendingUp,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import loaderGif from '../../assets/lodaer.gif'
import { useAuth } from '../../contexts/AuthContext'
import { useSessionTimeout } from '../../hooks/useSessionTimeout'
import { SessionTimeoutWarning } from '../../components/SessionTimeoutWarning'

interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  avatar_url?: string
  profile_image?: string
  image_url?: string
  photo?: string
  picture?: string
  profile_picture?: string
  logo?: string
  logo_url?: string
}

export const AdminUsers: React.FC = () => {
  const { signOut } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Session timeout functionality
  const { showWarning, formattedTimeLeft, extendSession } = useSessionTimeout({
    timeoutMinutes: 30, // 30 minutes for admin sessions
    warningMinutes: 5,  // Warning 5 minutes before timeout
    onTimeout: () => {
      console.log('Admin session timed out')
    },
    onWarning: () => {
      console.log('Admin session expiring soon')
    }
  })

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter, statusFilter])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.is_active)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.is_active)
    } else if (statusFilter === 'verified') {
      filtered = filtered.filter(user => user.is_verified)
    } else if (statusFilter === 'unverified') {
      filtered = filtered.filter(user => !user.is_verified)
    }

    setFilteredUsers(filtered)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ))
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const toggleUserVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_verified: !currentStatus }
          : user
      ))
    } catch (error) {
      console.error('Error updating user verification:', error)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'agent': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'station': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'customer': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'agent': return <Users className="h-4 w-4" />
      case 'station': return <Users className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
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
          <p className="mt-4 text-xl font-medium text-white">Loading Users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-300">Manage all platform users and their permissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{users.length}</div>
            <div className="text-gray-300 text-sm">Total Users</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {users.filter(u => u.role === 'customer').length}
            </div>
            <div className="text-gray-300 text-sm">Customers</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {users.filter(u => u.role === 'agent').length}
            </div>
            <div className="text-gray-300 text-sm">Agents</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {users.filter(u => u.role === 'station').length}
            </div>
            <div className="text-gray-300 text-sm">Stations</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="agent">Agents</option>
                <option value="station">Stations</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Users ({filteredUsers.length})
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all duration-300">
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">User</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Role</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Contact</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Joined</th>
                  <th className="text-left py-4 px-2 text-gray-300 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.4s ease-out forwards'
                    }}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-3">
                        {(() => {
                          // Multi-field avatar checking - prioritize station-specific fields for station role
                          const avatarUrl = user.role === 'station' 
                            ? (user.logo || user.logo_url || user.image_url || user.profile_image || user.avatar_url || user.photo || user.picture || user.profile_picture)
                            : (user.avatar_url || user.profile_image || user.image_url || user.photo || user.picture || user.profile_picture || user.logo || user.logo_url);
                          
                          return avatarUrl ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                              <img 
                                src={avatarUrl} 
                                alt={user.name || user.email}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
                              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                          );
                        })()}
                        <div>
                          <p className="font-medium text-white">
                            {user.name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Mail className="h-3 w-3" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center space-x-2 text-sm text-gray-300">
                            <Phone className="h-3 w-3" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                          user.is_active 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ml-1 ${
                          user.is_verified 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            user.is_active
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                          }`}
                        >
                          {user.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => toggleUserVerification(user.id, user.is_verified)}
                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors"
                        >
                          {user.is_verified ? 'Unverify' : 'Verify'}
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
      
      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        show={showWarning}
        timeLeft={formattedTimeLeft}
        onExtend={extendSession}
        onSignOut={signOut}
      />
    </div>
  )
}