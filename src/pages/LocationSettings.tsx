import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'

type SavedLocation = {
  label: string
  address: string
  lat?: number
  lng?: number
}

const defaultLocation: SavedLocation = {
  label: 'Home',
  address: ''
}

export const LocationSettings: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const storageKey = user ? `location_${user.id}` : 'location_guest'

  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<SavedLocation>(defaultLocation)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setLocation({ ...defaultLocation, ...(JSON.parse(raw) as SavedLocation) })
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const save = async () => {
    setLoading(true)
    try {
      localStorage.setItem(storageKey, JSON.stringify(location))
      toast.success('Location saved')
      navigate('/profile')
    } catch {
      toast.error('Failed to save location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24">
      <div className="bg-transparent px-6 pt-12 pb-6">
        <div className="flex items-center justify-center mb-6 relative">
          <button
            onClick={() => navigate('/profile')}
            className="absolute left-0 top-1 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Back"
          >
            <ArrowLeft01Icon size={20} color="#6B7280" className="rotate-180" />
          </button>
          <h1 className="text-xl font-semibold">Location</h1>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Save your delivery location</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2 font-medium">Label</label>
              <input
                value={location.label}
                onChange={(e) => setLocation((l) => ({ ...l, label: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Home"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2 font-medium">Address</label>
              <textarea
                value={location.address}
                onChange={(e) => setLocation((l) => ({ ...l, address: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 min-h-[110px]"
                placeholder="Street, landmark, area..."
              />
              <p className="text-xs text-gray-500 mt-2">Saved locally until delivery location is fully integrated with the backend.</p>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => navigate('/profile')}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={loading || !location.address.trim()}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors shadow-md"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

