import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { 
  UserIcon,
  Mail01Icon,
  SmartPhone01Icon,
  Location01Icon,
  CreditCardIcon,
  Notification02Icon,
  HelpCircleIcon,
  Logout01Icon,
  Edit02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  LanguageSkillIcon,
  MessageTranslateIcon,
  Share08Icon,
  CustomerService02Icon,
  CarParking01Icon
} from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { uploadCustomerImage, updateCustomerImage, deleteCustomerImage } from '../lib/imageUpload'

interface UserProfile {
  name: string
  email: string
  phone?: string
  avatar_url?: string
  created_at: string
}

interface NotificationSettings {
  orderUpdates: boolean
  promotions: boolean
  news: boolean
  sms: boolean
}

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    phone: ''
  })
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orderUpdates: true,
    promotions: true,
    news: false,
    sms: true
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔄 Profile useEffect triggered, user?.id:', user?.id)
    loadProfileData()
  }, [user?.id]) // Only depend on user ID, not entire user object

  const loadProfileData = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    console.log('📊 Loading profile data for user:', user.id)

    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (profileData) {
        setProfile({
          name: profileData.name || '',
          email: user.email || '',
          phone: profileData.phone || '',
          avatar_url: profileData.avatar_url || '',
          created_at: profileData.created_at
        })
        setEditedProfile({
          name: profileData.name || '',
          phone: profileData.phone || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Upload image first if there's a new one
      if (imageFile) {
        try {
          // Delete old image if exists
          if (profile?.avatar_url) {
            try {
              await deleteCustomerImage(profile.avatar_url)
            } catch (deleteError) {
              console.warn('Failed to delete old image:', deleteError)
            }
          }

          // Upload new image
          const imageUrl = await uploadCustomerImage(imageFile, user.id)
          
          // Update profile with new image URL
          const { error } = await supabase
            .from('users')
            .update({
              name: editedProfile.name,
              phone: editedProfile.phone,
              avatar_url: imageUrl
            })
            .eq('id', user.id)

          if (error) throw error
        } catch (imageError) {
          console.error('Error uploading image:', imageError)
          throw new Error('Failed to upload profile picture')
        }
      } else {
        // Just update profile without image
        const { error } = await supabase
          .from('users')
          .update({
            name: editedProfile.name,
            phone: editedProfile.phone
          })
          .eq('id', user.id)

        if (error) throw error
      }

      // Reload profile data
      await loadProfileData()

      // Reset state
      setImageFile(null)
      setImagePreview(null)
      setEditMode(false)
      
      alert('Profile updated successfully!')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const cancelImageUpload = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-28">
      {/* Header */}
      <div className="bg-transparent px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowRight01Icon size={24} className="transform rotate-180" />
          </Link>
          <h1 className="text-xl font-semibold">Profile</h1>
          <div className="w-10"></div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {profile?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{profile?.name || 'User'}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={() => setEditMode(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Edit02Icon size={20} color="#6B7280" />
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* General Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">General</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <CreditCardIcon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Payment Method</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Location01Icon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Location</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </button>

            <Link to="/vehicles" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <CarParking01Icon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">My Vehicles</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </Link>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <LanguageSkillIcon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Language</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </button>

            <button 
              onClick={() => setShowNotificationSettings(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Notification02Icon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Notification</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderUpdates}
                    onChange={(e) => setNotificationSettings({ 
                      ...notificationSettings, 
                      orderUpdates: e.target.checked 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Support</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <MessageTranslateIcon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Feedback</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Share08Icon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Share</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <CustomerService02Icon size={20} color="#6B7280" />
                </div>
                <span className="font-medium">Help</span>
              </div>
              <ArrowRight01Icon size={20} color="#9CA3AF" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-2xl p-4 shadow-sm hover:bg-gray-50 transition-colors flex items-center space-x-3"
        >
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <Logout01Icon size={20} color="#EF4444" />
          </div>
          <span className="font-medium text-red-600">Log Out</span>
        </button>
      </div>

      {/* Edit Profile Screen */}
      {editMode && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-gray-50 z-[9999] flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setEditMode(false)}
                  className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowRight01Icon size={20} className="text-gray-700 rotate-180" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
                <div className="w-10"></div>
              </div>

              {/* Profile Picture */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-green-500"
                    />
                  ) : profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-green-500"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-green-500">
                      {editedProfile.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="profile-image-input"
                  />
                  <label
                    htmlFor="profile-image-input"
                    className="absolute bottom-0 right-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 cursor-pointer transition-colors"
                  >
                    <Edit02Icon size={20} color="white" />
                  </label>
                </div>
              </div>

              {imageFile && (
                <div className="flex justify-center mb-6">
                  <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
                    <p className="text-sm text-green-600 font-medium">New photo selected</p>
                    <span className="text-gray-400">•</span>
                    <button
                      onClick={cancelImageUpload}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4 mb-6">
                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-medium">Full Name</label>
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center shadow-sm border border-gray-200">
                    <UserIcon size={20} color="#6B7280" className="mr-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="bg-transparent text-gray-900 flex-1 outline-none placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-medium">Email</label>
                  <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-center border border-gray-200">
                    <Mail01Icon size={20} color="#6B7280" className="mr-3 flex-shrink-0" />
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-transparent text-gray-500 flex-1 outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 ml-1">Email cannot be changed</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-medium">Phone Number</label>
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center shadow-sm border border-gray-200">
                    <SmartPhone01Icon size={20} color="#6B7280" className="mr-3 flex-shrink-0" />
                    <input
                      type="tel"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      placeholder="Enter your phone number"
                      className="bg-transparent text-gray-900 flex-1 outline-none placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 pb-6">
                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="w-full px-4 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="w-full px-4 py-4 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Notifications</h3>
              <button
                onClick={() => setShowNotificationSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Cancel01Icon size={24} color="#6B7280" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">Order Updates</p>
                  <p className="text-sm text-gray-600">Get notified about order status</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderUpdates}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, orderUpdates: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">Promotions</p>
                  <p className="text-sm text-gray-600">Receive special offers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.promotions}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, promotions: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Text message updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.sms}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, sms: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Help & Support</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Cancel01Icon size={24} color="#6B7280" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-medium mb-2">How to order fuel?</h4>
                <p className="text-sm text-gray-600">
                  1. Select "Request Fuel" from the dashboard<br />
                  2. Choose your vehicle<br />
                  3. Select a fuel station<br />
                  4. Choose fuel type and quantity<br />
                  5. Confirm your order
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Payment Methods</h4>
                <p className="text-sm text-gray-600">
                  We accept wallet payments, credit/debit cards, and mobile money. Add your payment method in the Wallet section.
                </p>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Contact Support</h4>
                <div className="space-y-2 mt-2">
                  <a href="tel:+1234567890" className="flex items-center text-blue-600 hover:underline text-sm">
                    <SmartPhone01Icon size={16} color="#2563EB" className="mr-2" />
                    +1 (234) 567-890
                  </a>
                  <a href="mailto:support@fillup.com" className="flex items-center text-blue-600 hover:underline text-sm">
                    <Mail01Icon size={16} color="#2563EB" className="mr-2" />
                    support@fillup.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
