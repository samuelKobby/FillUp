import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Home01Icon, CreditCardIcon, Time02Icon, UserIcon } from 'hugeicons-react'

interface BottomTabNavProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const BottomTabNav: React.FC<BottomTabNavProps> = ({ activeTab, setActiveTab }) => {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('bottom-tab-portal')
    
    if (!container) {
      container = document.createElement('div')
      container.id = 'bottom-tab-portal'
      document.body.appendChild(container)
    }
    
    setPortalContainer(container)

    // Cleanup function
    return () => {
      // Don't remove the container on unmount to prevent HMR issues
      // It will be reused or cleaned up on full page reload
    }
  }, [])

  if (!portalContainer) return null

  return createPortal(
    <nav style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      height: '70px',
      backgroundColor: 'white',
      borderRadius: '35px',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px'
    }}>
      <div className="flex items-center w-full px-2">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center justify-center transition-all ${
            activeTab === 'home' 
              ? 'text-gray-800' 
              : 'text-gray-500'
          }`}
        >
          <div className={`p-3 rounded-full transition-all ${
            activeTab === 'home' 
              ? 'bg-orange-500 text-gray-800 scale-110' 
              : 'bg-transparent'
          }`}>
            <Home01Icon size={24} color={activeTab === 'home' ? '#1F2937' : '#6B7280'} />
          </div>
        </button>

        <div className="flex items-center justify-evenly flex-1">
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center justify-center transition-all ${
            activeTab === 'wallet' 
              ? 'text-gray-800' 
              : 'text-gray-500'
          }`}
        >
          <div className={`p-3 rounded-full transition-all ${
            activeTab === 'wallet' 
              ? 'bg-orange-500 text-gray-800 scale-110' 
              : 'bg-transparent'
          }`}>
            <CreditCardIcon size={24} color={activeTab === 'wallet' ? '#1F2937' : '#6B7280'} />
          </div>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center justify-center transition-all ${
            activeTab === 'orders' 
              ? 'text-gray-800' 
              : 'text-gray-500'
          }`}
        >
          <div className={`p-3 rounded-full transition-all ${
            activeTab === 'orders' 
              ? 'bg-orange-500 text-gray-800 scale-110' 
              : 'bg-transparent'
          }`}>
            <Time02Icon size={24} color={activeTab === 'orders' ? '#1F2937' : '#6B7280'} />
          </div>
        </button>
        </div>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center justify-center transition-all ${
            activeTab === 'profile' 
              ? 'text-gray-800' 
              : 'text-gray-500'
          }`}
        >
          <div className={`p-3 rounded-full transition-all ${
            activeTab === 'profile' 
              ? 'bg-orange-500 text-gray-800 scale-110' 
              : 'bg-transparent'
          }`}>
            <UserIcon size={24} color={activeTab === 'profile' ? '#1F2937' : '#6B7280'} />
          </div>
        </button>
      </div>
    </nav>,
    portalContainer
  )
}
