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

  // WhatsApp-style easing: custom cubic-bezier for smooth, natural feel
  const whatsappEasing = [0.4, 0.0, 0.2, 1] // Material Design standard easing
  const duration = 0.22 // 220ms - WhatsApp's actual duration

  const pageVariants = {
    initial: (isGoingBack: boolean) => ({
      x: isGoingBack ? '-30%' : '100%', // Incoming from left (back) or right (forward)
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
    }),
    animate: {
      x: 0,
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
      transition: {
        x: {
          type: 'tween',
          ease: whatsappEasing,
          duration: duration,
        },
      },
    },
    exit: (isGoingBack: boolean) => ({
      x: isGoingBack ? '100%' : '-30%', // Exit to right (back) or left (forward) with parallax
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
      transition: {
        x: {
          type: 'tween',
          ease: whatsappEasing,
          duration: duration,
        },
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
          width: '100%',
          height: '100vh',
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

