import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Phone, Fuel, MapPin, Building, Clock, DollarSign, Upload, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export const StationRegister: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    stationName: '',
    address: '',
    location: '',
    stationPhone: '',
    fuelTypes: ['petrol', 'diesel'] as string[],
    petrolPrice: '',
    dieselPrice: '',
    operatingHours: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '06:00', close: '22:00' },
      sunday: { open: '07:00', close: '21:00' }
    },
    description: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [stationImage, setStationImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Map picker component
  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setCoordinates([e.latlng.lat, e.latlng.lng])
      },
    })
    return coordinates ? <Marker position={coordinates} /> : null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleFuelTypeChange = (fuelType: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        fuelTypes: [...formData.fuelTypes, fuelType]
      })
    } else {
      setFormData({
        ...formData,
        fuelTypes: formData.fuelTypes.filter(type => type !== fuelType)
      })
    }
  }

  const handleOperatingHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours,
        [day]: {
          ...formData.operatingHours[day],
          [field]: value
        }
      }
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      setStationImage(file)
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const removeImage = () => {
    setStationImage(null)
    setImagePreview(null)
  }

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields')
      return false
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!formData.stationName || !formData.address || !formData.location) {
      setError('Please complete all station information')
      return false
    }

    if (!coordinates) {
      setError('Please select your station location on the map')
      return false
    }

    if (formData.fuelTypes.length === 0) {
      setError('Please select at least one fuel type')
      return false
    }

    if (formData.fuelTypes.includes('petrol') && !formData.petrolPrice) {
      setError('Please set petrol price')
      return false
    }

    if (formData.fuelTypes.includes('diesel') && !formData.dieselPrice) {
      setError('Please set diesel price')
      return false
    }

    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep2()) return

    setLoading(true)

    try {
      // First create the user account
      await signUp(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        role: 'station'
      })
      
      // Store station data for later use after email verification
      localStorage.setItem('pendingStationData', JSON.stringify({
        stationName: formData.stationName,
        address: formData.address + ', ' + formData.location, // Combine address with city/region
        location: coordinates ? {
          type: 'Point',
          coordinates: [coordinates[1], coordinates[0]] // [longitude, latitude]
        } : null,
        stationPhone: formData.stationPhone,
        fuelTypes: formData.fuelTypes,
        petrolPrice: parseFloat(formData.petrolPrice) || 0,
        dieselPrice: parseFloat(formData.dieselPrice) || 0,
        operatingHours: formData.operatingHours,
        description: formData.description,
        hasImage: !!stationImage
      }))
      
      // Store image separately if exists
      if (stationImage) {
        const reader = new FileReader()
        reader.onloadend = () => {
          localStorage.setItem('pendingStationImage', reader.result as string)
        }
        reader.readAsDataURL(stationImage)
      }
      
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&type=station`)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 rounded-xl">
                <Fuel className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Register Your Fuel Station</h2>
            <p className="text-gray-600 mt-2">Join FillUp's network and expand your customer reach</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 2 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step > stepNum ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-2">
              <div className="text-sm text-gray-600">
                {step === 1 && 'Account Information'}
                {step === 2 && 'Station Details'}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="Enter manager's full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Phone *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="+233 XX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full text-lg py-3 bg-green-600 hover:bg-green-700">
                  Next: Station Details
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Station Image Upload */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Station Image
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a photo of your station (optional but recommended for better visibility)
                  </p>
                  
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-purple-400 mb-3" />
                        <p className="mb-2 text-sm text-gray-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Station preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="stationName" className="block text-sm font-medium text-gray-700 mb-2">
                      Station Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="stationName"
                        name="stationName"
                        type="text"
                        required
                        value={formData.stationName}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="e.g., Shell Accra Central"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="stationPhone" className="block text-sm font-medium text-gray-700 mb-2">
                      Station Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="stationPhone"
                        name="stationPhone"
                        type="tel"
                        value={formData.stationPhone}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="+233 XX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Station Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Enter complete station address"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    City/Region *
                  </label>
                  <select
                    id="location"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select city/region</option>
                    <option value="Accra">Accra</option>
                    <option value="Kumasi">Kumasi</option>
                    <option value="Tamale">Tamale</option>
                    <option value="Cape Coast">Cape Coast</option>
                    <option value="Takoradi">Takoradi</option>
                    <option value="Ho">Ho</option>
                    <option value="Koforidua">Koforidua</option>
                    <option value="Sunyani">Sunyani</option>
                    <option value="Wa">Wa</option>
                    <option value="Bolgatanga">Bolgatanga</option>
                  </select>
                </div>

                {/* GPS Location Map Picker */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Station GPS Location *
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Click on the map to mark your station's exact location. This will help agents find you easily.
                  </p>
                  {coordinates && (
                    <div className="mb-3 p-3 bg-blue-100 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Selected Location:</strong> {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}
                      </p>
                    </div>
                  )}
                  <div className="h-96 rounded-lg overflow-hidden border-2 border-blue-300">
                    <MapContainer
                      center={[5.6037, -0.187]} // Default: Accra, Ghana
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationPicker />
                    </MapContainer>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <Fuel className="h-5 w-5 mr-2" />
                    Fuel Types & Pricing
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Fuel Types *
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.fuelTypes.includes('petrol')}
                            onChange={(e) => handleFuelTypeChange('petrol', e.target.checked)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Petrol</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.fuelTypes.includes('diesel')}
                            onChange={(e) => handleFuelTypeChange('diesel', e.target.checked)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Diesel</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.fuelTypes.includes('petrol') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Petrol Price (₵/L) *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              name="petrolPrice"
                              type="number"
                              step="0.01"
                              required={formData.fuelTypes.includes('petrol')}
                              value={formData.petrolPrice}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g., 15.50"
                            />
                          </div>
                        </div>
                      )}

                      {formData.fuelTypes.includes('diesel') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Diesel Price (₵/L) *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              name="dieselPrice"
                              type="number"
                              step="0.01"
                              required={formData.fuelTypes.includes('diesel')}
                              value={formData.dieselPrice}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g., 16.20"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Operating Hours
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {days.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <div className="w-20 text-sm font-medium text-gray-700 capitalize">
                          {day.slice(0, 3)}
                        </div>
                        <input
                          type="time"
                          value={formData.operatingHours[day].open}
                          onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={formData.operatingHours[day].close}
                          onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Tell us about your station, services, or any special features..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                    I agree to FillUp's{' '}
                    <Link to="/terms" className="text-green-600 hover:text-green-500">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-green-600 hover:text-green-500">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 text-lg py-3 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Creating Account...' : 'Complete Registration'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Sign In Link */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Sign In Instead
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}