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
      x: isGoingBack ? '-30%' : '100%',
      opacity: 0,
      zIndex: 10,
    }),
    animate: {
      x: 0,
      opacity: 1,
      zIndex: 10,
      transition: {
        x: {
          type: 'spring',
          stiffness: 400,
          damping: 40,
          mass: 0.8
        },
        opacity: { duration: 0.2, ease: 'easeOut' }
      },
    },
    exit: (isGoingBack: boolean) => ({
      x: isGoingBack ? '100%' : '-30%',
      opacity: 0,
      zIndex: 5,
      transition: {
        x: {
          type: 'spring',
          stiffness: 400,
          damping: 40,
          mass: 0.8
        },
        opacity: { duration: 0.2, ease: 'easeIn' }
      },
    }),
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={location.pathname}
        custom={isGoingBack}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          width: '100%',
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

