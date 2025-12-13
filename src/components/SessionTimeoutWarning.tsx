import React from 'react'
import { Clock, RefreshCw, LogOut } from 'lucide-react'

interface SessionTimeoutWarningProps {
  timeLeft: string
  onExtend: () => void
  onSignOut: () => void
  show: boolean
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  timeLeft,
  onExtend,
  onSignOut,
  show
}) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]">
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-8 rounded-2xl border border-white/20 shadow-2xl max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">
            Session Expiring Soon
          </h3>
          
          <p className="text-gray-300 mb-6">
            Your session will expire in <span className="font-mono text-yellow-400 text-lg">{timeLeft}</span>
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onExtend}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Stay Signed In
            </button>
            
            <button
              onClick={onSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-400 font-medium transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
