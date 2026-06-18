import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'

type LanguageCode = 'en' | 'tw' | 'fr'

const defaultLanguage: LanguageCode = 'en'

export const LanguageSettings: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const storageKey = user ? `lang_${user.id}` : 'lang_guest'

  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setLanguage(raw as LanguageCode)
    } catch {
      // ignore
    }
  }, [storageKey])

  const save = async () => {
    setLoading(true)
    try {
      localStorage.setItem(storageKey, language)
      toast.success('Language saved')
      navigate('/profile')
    } catch {
      toast.error('Failed to save language')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24">
      <div className="bg-transparent px-6 pt-12 pb-6">
        <div className="flex items-center justify-center mb-6 relative">
          <button
            onClick={() => navigate('/profile', { state: { activeTab: 'profile' } })}
            className="p-2 hover:bg-gray-100 rounded-full"

            aria-label="Back"
          >
            <ArrowLeft01Icon size={24} />
          </button>
          <h1 className="text-xl font-semibold">Language</h1>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Choose your preferred language</h3>

          <div className="space-y-3">
            {(
              [
                { code: 'en' as const, label: 'English' },
                { code: 'tw' as const, label: 'Twi' },
                { code: 'fr' as const, label: 'Français' }
              ]
            ).map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  language === l.code
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="font-medium text-gray-900">{l.label}</span>
                <span className={`text-sm ${language === l.code ? 'text-green-600' : 'text-gray-400'}`}>
                  {language === l.code ? 'Selected' : ''}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => navigate('/profile', { state: { activeTab: 'profile' } })}
              disabled={loading}

              className="flex-1 px-4 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={loading}
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

