import { useAuth } from '../../contexts/AuthContext'

export const ProfileCard = () => {
  const { user, userProfile } = useAuth()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-2xl font-bold text-orange-600">
            {userProfile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-medium">{userProfile?.name || 'Customer'}</h3>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Account Details</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Member since:</span> {new Date(userProfile?.created_at || '').toLocaleDateString()}</p>
            <p><span className="text-gray-500">Phone:</span> {userProfile?.phone || 'Not provided'}</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="text-left p-2 hover:bg-gray-50 rounded">
              Edit Profile
            </button>
            <button className="text-left p-2 hover:bg-gray-50 rounded">
              Payment Methods
            </button>
            <button className="text-left p-2 hover:bg-gray-50 rounded">
              Order History
            </button>
            <button className="text-left p-2 hover:bg-gray-50 rounded">
              Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
