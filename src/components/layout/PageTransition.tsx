import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigationType } from 'react-router-dom'

interface PageTransitionProps {
  children: React.ReactNode
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPathRef = useRef<string>(location.pathname)

  // Determine if navigating forward or backward
  const isGoingBack = navigationType === 'POP'

  useEffect(() => {
    previousPathRef.current = location.pathname
  }, [location.pathname])

  const pageVariants = {
    initial: (isGoingBack: boolean) => ({
      x: isGoingBack ? '-100vw' : '100vw',
      zIndex: 10,
    }),
    animate: {
      x: 0,
      zIndex: 10,
      transition: {
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96],
      },
    },
    exit: (isGoingBack: boolean) => ({
      x: isGoingBack ? '100vw' : '-100vw',
      zIndex: 5,
      transition: {
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96],
      },
    }),
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={location.pathname}
        custom={isGoingBack}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          position: 'absolute',
          width: '100%',
          top: 0,
          left: 0,
          overflow: 'auto',
          backgroundColor: '#ffffff',
          willChange: 'transform',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

