import React, { createContext, useContext, ReactNode } from 'react'

interface ScrollContextType {
  // Reserved for future scroll-related state management
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined)

interface ScrollProviderProps {
  children: ReactNode
}

export const ScrollProvider: React.FC<ScrollProviderProps> = ({ children }) => {
  const value: ScrollContextType = {}

  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  )
}

export const useScrollContext = (): ScrollContextType => {
  const context = useContext(ScrollContext)
  if (context === undefined) {
    throw new Error('useScrollContext must be used within ScrollProvider')
  }
  return context
}
