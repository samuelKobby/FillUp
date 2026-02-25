import React from 'react'
import { toast } from 'react-hot-toast'

/**
 * Drop-in replacement for window.confirm() using react-hot-toast.
 * Returns a Promise<boolean> — true if confirmed, false if cancelled.
 *
 * Usage:
 *   if (await showConfirm('Are you sure?')) { ... }
 */
export const showConfirm = (
  message: string,
  confirmLabel = 'Confirm',
  danger = true
): Promise<boolean> => {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3" style={{ minWidth: 240 }}>
          <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
            {message}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                resolve(false)
              }}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#cbd5e1',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id)
                resolve(true)
              }}
              className="px-3 py-1.5 text-xs rounded-lg text-white transition-colors"
              style={{
                background: danger ? '#ef4444' : '#3b82f6',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        icon: '⚠️',
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          maxWidth: '360px',
        },
      }
    )
  })
}
