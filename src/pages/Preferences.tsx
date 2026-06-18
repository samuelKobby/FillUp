import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Cancel01Icon, ArrowLeft01Icon } from 'hugeicons-react'

type NotificationSettings = {
  orderUpdates: boolean
  promotions: boolean
  news: boolean
  sms: boolean
}

type ProfilePreferences = {
  notification_settings?: NotificationSettings
}

const defaultSettings: NotificationSettings = {
  orderUpdates: true,
  promotions: true,
  news: false,
  sms: true
}

export const Preferences: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // We try to persist in users.notification_settings (jsonb) if the column exists.
  // If it doesn't exist, we fall back to localStorage so UI still works.
  const storageKey = user ? `pref_notifications_${user.id}` : 'pref_notifications_guest'

  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1) Try to load from DB (best case)
      const { data, error } = await supabase
        .from('users')
        .select('notification_settings')
        .eq('id', user.id)
        .maybeSingle()

      if (!error && data) {
        const db = (data as ProfilePreferences).notification_settings
        if (db) {
          setSettings({ ...defaultSettings, ...db })
          try {
            localStorage.setItem(storageKey, JSON.stringify({ ...defaultSettings, ...db }))
          } catch {
            // ignore
          }
          return
        }
      }

      // 2) Fall back to localStorage
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationSettings>
          setSettings({ ...defaultSettings, ...parsed })
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const onSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      // Save to DB if column exists; if it fails, save to localStorage.
      const { error } = await supabase
        .from('users')
        .update({ notification_settings: settings })
        .eq('id', user.id)

      if (error) {
        // local fallback
        try {
          localStorage.setItem(storageKey, JSON.stringify(settings))
        } catch {
          // ignore
        }
        toast.success('Saved locally')
        return
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(settings))
      } catch {
        // ignore
      }

      toast.success('Preferences saved')
    } catch (e: any) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(settings))
      } catch {
        // ignore
      }
      toast.success('Saved locally')
    } finally {
      setLoading(false)
    }
  }

  const ToggleRow = ({
    title,
    description,
    value,
    onChange
  }: {
    title: string
    description: string
    value: boolean
    onChange: (v: boolean) => void
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
      </label>
    </div>
  )

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
          <h1 className="text-xl font-semibold">Preferences</h1>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Notifications</h3>

          <div className="space-y-4">
            <ToggleRow
              title="Order Updates"
              description="Get notified about order status"
              value={settings.orderUpdates}
              onChange={(v) => setSettings((s) => ({ ...s, orderUpdates: v }))}
            />
            <ToggleRow
              title="Promotions"
              description="Receive special offers"
              value={settings.promotions}
              onChange={(v) => setSettings((s) => ({ ...s, promotions: v }))}
            />
            <ToggleRow
              title="News"
              description="Product and community updates"
              value={settings.news}
              onChange={(v) => setSettings((s) => ({ ...s, news: v }))}
            />
            <ToggleRow
              title="SMS Notifications"
              description="Text message updates"
              value={settings.sms}
              onChange={(v) => setSettings((s) => ({ ...s, sms: v }))}
            />
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
              onClick={() => void onSave()}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors shadow-md"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Prevent unused import warnings */}
      <div className="hidden">
        <Cancel01Icon size={0} />
      </div>
    </div>
  )
}

