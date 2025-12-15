import React from 'react'
import ReactDOM from 'react-dom'
import { AlertCircleIcon, Cancel01Icon } from 'hugeicons-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'red' | 'blue' | 'green'
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'red'
}) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700'
  }

  return ReactDOM.createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[9999]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-sm p-4"
        style={{ position: 'fixed' }}
      >
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              confirmColor === 'red' ? 'bg-red-100' : 
              confirmColor === 'blue' ? 'bg-blue-100' : 
              'bg-green-100'
            }`}>
              <AlertCircleIcon 
                size={24} 
                color={
                  confirmColor === 'red' ? '#DC2626' : 
                  confirmColor === 'blue' ? '#2563EB' : 
                  '#16A34A'
                } 
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-3 ${colorClasses[confirmColor]} text-white rounded-xl font-medium transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
