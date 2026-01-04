import React from 'react'
import { WifiOff01Icon } from 'hugeicons-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OfflineIndicatorProps {
  isOffline: boolean
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOffline }) => {
  return (
    <AnimatePresence mode="wait">
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-3 shadow-lg pointer-events-auto"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="flex items-center justify-center space-x-3">
            <WifiOff01Icon size={20} color="white" />
            <div>
              <p className="font-semibold text-sm">No Internet Connection</p>
              <p className="text-xs opacity-90">Some features may not be available</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
