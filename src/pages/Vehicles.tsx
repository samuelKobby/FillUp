import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft01Icon,
  Add01Icon,
  Edit02Icon,
  Delete02Icon,
  StarIcon,
  CarParking01Icon,
  UserMultiple02Icon,
  Camera01Icon
} from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getUserVehicles } from '../lib/supabase'
import { uploadVehicleImage, updateVehicleImage, deleteVehicleImage } from '../lib/imageUpload'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { getCache, setCache } from '../lib/cache'

interface Vehicle {
  id: string
  make: string
  model: string
  year?: number
  plate_number: string
  fuel_type: 'petrol' | 'diesel'
  tank_capacity: number
  is_default: boolean
  image_url?: string
  created_at: string
}

export const Vehicles: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    return user ? (getCache<Vehicle[]>('vehicles_data', user.id) || []) : []
  })
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    plate_number: '',
    fuel_type: 'petrol' as 'petrol' | 'diesel',
    tank_capacity: '50'
  })

  const loadVehicles = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const data = await getUserVehicles(user.id)
      setVehicles(data)
      if (user?.id) {
        setCache('vehicles_data', data, user.id)
      }
      setDataLoaded(true)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // Set up Realtime subscription with auto-reconnection
  useRealtimeSubscription({
    channelName: `vehicles-updates-${user?.id}`,
    table: 'vehicles',
    filter: `user_id=eq.${user?.id}`,
    onUpdate: loadVehicles,
    enabled: !!user?.id
  })

  useEffect(() => {
    if (user?.id) {
      loadVehicles()
    }
  }, [user?.id])

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: '',
      plate_number: '',
      fuel_type: 'petrol',
      tank_capacity: '50'
    })
    setEditingVehicle(null)
    setShowAddForm(false)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB max)
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

  const cancelImageUpload = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      plate_number: vehicle.plate_number,
      fuel_type: vehicle.fuel_type,
      tank_capacity: vehicle.tank_capacity.toString()
    })
    setEditingVehicle(vehicle)
    setImagePreview(vehicle.image_url || null)
    setShowAddForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const vehicleData = {
        user_id: user.id,
        make: formData.make,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        plate_number: formData.plate_number.toUpperCase(),
        fuel_type: formData.fuel_type,
        tank_capacity: parseInt(formData.tank_capacity),
        is_default: vehicles.length === 0 // First vehicle is default
      }

      if (editingVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id)

        if (error) throw error

        // Handle image upload if new image selected
        if (imageFile) {
          // Delete old image if exists
          if (editingVehicle.image_url) {
            await deleteVehicleImage(editingVehicle.image_url)
          }
          
          // Upload new image
          const imageUrl = await uploadVehicleImage(imageFile, editingVehicle.id, user.id)
          await updateVehicleImage(editingVehicle.id, imageUrl)
        }
      } else {
        // Add new vehicle
        const { data: newVehicle, error } = await supabase
          .from('vehicles')
          .insert([vehicleData])
          .select()
          .single()

        if (error) throw error

        // Upload image if selected
        if (imageFile && newVehicle) {
          const imageUrl = await uploadVehicleImage(imageFile, newVehicle.id, user.id)
          await updateVehicleImage(newVehicle.id, imageUrl)
        }
      }

      await loadVehicles()
      resetForm()
    } catch (error) {
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)

      if (error) throw error
      await loadVehicles()
    } catch (error) {
    }
  }

  const handleSetDefault = async (vehicleId: string) => {
    try {
      // Remove default from all vehicles
      await supabase
        .from('vehicles')
        .update({ is_default: false })
        .eq('user_id', user!.id)

      // Set new default
      const { error } = await supabase
        .from('vehicles')
        .update({ is_default: true })
        .eq('id', vehicleId)

      if (error) throw error
      await loadVehicles()
    } catch (error) {
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/dashboard', { state: { activeTab: 'profile' } })}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft01Icon size={24} />
          </button>
          <h1 className="text-xl font-semibold">My Vehicles</h1>
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Add01Icon size={24} color="#059669" />
          </button>
        </div>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full">
                <Delete02Icon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Vehicle preview"
                      className="w-24 h-24 rounded-xl object-contain border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                      <CarParking01Icon size={40} color="white" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="vehicle-image-input"
                  />
                  <label
                    htmlFor="vehicle-image-input"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 cursor-pointer"
                  >
                    <Camera01Icon size={16} color="white" />
                  </label>
                </div>
                {imageFile ? (
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-blue-600 font-medium">New photo selected</p>
                    <span className="text-gray-400">•</span>
                    <button
                      type="button"
                      onClick={cancelImageUpload}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Add vehicle photo (optional)</p>
                )}
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g., Toyota"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Camry"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="e.g., 2020"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    placeholder="e.g., GR 2024-21"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Type *
                  </label>
                  <select
                    required
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as 'petrol' | 'diesel' })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tank Capacity (Liters) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.tank_capacity}
                    onChange={(e) => setFormData({ ...formData, tank_capacity: e.target.value })}
                    placeholder="e.g., 50"
                    min="10"
                    max="200"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-6 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Saving...' : editingVehicle ? 'Update' : 'Add Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Vehicles List */}
      <div className="px-6 py-4">
        {vehicles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <CarParking01Icon size={64} color="#D1D5DB" className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No vehicles added yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first vehicle to start requesting services
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {/* Vehicle Icon */}
                  <div className="relative flex-shrink-0">
                    {vehicle.image_url ? (
                      <img
                        src={vehicle.image_url}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-14 h-14 rounded-xl object-contain border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                        <CarParking01Icon size={28} color="white" />
                      </div>
                    )}
                    {vehicle.is_default && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <StarIcon size={12} color="white" className="fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{vehicle.year && `${vehicle.year} • `}{vehicle.plate_number}</span>
                      <span>•</span>
                      <span className="capitalize">{vehicle.fuel_type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <UserMultiple02Icon size={12} color="#6B7280" />
                      <span>{vehicle.tank_capacity}L capacity</span>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Edit02Icon size={20} color="#6B7280" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 ml-[62px]">
                  {!vehicle.is_default && (
                    <button
                      onClick={() => handleSetDefault(vehicle.id)}
                      className="text-xs text-blue-600 font-medium hover:text-blue-700"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-xs text-red-600 font-medium hover:text-red-700 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}