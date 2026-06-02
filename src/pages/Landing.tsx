import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Header } from '../components/layout/Header'
import { useAuth } from '../contexts/AuthContext'
import heroVideo from '../assets/hero.mp4'
import wheelImg from '../assets/wheel.png'
import carImg from '../assets/car.png'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { 
  Fuel, 
  Wrench, 
  MapPin, 
  Clock, 
  Shield, 
  Star,
  Smartphone,
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MessageSquare,
  Award,
  Zap,
  TrendingUp,
  ChevronUp,
  Home,
  ChevronDown,
  ExternalLink,
  Menu,
  X
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { TestimonialsSection } from '../components/TestimonialsMarquee'

interface LandingProps {
  showSplash?: boolean
}

export const Landing: React.FC<LandingProps> = ({ showSplash = false }) => {
  const { user, userRole } = useAuth()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [activeService, setActiveService] = useState(0)
  const [stackOrder, setStackOrder] = useState([0, 1, 2, 3])
  const [cardLeaving, setCardLeaving] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const cardLeavingRef = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)
  const scrollIndexRef = useRef(0)

  const rotateStack = useCallback(() => {
    if (cardLeavingRef.current) return
    cardLeavingRef.current = true
    setCardLeaving(true)
    setTimeout(() => {
      setStackOrder(prev => {
        const next = [...prev]
        const first = next.shift()!
        next.push(first)
        setActiveService(next[0])
        return next
      })
      setCardLeaving(false)
      cardLeavingRef.current = false
    }, 420)
  }, [])

  const rotateStackBack = useCallback(() => {
    if (cardLeavingRef.current) return
    cardLeavingRef.current = true
    setStackOrder(prev => {
      const next = [...prev]
      const last = next.pop()!
      next.unshift(last)
      setActiveService(next[0])
      return next
    })
    setTimeout(() => { cardLeavingRef.current = false }, 520)
  }, [])

  // Window-level scroll hijack: capture wheel events while services section is active
  useEffect(() => {
    const lastWheelTimeRef = { current: 0 }
    const THROTTLE = 680

    const onWheel = (e: WheelEvent) => {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()

      // Auto-reset index if section is completely outside the viewport
      if (rect.top > window.innerHeight) {
        scrollIndexRef.current = 0   // section below view → reset forward
        return
      }
      if (rect.bottom < 0) {
        scrollIndexRef.current = 3   // section above view → reset backward
        return
      }

      // "Engaged" = section top has entered the viewport and is near the top
      // (between -80px and 160px of viewport top) — user has "arrived" at section
      const engaged = rect.top >= -80 && rect.top <= 160
      if (!engaged) return

      if (e.deltaY > 0) {
        // Scrolling DOWN — intercept only when there are still cards to show
        if (scrollIndexRef.current < 3) {
          e.preventDefault()   // prevent page scroll FIRST
          const now = Date.now()
          if (now - lastWheelTimeRef.current > THROTTLE) {
            lastWheelTimeRef.current = now
            rotateStack()
            scrollIndexRef.current++
          }
        }
        // index === 3: all cards shown, let scroll pass naturally
      } else if (e.deltaY < 0) {
        // Scrolling UP — intercept only when cards can still go back
        if (scrollIndexRef.current > 0) {
          e.preventDefault()   // prevent page scroll FIRST
          const now = Date.now()
          if (now - lastWheelTimeRef.current > THROTTLE) {
            lastWheelTimeRef.current = now
            rotateStackBack()
            scrollIndexRef.current--
          }
        }
        // index === 0: first card, let scroll pass naturally
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [rotateStack, rotateStackBack])

  // Handle menu close with animation
  const handleCloseMenu = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowMobileMenu(false)
      setIsClosing(false)
    }, 300) // Match animation duration
  }

  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: false,
      offset: 100
    })
  }, [])

  // Redirect logged-in users to their respective dashboards
  if (user && userRole) {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (userRole === 'agent') return <Navigate to="/agent/dashboard" replace />
    if (userRole === 'station') return <Navigate to="/station/dashboard" replace />
    if (userRole === 'customer') return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setShowScrollTop(scrollTop > 300)
      setScrollY(scrollTop)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      setMouseX(x)
      setMouseY(y)
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      {/* Desktop Floating Navigation Pill - Hidden on Mobile */}
      {!showSplash && createPortal(
        <nav 
          className="hidden md:block fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300"
          onMouseLeave={() => {
            setActiveDropdown(null)
            setHoveredItem(null)
          }}
        >
          <div className={`bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-3xl shadow-2xl backdrop-blur-sm transition-all duration-300 ${
            activeDropdown ? 'px-6 py-6' : 'px-6 py-3'
          }`}>
            {!activeDropdown ? (
              /* Collapsed State */
              <div className="flex items-center gap-6 w-[450px]">
                {/* Home Icon */}
                <Link to="/" className="text-white hover:scale-110 transition-transform">
                  <Home className="h-5 w-5" />
                </Link>

                {/* For Customers */}
                <button 
                  className="text-white font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActiveDropdown('customers')}
                >
                  For Customers
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* For Agents */}
                <button 
                  className="text-white font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActiveDropdown('agents')}
                >
                  For Agents
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* For Stations */}
                <button 
                  className="text-white font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActiveDropdown('stations')}
                >
                  For Stations
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Expanded State */
              <div className="flex flex-col w-[450px]">
                {/* Dropdown content */}
                <div className="mb-3 flex gap-6">
                  <div className="flex-1">
                    {activeDropdown === 'customers' && (
                      <div className="flex flex-col gap-2">
                        <Link 
                          to="/auth/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'fuel' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('fuel')}
                        >
                          Fuel Delivery
                        </Link>
                        <Link 
                          to="/auth/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'mechanic' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('mechanic')}
                        >
                          Mechanic Service
                        </Link>
                        <a 
                          href="#how-it-works" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'how-it-works' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('how-it-works')}
                        >
                          How It Works
                        </a>
                      </div>
                    )}

                    {activeDropdown === 'agents' && (
                      <div className="flex flex-col gap-2">
                        <Link 
                          to="/auth/agent/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'become-agent' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('become-agent')}
                        >
                          Become an Agent
                        </Link>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'agent-benefits' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('agent-benefits')}
                        >
                          Agent Benefits
                        </a>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'earnings' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('earnings')}
                        >
                          Earnings
                        </a>
                      </div>
                    )}

                    {activeDropdown === 'stations' && (
                      <div className="flex flex-col gap-2">
                        <Link 
                          to="/auth/station/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'partner' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('partner')}
                        >
                          Partner With Us
                        </Link>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'station-benefits' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('station-benefits')}
                        >
                          Station Benefits
                        </a>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'requirements' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('requirements')}
                        >
                          Requirements
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right side - Icon preview - Only show when hovering on links */}
                  {hoveredItem && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-20 h-20 flex items-center justify-center flex-shrink-0">
                      {hoveredItem === 'fuel' && <Fuel className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'mechanic' && <Wrench className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'how-it-works' && <CheckCircle className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'become-agent' && <Users className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'agent-benefits' && <Award className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'earnings' && <TrendingUp className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'partner' && <MapPin className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'station-benefits' && <Star className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'requirements' && <Shield className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                    </div>
                  )}
                </div>

                {/* Main navigation buttons - Always visible at same position */}
                <div className="flex items-center gap-4 pt-3 border-t border-white/20">
                  {/* Home Icon */}
                  <Link to="/" className="text-white hover:scale-110 transition-transform">
                    <Home className="h-5 w-5" />
                  </Link>

                  <button 
                    className={`text-white font-medium flex items-center gap-1 transition-opacity ${
                      activeDropdown === 'customers' ? 'opacity-100' : 'opacity-60'
                    }`}
                    onMouseEnter={() => setActiveDropdown('customers')}
                  >
                    For Customers
                    {activeDropdown === 'customers' && <ChevronUp className="h-4 w-4" />}
                    {activeDropdown !== 'customers' && <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button 
                    className={`text-white font-medium flex items-center gap-1 transition-opacity ${
                      activeDropdown === 'agents' ? 'opacity-100' : 'opacity-60'
                    }`}
                    onMouseEnter={() => setActiveDropdown('agents')}
                  >
                    For Agents
                    {activeDropdown === 'agents' && <ChevronUp className="h-4 w-4" />}
                    {activeDropdown !== 'agents' && <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button 
                    className={`text-white font-medium flex items-center gap-1 transition-opacity ${
                      activeDropdown === 'stations' ? 'opacity-100' : 'opacity-60'
                    }`}
                    onMouseEnter={() => setActiveDropdown('stations')}
                  >
                    For Stations
                    {activeDropdown === 'stations' && <ChevronUp className="h-4 w-4" />}
                    {activeDropdown !== 'stations' && <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>,
        document.body
      )}

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      {!showSplash && createPortal(
        <>
          <button
            onClick={() => showMobileMenu ? handleCloseMenu() : setShowMobileMenu(true)}
            className="md:hidden fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform"
          >
            {showMobileMenu ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Mobile Slide-in Menu */}
          {showMobileMenu && (
            <>
              {/* Overlay */}
              <div 
                className="md:hidden fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
                onClick={handleCloseMenu}
              />
              
              {/* Slide-in Menu */}
              <div className={`md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 z-[9999] shadow-2xl overflow-y-auto ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
                {/* Header */}
                <div className="p-6 border-b border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Menu</h2>
                    <button
                      onClick={handleCloseMenu}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <ChevronDown className="h-5 w-5 rotate-90" />
                    </button>
                  </div>
                  <Link 
                    to="/" 
                    onClick={handleCloseMenu}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Home className="h-5 w-5" />
                    <span className="text-sm font-medium">Home</span>
                  </Link>
                </div>

                {/* Menu Items */}
                <div className="p-6 space-y-6">
                  {/* For Customers */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        For Customers
                      </h3>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Fuel className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to="/auth/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Fuel Delivery</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <Link
                        to="/auth/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Mechanic Service</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <a
                        href="#how-it-works"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>How It Works</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                    </div>
                  </div>

                  {/* For Agents */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        For Agents
                      </h3>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to="/auth/agent/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Become an Agent</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Agent Benefits</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Earnings</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                    </div>
                  </div>

                  {/* For Stations */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Fuel className="h-5 w-5" />
                        For Stations
                      </h3>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to="/auth/station/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Partner With Us</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Station Benefits</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Requirements</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>,
        document.body
      )}

      <div className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative w-full h-screen text-white overflow-hidden z-10" style={{
          background: 'radial-gradient(ellipse at top right, #f6850a, #9f3b07)'
        }}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute w-full h-full object-fill z-0"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`
          }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Wheel Image - Left Center */}
        <div 
          className="absolute left-4 top-20 w-32 h-32 md:left-20 md:top-32 md:w-48 md:h-48 transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 cursor-pointer z-20"
          style={{
            transform: `translateY(${scrollY * 0.3}px) translateX(${mouseX * 20}px) translateY(${mouseY * 20}px)`
          }}
        >
          <img 
            src={wheelImg} 
            alt="Wheel"
            className="w-full h-full object-contain"
            style={{
              animation: "slideDiagonalLeft 8s ease-in-out infinite alternate"
            }}
          />
        </div>
        
        {/* Car Image - Right Bottom */}
        <div 
          className="absolute right-4 bottom-28 w-40 h-40 md:right-20 md:bottom-10 md:w-68 md:h-68 transition-all duration-500 ease-out hover:scale-110 hover:-rotate-6 cursor-pointer z-20"
          style={{
            transform: `translateY(${scrollY * -0.2}px) translateX(${mouseX * 15}px) translateY(${mouseY * 15}px)`
          }}
        >
          <img 
            src={carImg} 
            alt="Car"
            className="w-full h-full object-contain"
            style={{
              animation: "slideDiagonalRight 8s ease-in-out infinite alternate"
            }}
          />
        </div>
        
        {/* Diagonal Slide Animations */}
        <style>{`
          @keyframes slideDiagonalLeft {
            0% {
              transform: translateY(50%) translateX(0) rotate(0deg);
            }
            100% {
              transform: translateY(calc(50% - 20px)) translateX(-20px) rotate(-5deg);
            }
          }
          @keyframes slideDiagonalRight {
            0% {
              transform: translateX(0) translateY(0) rotate(0deg);
            }
            100% {
              transform: translateX(20px) translateY(-20px) rotate(5deg);
            }
          }
          @keyframes zoomOut {
            0% {
              transform: scale(1.5);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes slide-in {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
          @keyframes slide-out {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-100%);
            }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
          .animate-slide-out {
            animation: slide-out 0.3s ease-out;
          }
        `}</style>
        
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 md:pt-16">
          <div className="flex flex-col md:flex-row justify-between items-start h-full min-h-[70vh] relative">
            {/* Left side text */}
            <div 
              className="text-left z-10 mt-32 md:mt-0 md:self-start"
              style={{
                transform: `translateY(${scrollY * 0.15}px)`
              }}
            >
              <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
                Fuel delivery<br />
                makes
              </h1>
              <div className="mt-4 rotate-90 origin-left hidden md:block">
                <span className="text-sm font-medium text-white/80 tracking-widest uppercase">
                  Scroll Down
                </span>
              </div>
            </div>
            
            {/* Right side text */}
            <div 
              className="text-right self-end z-10 mb-48 md:mb-0"
              style={{
                transform: `translateY(${scrollY * 0.15}px)`
              }}
            >
              <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
                Everything<br />
                better.
              </h1>
              <div className="mt-4 -rotate-90 origin-right hidden md:block">
                <span className="text-sm font-medium text-white/80 tracking-widest uppercase">
                  Scroll Down
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="relative z-20 overflow-hidden pt-16 pb-20 md:pt-20 md:pb-24"
        style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #fff7f0 50%, #f0fff4 100%)' }}
      >
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{position:'absolute', top:'5%', left:'5%', width:'500px', height:'500px', background:'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', borderRadius:'50%'}} />
          <div style={{position:'absolute', top:'5%', right:'5%', width:'500px', height:'500px', background:'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)', borderRadius:'50%'}} />
          <div style={{position:'absolute', bottom:'0%', left:'30%', width:'600px', height:'300px', background:'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)', borderRadius:'50%'}} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

          {/* Giant title — sits behind the cards */}
          <div className="text-center relative pointer-events-none mb-10 md:-mb-4" style={{ zIndex: 1 }} data-aos="fade-up">
            <h2 style={{
              fontSize: 'clamp(40px, 7vw, 88px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(160deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              userSelect: 'none',
              opacity: 0.95,
            }}>
              How it Works
            </h2>
          </div>

          {/* Phone card trio */}
          {/* Mobile: simplified step cards */}
          <div className="md:hidden mt-8 grid grid-cols-1 gap-4" data-aos="fade-up" data-aos-delay="100">
            {[
              {
                title: 'Request Service',
                desc: 'Open the app, choose your service and specify your requirements.',
                icon: Fuel,
                iconBg: 'bg-blue-50',
                iconFg: 'text-blue-600',
              },
              {
                title: 'Get Matched',
                desc: 'We match you with a nearby verified agent and dispatch instantly.',
                icon: Zap,
                iconBg: 'bg-orange-50',
                iconFg: 'text-orange-600',
              },
              {
                title: 'Service Complete',
                desc: 'Receive your service, pay securely in-app, and rate your experience.',
                icon: CheckCircle,
                iconBg: 'bg-green-50',
                iconFg: 'text-green-600',
              },
            ].map((step) => {
              const Icon = step.icon
              return (
                <Card key={step.title} className="shadow-xl">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${step.iconBg}`}>
                        <Icon className={`h-5 w-5 ${step.iconFg}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900">{step.title}</div>
                        <div className="text-sm text-gray-600 mt-1 leading-relaxed">{step.desc}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop: interactive phone trio */}
          <div className="hidden md:flex items-center justify-center relative" style={{perspective: '1200px', gap: '0px', zIndex: 10}}>

            {/* ── Card 1: Request Service (left, receded) ── */}
            <div
              data-aos="fade-right"
              data-aos-delay="150"
              className="relative flex-shrink-0"
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                width: '232px',
                zIndex: hoveredCard === 1 ? 30 : 1,
                transform: hoveredCard === 1
                  ? 'rotateY(0deg) translateX(0px) translateY(0px) scale(1.06)'
                  : 'rotateY(12deg) translateX(24px) translateY(32px) scale(0.93)',
                transformOrigin: 'right center',
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), z-index 0s',
                cursor: 'pointer',
              }}
            >
              <div
                className="relative rounded-[2.5rem] overflow-hidden flex flex-col"
                style={{
                  height: '480px',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: hoveredCard === 1 ? '1.5px solid rgba(59,130,246,0.35)' : '1.5px solid rgba(255,255,255,0.85)',
                  boxShadow: hoveredCard === 1
                    ? '0 32px 80px rgba(59,130,246,0.20), 0 4px 16px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,0.9)'
                    : '0 8px 40px rgba(59,130,246,0.10), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                  transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
                }}
              >
                {/* Top notch bar */}
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-16 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="px-5 pt-2 flex-1 flex flex-col">
                  {/* Nav icon */}
                  <div className="flex justify-center mb-5">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Fuel className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>

                  {/* Card content */}
                  <h3 className="text-base font-semibold text-gray-800 text-center mb-4">Request Service</h3>

                  {/* Mock UI */}
                  <div className="space-y-2.5">
                    {/* Service type pill row */}
                    <div className="flex gap-2">
                      <span className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm font-medium">
                        <Fuel className="h-2.5 w-2.5" /> Fuel
                      </span>
                      <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full font-medium">
                        Mechanic
                      </span>
                    </div>

                    {/* Location row */}
                    <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-2.5 border border-gray-100">
                      <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 bg-gray-300 rounded-full w-full" />
                        <div className="h-1.5 bg-gray-200 rounded-full w-2/3" />
                      </div>
                    </div>

                    {/* Quantity selector mock */}
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <div className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Litres</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['5 L', '10 L', '20 L'].map((l, i) => (
                          <div key={l} className={`rounded-xl py-1.5 text-center text-xs font-semibold border transition-colors ${i === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom description */}
                <div className="px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent mt-auto">
                  <p className="text-[11px] text-gray-400 leading-relaxed text-center">
                    Open the app, choose your service and specify your requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Card 2: Get Matched (CENTER, large) ── */}
            <div
              data-aos="fade-up"
              data-aos-delay="0"
              className="relative flex-shrink-0"
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                zIndex: hoveredCard === 2 ? 30 : 10,
                width: '272px',
                transform: hoveredCard === 2 ? 'translateY(-16px) scale(1.05)' : 'translateY(0) scale(1)',
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), z-index 0s',
                cursor: 'pointer',
              }}
            >
              {/* Colored glow ring */}
              <div
                className="absolute inset-0 rounded-[2.8rem]"
                style={{
                  background: hoveredCard === 2
                    ? 'linear-gradient(135deg, rgba(249,115,22,0.40) 0%, rgba(59,130,246,0.35) 100%)'
                    : 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(59,130,246,0.20) 100%)',
                  filter: 'blur(20px)',
                  transform: 'scale(1.08)',
                  transition: 'background 0.35s ease',
                }}
              />
              <div
                className="relative rounded-[2.8rem] overflow-hidden flex flex-col"
                style={{
                  height: '540px',
                  background: 'rgba(255,255,255,0.60)',
                  backdropFilter: 'blur(28px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                  border: hoveredCard === 2 ? '2px solid rgba(249,115,22,0.50)' : '2px solid rgba(249,115,22,0.30)',
                  boxShadow: hoveredCard === 2
                    ? '0 40px 100px rgba(59,130,246,0.22), 0 8px 30px rgba(249,115,22,0.18), inset 0 1px 0 rgba(255,255,255,0.95)'
                    : '0 24px 64px rgba(59,130,246,0.15), 0 4px 16px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                  transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
                }}
              >
                {/* Top notch */}
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-16 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="px-5 pt-2 flex-1 flex flex-col">
                  {/* Icon */}
                  <div className="flex justify-center mb-5">
                    <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                      <Zap className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>

                  {/* Toggle pills */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full font-medium">Fuel</span>
                    <span className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">Agent</span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800 mb-5">Get Matched</h3>

                  {/* Waveform bars — signal/connection visual */}
                  <div className="flex items-end justify-center gap-[3px] mb-4" style={{height: '64px'}}>
                    {[20, 36, 52, 64, 52, 56, 44, 64, 48, 36, 20].map((h, i) => (
                      <div
                        key={i}
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: '6px',
                          height: `${h}px`,
                          background: i >= 4 && i <= 7
                            ? 'linear-gradient(to top, #f97316, #fb923c)'
                            : 'linear-gradient(to top, #3b82f6, #93c5fd)',
                          opacity: 0.75 + (i % 3) * 0.08,
                        }}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 text-center mb-4">Connecting to nearest agent…</p>

                  {/* Agent match card */}
                  <div className="bg-blue-50 rounded-2xl p-3 flex items-center gap-3 border border-blue-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-2 bg-blue-200 rounded-full w-20 mb-1.5" />
                      <div className="h-1.5 bg-blue-100 rounded-full w-14" />
                    </div>
                    <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0">0.8 km</div>
                  </div>
                </div>

                {/* Bottom */}
                <div className="px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent mt-auto">
                  <p className="text-[11px] text-gray-400 leading-relaxed text-center">
                    We instantly connect you with the nearest verified agent. Track them in real-time as they head your way.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Card 3: Service Complete (right, receded) ── */}
            <div
              data-aos="fade-left"
              data-aos-delay="150"
              className="relative flex-shrink-0"
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                width: '232px',
                zIndex: hoveredCard === 3 ? 30 : 1,
                transform: hoveredCard === 3
                  ? 'rotateY(0deg) translateX(0px) translateY(0px) scale(1.06)'
                  : 'rotateY(-12deg) translateX(-24px) translateY(32px) scale(0.93)',
                transformOrigin: 'left center',
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), z-index 0s',
                cursor: 'pointer',
              }}
            >
              <div
                className="relative rounded-[2.5rem] overflow-hidden flex flex-col"
                style={{
                  height: '480px',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: hoveredCard === 3 ? '1.5px solid rgba(34,197,94,0.35)' : '1.5px solid rgba(255,255,255,0.85)',
                  boxShadow: hoveredCard === 3
                    ? '0 32px 80px rgba(34,197,94,0.20), 0 4px 16px rgba(34,197,94,0.10), inset 0 1px 0 rgba(255,255,255,0.9)'
                    : '0 8px 40px rgba(34,197,94,0.10), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                  transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
                }}
              >
                {/* Notch */}
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-16 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="px-5 pt-2 flex-1 flex flex-col">
                  {/* Icon */}
                  <div className="flex justify-center mb-5">
                    <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-gray-800 text-center mb-4">Service Complete</h3>

                  {/* Order history items — like the calendar in the image */}
                  <div className="space-y-2">
                    {[
                      { date: 'Today', time: '2:30 PM – 3:00 PM', label: 'Fuel Delivery', active: true },
                      { date: 'Mar 5', time: '10:00 AM – 11:00 AM', label: 'Mechanic Visit', active: false },
                      { date: 'Mar 12', time: '1:00 PM – 1:30 PM', label: 'Fuel Delivery', active: false },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`rounded-2xl px-3 py-2.5 border ${item.active ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}
                      >
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{item.date}</div>
                        <div className="text-[11px] text-gray-500 mb-0.5">{item.time}</div>
                        <div className={`text-xs font-semibold ${item.active ? 'text-blue-700' : 'text-gray-600'}`}>{item.label}</div>
                        {item.active && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-[10px] text-green-600 font-medium">Completed · ₵48.00</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom */}
                <div className="px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent mt-auto">
                  <p className="text-[11px] text-gray-400 leading-relaxed text-center">
                    Receive your service, pay securely in-app, and rate your experience.
                  </p>
                </div>
              </div>
            </div>

          </div>{/* end card trio */}
        </div>
      </section>

      {/* Services */}
      <section id="services" ref={sectionRef as React.RefObject<HTMLDivElement>} className="py-16 md:py-24 relative z-20 overflow-hidden" style={{background:'linear-gradient(170deg,#f0f6ff 0%,#fff8f0 55%,#f0fff8 100%)'}}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{position:'absolute',top:'-10%',left:'-8%',width:'520px',height:'520px',background:'radial-gradient(circle,rgba(59,130,246,0.09) 0%,transparent 70%)',borderRadius:'50%'}} />
          <div style={{position:'absolute',bottom:'-5%',right:'-5%',width:'480px',height:'480px',background:'radial-gradient(circle,rgba(249,115,22,0.08) 0%,transparent 70%)',borderRadius:'50%'}} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

          {/* Header */}
          <div className="text-center mb-10 md:mb-14" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full mb-5">
              <Award className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-600">Premium Services</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{letterSpacing:'-0.03em'}}>
              Everything you need,{' '}
              <span style={{background:'linear-gradient(90deg,#f97316,#fb923c)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>delivered.</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-500">
              <span className="lg:hidden">Tap a service to preview the dashboard experience</span>
              <span className="hidden lg:inline">Click a service to preview the live dashboard experience</span>
            </p>
          </div>

          {/* Main layout: tabs left + MacBook right */}
          <div className="flex flex-col lg:flex-row gap-8 items-start" data-aos="fade-up" data-aos-delay="100">

            {/* ── Left: phone-sized fan stack cards (desktop) + service cards (mobile) ── */}
            {(()=>{
              const svcs = [
                {
                  name:'Fuel Delivery', icon:Fuel, color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', price:'From ₵15/L',
                  desc:'Premium petrol & diesel delivered to your exact GPS location, 24/7.',
                  features:['Petrol & Diesel available','Real-time agent tracking','Pay securely in-app'],
                  stats:[{label:'Today\'s Orders',val:'48'},{label:'Active Agents',val:'12'}],
                  visual:{ type:'fuel', bars:[90,70,55,80,65,45,75] }
                },
                {
                  name:'Mobile Mechanic', icon:Wrench, color:'#f97316', bg:'#fff7ed', border:'#fed7aa', price:'From ₵50',
                  desc:'Licensed mechanics dispatched to your location for repairs & maintenance.',
                  features:['Engine, brakes & electrical','Licensed & vetted technicians','30-min average response'],
                  stats:[{label:'Avg. Rating',val:'4.9 ★'},{label:'Jobs Done',val:'1.2k'}],
                  visual:{ type:'mechanic', bars:[60,80,70,90,75,85,65] }
                },
                {
                  name:'Battery Jump-Start', icon:Zap, color:'#22c55e', bg:'#f0fdf4', border:'#bbf7d0', price:'From ₵40',
                  desc:'Fast, guaranteed jump-start for any car battery — get back on the road fast.',
                  features:['Works on all car types','Usually under 15 minutes','Guaranteed or free retry'],
                  stats:[{label:'Avg. Arrival',val:'11 min'},{label:'Success Rate',val:'99%'}],
                  visual:{ type:'battery', bars:[30,50,65,80,90,70,55] }
                },
                {
                  name:'Tire Change', icon:Shield, color:'#a855f7', bg:'#faf5ff', border:'#e9d5ff', price:'From ₵60',
                  desc:'Professional on-demand tire change, repair and balancing wherever you are.',
                  features:['All tire sizes covered','Balancing & fitting included','Spare tire available'],
                  stats:[{label:'Tires Changed',val:'800+'},{label:'Coverage',val:'5 km radius'}],
                  visual:{ type:'tire', bars:[55,70,80,65,90,75,60] }
                },
              ]

              const CARD_W = 278
              const CARD_H = 420
              const FAN_X = 24    // px right per depth level
              const FAN_Y = 16    // px up per depth level
              const FAN_ROT = 4.5 // deg clockwise per depth level
              const N = 4
              const MAX_TOP = (N - 1) * FAN_Y  // = 48px
              const MAX_LEFT = (N - 1) * FAN_X // = 72px
              const containerW = CARD_W + MAX_LEFT + 24
              const containerH = CARD_H + MAX_TOP + 24

              return (
                <>
                  {/* Mobile/tablet: readable service cards */}
                  <div className="w-full lg:hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                      {svcs.map((svc) => {
                        const Icon = svc.icon
                        return (
                          <Card key={svc.name} hover>
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <div
                                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: svc.bg }}
                                >
                                  <Icon className="h-5 w-5" style={{ color: svc.color }} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-base font-semibold text-gray-900 truncate">{svc.name}</div>
                                    <div
                                      className="text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap"
                                      style={{ color: svc.color, background: svc.bg, border: `1px solid ${svc.border}` }}
                                    >
                                      {svc.price}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1 leading-relaxed">{svc.desc}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>

                  {/* Desktop: interactive fan stack */}
                  <div
                    ref={stackRef}
                    className="flex-shrink-0 hidden lg:block select-none"
                    style={{
                      width:`${containerW}px`,
                      height:`${containerH}px`,
                      position:'relative',
                      cursor:'pointer',
                    }}
                    onClick={rotateStack}
                  >
                  {/* Progress dots */}
                  <div style={{
                    position:'absolute',
                    bottom:'-36px',
                    left:0, right:0,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:'6px',
                  }}>
                    {svcs.map((_, i) => {
                      const isActive = stackOrder[0] === i
                      return (
                        <div key={i} style={{
                          width: isActive ? '18px' : '6px',
                          height:'6px',
                          borderRadius:'999px',
                          background: isActive ? svcs[stackOrder[0]].color : '#d1d5db',
                          transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                        }} />
                      )
                    })}
                  </div>
                  {/* Scroll hint */}
                  <div style={{
                    position:'absolute',
                    bottom:'-58px',
                    left:0, right:0,
                    textAlign:'center',
                    fontSize:'10.5px',
                    color:'#9ca3af',
                    fontWeight:500,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:'4px',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M3 7l3 3 3-3" stroke="#d1d5db" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Scroll to explore all services
                  </div>

                  {svcs.map((svc, i) => {
                    const pos = stackOrder.indexOf(i)
                    const isTop = pos === 0
                    const isLeaving = cardLeaving && isTop
                    const Icon = svc.icon

                    // Fan positions: front=lower-left, back=upper-right (money spread)
                    const left = pos * FAN_X                 // front: leftmost, back: rightmost
                    const top  = MAX_TOP - pos * FAN_Y       // front: MAX_TOP (lower), back: 0 (higher)
                    const rotate = pos * FAN_ROT
                    const scale = 1 - pos * 0.025
                    const opacity = pos === 0 ? 1 : Math.max(0.55, 1 - pos * 0.15)
                    const brightness = 1 - pos * 0.06

                    return (
                      <div
                        key={svc.name}
                        style={{
                          position:'absolute',
                          left:`${left}px`,
                          top:`${top}px`,
                          width:`${CARD_W}px`,
                          height:`${CARD_H}px`,
                          zIndex: isLeaving ? 50 : 40 - pos * 10,
                          borderRadius:'24px',
                          overflow:'hidden',
                          background: isTop ? svc.bg : '#fff',
                          border:`2px solid ${isTop ? svc.color : svc.border}`,
                          boxShadow: isTop
                            ? `0 20px 60px ${svc.color}30, 0 6px 16px rgba(0,0,0,0.10)`
                            : `0 4px 12px rgba(0,0,0,${Math.max(0.03, 0.09 - pos*0.02)})`,
                          filter:`brightness(${brightness})`,
                          opacity,
                          transform: isLeaving
                            ? 'translateX(-145%) translateY(12%) rotate(-18deg) scale(0.84)'
                            : `rotate(${rotate}deg) scale(${scale})`,
                          transformOrigin: 'bottom left',
                          transition: isLeaving
                            ? 'transform 0.40s cubic-bezier(0.55,0,1,0.45), opacity 0.30s ease'
                            : 'all 0.50s cubic-bezier(0.34,1.15,0.64,1)',
                          padding:'22px',
                          display:'flex',
                          flexDirection:'column',
                          gap:'0px',
                          pointerEvents: isTop ? 'auto' : 'none',
                          willChange:'transform',
                        }}
                      >
                        {/* Top row: icon + price */}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                          <div style={{
                            width:'52px',height:'52px',borderRadius:'16px',flexShrink:0,
                            background: isTop ? svc.color : `${svc.color}20`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            boxShadow: isTop ? `0 6px 18px ${svc.color}45` : 'none',
                            transition:'all 0.3s',
                          }}>
                            <Icon style={{width:'24px',height:'24px',color:isTop?'#fff':svc.color}} />
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:'10px',color:'#9ca3af',fontWeight:500,marginBottom:'3px'}}>Starting from</div>
                            <div style={{
                              fontSize:'13px',fontWeight:800,color:svc.color,
                              background:svc.bg,padding:'4px 10px',borderRadius:'999px',
                              border:`1px solid ${svc.border}`,
                            }}>{svc.price}</div>
                          </div>
                        </div>

                        {/* Name + desc */}
                        <div style={{marginBottom:'14px'}}>
                          <div style={{fontSize:'18px',fontWeight:800,color:'#111827',lineHeight:1.2,letterSpacing:'-0.03em'}}>{svc.name}</div>
                          <div style={{fontSize:'12px',color:'#6b7280',marginTop:'6px',lineHeight:1.6}}>{svc.desc}</div>
                        </div>

                        {/* Mini stat bar */}
                        <div style={{
                          display:'flex',gap:'8px',marginBottom:'14px',
                        }}>
                          {svc.stats.map(s=>(
                            <div key={s.label} style={{
                              flex:1,background:isTop?`${svc.color}10`:'#f9fafb',
                              border:`1px solid ${svc.border}`,
                              borderRadius:'12px',padding:'8px 10px',
                            }}>
                              <div style={{fontSize:'16px',fontWeight:800,color:svc.color,lineHeight:1}}>{s.val}</div>
                              <div style={{fontSize:'10px',color:'#9ca3af',marginTop:'3px',fontWeight:500}}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Mini bar chart */}
                        <div style={{
                          display:'flex',alignItems:'flex-end',gap:'4px',height:'44px',
                          marginBottom:'14px',
                          padding:'8px 10px',
                          background:isTop?`${svc.color}08`:'#f9fafb',
                          borderRadius:'12px',
                          border:`1px solid ${svc.border}`,
                        }}>
                          {svc.visual.bars.map((h,bi)=>(
                            <div key={bi} style={{
                              flex:1,
                              height:`${h}%`,
                              borderRadius:'3px',
                              background: bi === 3 || bi === 4
                                ? svc.color
                                : `${svc.color}35`,
                              transition:`height 0.6s ease ${bi*0.05}s`,
                            }} />
                          ))}
                          <div style={{marginLeft:'auto',fontSize:'9px',color:'#9ca3af',fontWeight:600,alignSelf:'flex-start',whiteSpace:'nowrap'}}>7-day activity</div>
                        </div>

                        {/* Features */}
                        <div style={{display:'flex',flexDirection:'column',gap:'7px',marginBottom:'16px'}}>
                          {svc.features.map(f=>(
                            <div key={f} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <div style={{
                                width:'16px',height:'16px',borderRadius:'50%',flexShrink:0,
                                background:`${svc.color}20`,
                                display:'flex',alignItems:'center',justifyContent:'center',
                              }}>
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4l2 2 3-3" stroke={svc.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <span style={{fontSize:'11.5px',color:'#374151',fontWeight:500}}>{f}</span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom CTA */}
                        <div style={{
                          marginTop:'auto',
                          paddingTop:'12px',
                          borderTop:`1px solid ${svc.border}`,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'space-between',
                        }}>
                          <span style={{fontSize:'11px',color:isTop?svc.color:'#9ca3af',fontWeight:600}}>
                            {isTop ? '← viewing dashboard' : `${3 - pos} card${3-pos!==1?'s':''} behind`}
                          </span>
                          <div style={{
                            width:'28px',height:'28px',borderRadius:'50%',
                            background:isTop?svc.color:`${svc.color}30`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            transition:'all 0.3s',
                          }}>
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M2.5 5.5h6M5.5 2.5l3 3-3 3" stroke={isTop?'#fff':svc.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  </div>
                </>
              )
            })()}

            {/* ── Right: Browser frame ── */}
            <div className="flex-1 min-w-0 w-full flex flex-col items-center" data-aos="zoom-in" data-aos-delay="200">
              <div style={{width:'100%', maxWidth:'760px'}}>

                {/* Browser chrome */}
                <div style={{
                  background:'#f5f5f7',
                  border:'1px solid #d1d5db',
                  borderRadius:'12px',
                  boxShadow:'0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                  overflow:'hidden',
                }}>

                  {/* Browser toolbar */}
                  <div style={{
                    background:'linear-gradient(180deg,#f9f9fb 0%,#f0f0f5 100%)',
                    borderBottom:'1px solid #e2e2e8',
                    padding:'9px 14px',
                    display:'flex',
                    alignItems:'center',
                    gap:'10px',
                  }}>
                    {/* Traffic lights */}
                    <div style={{display:'flex',gap:'5px',flexShrink:0}}>
                      <div style={{width:'11px',height:'11px',borderRadius:'50%',background:'#ff5f57',border:'0.5px solid rgba(0,0,0,0.12)'}} />
                      <div style={{width:'11px',height:'11px',borderRadius:'50%',background:'#febc2e',border:'0.5px solid rgba(0,0,0,0.12)'}} />
                      <div style={{width:'11px',height:'11px',borderRadius:'50%',background:'#28c840',border:'0.5px solid rgba(0,0,0,0.12)'}} />
                    </div>
                    {/* Back/forward */}
                    <div style={{display:'flex',gap:'2px',flexShrink:0}}>
                      <div style={{width:'22px',height:'22px',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'default'}}>
                        <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M7 1L2 6L7 11" stroke="#b0b0b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div style={{width:'22px',height:'22px',borderRadius:'5px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'default'}}>
                        <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M1 1L6 6L1 11" stroke="#d0d0d8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                    {/* URL bar */}
                    <div style={{
                      flex:1,
                      background:'#fff',
                      border:'1px solid #e2e2e8',
                      borderRadius:'7px',
                      padding:'4px 10px',
                      display:'flex',
                      alignItems:'center',
                      gap:'6px',
                      boxShadow:'0 1px 2px rgba(0,0,0,0.04) inset',
                    }}>
                      <svg width="9" height="11" viewBox="0 0 9 11" fill="none"><path d="M4.5 1a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm-4 9.5c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#aab0bd" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      <span style={{flex:1,fontSize:'11px',color:'#6b7280',textAlign:'center',letterSpacing:'0.01em'}}>app.fillup.gh/dashboard</span>
                      <svg width="9" height="11" viewBox="0 0 10 12" fill="none"><path d="M5 1v7M2 5l3 3 3-3M1 11h8" stroke="#aab0bd" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    {/* Right icons */}
                    <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                      <div style={{width:'22px',height:'22px',borderRadius:'5px',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4H13l-3.5 2.5L11 12 7 9.5 3 12l1.5-4.5L1 5h4.5z" stroke="#b0b0b8" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                      </div>
                      <div style={{width:'27px',height:'27px',borderRadius:'50%',background:'linear-gradient(135deg,#f97316,#ea580c)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,color:'#fff',flexShrink:0}}>K</div>
                    </div>
                  </div>

                  {/* Dashboard content */}
                  <div style={{background:'#ffffff', display:'flex', height:'420px', fontSize:'11px', overflow:'hidden'}}>

                    {/* Sidebar */}
                    <div className="hidden sm:flex" style={{width:'136px',background:'#fff',borderRight:'1px solid #f1f3f5',padding:'14px 10px',flexDirection:'column',gap:'2px',flexShrink:0}}>
                      {/* Logo */}
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'14px',padding:'0 4px'}}>
                        <div style={{width:'24px',height:'24px',borderRadius:'7px',background:'linear-gradient(135deg,#f97316,#ea580c)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Fuel style={{width:'13px',height:'13px',color:'#fff'}} />
                        </div>
                        <span style={{fontWeight:800,fontSize:'12px',color:'#111827',letterSpacing:'-0.02em'}}>FillUp</span>
                      </div>
                      {/* Nav items */}
                      {[
                        {label:'Overview',    active:true},
                        {label:'Live Orders', active:false},
                        {label:'Agents',      active:false},
                        {label:'Stations',    active:false},
                        {label:'Analytics',   active:false},
                        {label:'Settings',    active:false},
                      ].map(item=>(
                        <div key={item.label} style={{
                          padding:'6px 8px',
                          borderRadius:'7px',
                          background:item.active?'#fff4ed':'transparent',
                          color:item.active?'#ea580c':'#6b7280',
                          fontWeight:item.active?600:400,
                          fontSize:'10.5px',
                          cursor:'pointer',
                          borderLeft:item.active?'2px solid #f97316':'2px solid transparent',
                        }}>{item.label}</div>
                      ))}
                      {/* Online agents */}
                      <div style={{marginTop:'auto',paddingTop:'10px',borderTop:'1px solid #f1f3f5'}}>
                        <div style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>Online Agents</div>
                        {[
                          {name:'Kofi Mensah', img:'https://i.pravatar.cc/32?img=11', km:'0.8 km'},
                          {name:'Ama Boateng', img:'https://i.pravatar.cc/32?img=47', km:'1.4 km'},
                          {name:'Yaw Asante',  img:'https://i.pravatar.cc/32?img=14', km:'2.1 km'},
                        ].map(a=>(
                          <div key={a.name} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                            <div style={{position:'relative',flexShrink:0}}>
                              <img src={a.img} alt={a.name} style={{width:'22px',height:'22px',borderRadius:'50%',objectFit:'cover',display:'block'}} />
                              <div style={{position:'absolute',bottom:0,right:0,width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',border:'1.5px solid #fff'}} />
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:'9px',fontWeight:600,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</div>
                              <div style={{fontSize:'8px',color:'#9ca3af'}}>{a.km}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Main content */}
                    <div style={{flex:1,padding:'14px 14px',display:'flex',flexDirection:'column',gap:'10px',overflow:'hidden',background:'#fafafa',minWidth:0}}>

                      {/* Top bar */}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:'13px',color:'#111827'}}>Good morning, Kwame 👋</div>
                          <div style={{fontSize:'9.5px',color:'#9ca3af',marginTop:'1px'}}>Wednesday, Feb 25 · Here's what's happening</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <div style={{background:'#f0fdf4',color:'#16a34a',fontSize:'9px',fontWeight:600,padding:'3px 8px',borderRadius:'999px',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',gap:'3px'}}>
                            <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#22c55e'}} />
                            24 Active
                          </div>
                          <img src="https://i.pravatar.cc/32?img=33" alt="user" style={{width:'28px',height:'28px',borderRadius:'50%',border:'2px solid #f97316',objectFit:'cover'}} />
                        </div>
                      </div>

                      {/* Stat cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          {lbl:'Orders Today',  val:'142',   sub:'+12% vs yesterday', color:'#3b82f6', bg:'#eff6ff', bdr:'#dbeafe'},
                          {lbl:'Revenue',        val:'₵8,420',sub:'+8% this week',     color:'#f97316', bg:'#fff7ed', bdr:'#fed7aa'},
                          {lbl:'Agents Online',  val:'38',    sub:'3 new today',        color:'#22c55e', bg:'#f0fdf4', bdr:'#bbf7d0'},
                          {lbl:'Avg. Rating',    val:'4.9★',  sub:'from 840 reviews',   color:'#f59e0b', bg:'#fffbeb', bdr:'#fde68a'},
                        ].map(s=>(
                          <div key={s.lbl} style={{background:s.bg,border:`1px solid ${s.bdr}`,borderRadius:'10px',padding:'9px 10px'}}>
                            <div style={{fontWeight:800,fontSize:'14px',color:s.color,lineHeight:1}}>{s.val}</div>
                            <div style={{fontSize:'8.5px',fontWeight:600,color:'#374151',marginTop:'3px'}}>{s.lbl}</div>
                            <div style={{fontSize:'7.5px',color:'#9ca3af',marginTop:'2px'}}>{s.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Orders table */}
                      <div style={{background:'#fff',borderRadius:'10px',border:'1px solid #f1f3f5',overflow:'hidden',flex:1,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                        <div style={{padding:'8px 12px',borderBottom:'1px solid #f9fafb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontWeight:700,fontSize:'10.5px',color:'#111827'}}>Recent Orders</span>
                          <span style={{fontSize:'9px',color:'#f97316',fontWeight:600,cursor:'pointer'}}>View all →</span>
                        </div>
                        {/* Table header */}
                        <div className="grid grid-cols-[2fr_2fr] md:grid-cols-[2fr_2fr_1.2fr_1fr]" style={{gap:'0',padding:'5px 12px',background:'#f9fafb',borderBottom:'1px solid #f1f3f5'}}>
                          <div style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.4px'}}>Customer</div>
                          <div style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.4px'}}>Service &amp; Location</div>
                          <div className="hidden md:block" style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.4px'}}>Agent</div>
                          <div className="hidden md:block" style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.4px'}}>Status</div>
                        </div>
                        {[
                          {name:'Kwame Mensah',  img:'https://i.pravatar.cc/32?img=3',  svc:'Fuel · 20L Diesel',  loc:'Accra Central',   agent:'Kofi M.', agentImg:'https://i.pravatar.cc/32?img=11', st:'En Route',  sc:'#f97316'},
                          {name:'Aba Sarpong',   img:'https://i.pravatar.cc/32?img=47', svc:'Fuel · 15L Petrol',  loc:'East Legon',      agent:'Ama B.',  agentImg:'https://i.pravatar.cc/32?img=47', st:'Delivered', sc:'#16a34a'},
                          {name:'Daniel Asare',  img:'https://i.pravatar.cc/32?img=15', svc:'Mechanic · Brakes',  loc:'Tema Comm. 1',    agent:'Yaw A.',  agentImg:'https://i.pravatar.cc/32?img=14', st:'Pending',   sc:'#6b7280'},
                          {name:'Nana Owusu',    img:'https://i.pravatar.cc/32?img=25', svc:'Battery Jump-Start', loc:'Osu Oxford St.',  agent:'Eric K.', agentImg:'https://i.pravatar.cc/32?img=8',  st:'Confirmed', sc:'#3b82f6'},
                        ].map((o,i,arr)=>(
                          <div key={o.name} className="grid grid-cols-[2fr_2fr] md:grid-cols-[2fr_2fr_1.2fr_1fr]" style={{gap:'0',padding:'6px 12px',borderBottom:i<arr.length-1?'1px solid #f9fafb':'none',alignItems:'center'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                              <img src={o.img} alt={o.name} style={{width:'24px',height:'24px',borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'1.5px solid #f1f3f5'}} />
                              <span style={{fontSize:'9.5px',fontWeight:600,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.name}</span>
                            </div>
                            <div>
                              <div style={{fontSize:'9.5px',fontWeight:500,color:'#374151'}}>{o.svc}</div>
                              <div style={{fontSize:'8px',color:'#9ca3af',marginTop:'1px',display:'flex',alignItems:'center',gap:'3px'}}>
                                <MapPin style={{width:'7px',height:'7px',flexShrink:0}} />{o.loc}
                              </div>
                            </div>
                            <div className="hidden md:flex" style={{alignItems:'center',gap:'5px'}}>
                              <img src={o.agentImg} alt={o.agent} style={{width:'20px',height:'20px',borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
                              <span style={{fontSize:'9px',color:'#374151',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.agent}</span>
                            </div>
                            <div className="hidden md:block">
                              <span style={{fontSize:'8.5px',fontWeight:600,color:o.sc,background:o.sc+'14',padding:'2px 8px',borderRadius:'999px',border:`1px solid ${o.sc}25`,whiteSpace:'nowrap'}}>{o.st}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Right panel */}
                    <div className="hidden md:flex" style={{width:'106px',borderLeft:'1px solid #f1f3f5',padding:'14px 10px',flexDirection:'column',gap:'10px',flexShrink:0,background:'#fff'}}>
                      <div style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.5px'}}>Top Stations</div>
                      {[
                        {name:'Shell East Legon', img:'https://i.pravatar.cc/32?img=60', orders:48},
                        {name:'Total Accra Mall',  img:'https://i.pravatar.cc/32?img=61', orders:34},
                        {name:'Goil Tema',          img:'https://i.pravatar.cc/32?img=62', orders:27},
                      ].map((s,i)=>(
                        <div key={s.name} style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                            <img src={s.img} alt={s.name} style={{width:'20px',height:'20px',borderRadius:'6px',objectFit:'cover',flexShrink:0}} />
                            <div style={{fontSize:'8.5px',fontWeight:600,color:'#374151',flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                            <div style={{height:'3.5px',flex:1,background:'#f1f3f5',borderRadius:'2px',overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${100*(s.orders/48)}%`,background:'linear-gradient(90deg,#f97316,#fb923c)',borderRadius:'2px'}} />
                            </div>
                            <span style={{fontSize:'7.5px',color:'#9ca3af',flexShrink:0}}>{s.orders}</span>
                          </div>
                        </div>
                      ))}

                      <div style={{height:'1px',background:'#f1f3f5',margin:'2px 0'}} />

                      <div style={{fontSize:'8px',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.5px'}}>Quick Stats</div>
                      {[
                        {lbl:'Avg. ETA',   val:'7 min'},
                        {lbl:'Completed',  val:'138/142'},
                        {lbl:'Cancelled',  val:'4'},
                        {lbl:'NPS Score',  val:'78'},
                      ].map(m=>(
                        <div key={m.lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:'8.5px',color:'#6b7280'}}>{m.lbl}</span>
                          <span style={{fontSize:'9px',fontWeight:700,color:'#111827'}}>{m.val}</span>
                        </div>
                      ))}

                      <div style={{marginTop:'auto',background:'linear-gradient(135deg,#fff7ed,#ffedd5)',borderRadius:'9px',padding:'9px',border:'1px solid #fed7aa',textAlign:'center'}}>
                        <div style={{fontSize:'15px',fontWeight:900,color:'#ea580c',lineHeight:1}}>₵8,420</div>
                        <div style={{fontSize:'7.5px',color:'#92400e',marginTop:'2px',fontWeight:500}}>Today's Revenue</div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>{/* end main layout */}
        </div>
      </section>

      {/* User Types */}
      <section className="py-20 bg-gradient-to-r from-gray-50 to-blue-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="text-center mb-16"
            data-aos="fade-up"
          >
            <div className="inline-flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full mb-4">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Join Our Network</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Join Our Platform</h2>
            <p className="text-xl text-gray-600">
              Multiple ways to be part of Ghana's automotive services revolution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div data-aos="fade-right" data-aos-delay="0">
              <Card hover className="group border-2 border-transparent hover:border-blue-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Smartphone className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Customers</h3>
                    <p className="text-gray-600 mb-6">
                      Request fuel delivery and mechanic services on-demand
                    </p>
                    <Link to="/register">
                      <Button className="w-full group-hover:scale-105 transition-transform duration-300">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-up" data-aos-delay="100">
              <Card hover className="group border-2 border-transparent hover:border-orange-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Service Providers</h3>
                    <p className="text-gray-600 mb-6">
                      Become a fuel delivery agent or mobile mechanic
                    </p>
                    <Link to="/agent/register">
                      <Button variant="secondary" className="w-full group-hover:scale-105 transition-transform duration-300">
                        Join as Agent
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-up" data-aos-delay="200">
              <Card hover className="group border-2 border-transparent hover:border-green-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Fuel Stations</h3>
                    <p className="text-gray-600 mb-6">
                      Partner with us to supply fuel for delivery services
                    </p>
                    <Link to="/station/register">
                      <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-500 hover:text-white group-hover:scale-105 transition-all duration-300">
                        Partner With Us
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-left" data-aos-delay="300">
              <Card hover className="group border-2 border-transparent hover:border-purple-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
                    <p className="text-gray-600 mb-6">
                      Fleet management and corporate fuel solutions
                    </p>
                    <Link to="/business">
                      <Button variant="outline" className="w-full border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white group-hover:scale-105 transition-all duration-300">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="text-center mb-16"
            data-aos="fade-up"
          >
            <div className="inline-flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full mb-4">
              <Star className="h-4 w-4 text-yellow-600 fill-current" />
              <span className="text-sm font-medium text-yellow-600">Customer Reviews</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">
              Trusted by thousands of Ghanaians across the country
            </p>
          </div>

          <div className="w-full">
            <TestimonialsSection />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 relative z-20 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #f8fafb 0%, #f0f4f8 50%, #fef8f0 100%)',
      }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{position:'absolute', top:'-50px', right:'-100px', width:'400px', height:'400px', background:'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)', borderRadius:'50%'}} />
          <div style={{position:'absolute', bottom:'-50px', left:'-100px', width:'350px', height:'350px', background:'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', borderRadius:'50%'}} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Section Header */}
          <div className="text-center mb-20" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-orange-50 px-4 py-2 rounded-full mb-6 border border-orange-200">
              <MessageSquare className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-600">Get In Touch</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 900,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
            }}>
              We're Here to Help
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Got a question? Our support team is ready to assist you 24/7. Choose your preferred way to reach us.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Contact Methods */}
            <div className="space-y-6">
              {[
                {
                  icon: Phone,
                  title: 'Call Us',
                  desc: 'Speak directly with our support team',
                  value: '+233 50 123 4567',
                  color: 'from-blue-600 to-blue-500',
                  bgColor: 'from-blue-50 to-blue-100',
                  delay: '0'
                },
                {
                  icon: Mail,
                  title: 'Email Us',
                  desc: 'Send us your questions anytime',
                  value: 'support@fillup.gh',
                  color: 'from-orange-600 to-orange-500',
                  bgColor: 'from-orange-50 to-orange-100',
                  delay: '100'
                },
                {
                  icon: MessageSquare,
                  title: 'Live Chat',
                  desc: 'Chat with us in real-time',
                  value: 'Available 24/7 in app',
                  color: 'from-green-600 to-green-500',
                  bgColor: 'from-green-50 to-green-100',
                  delay: '200'
                },
              ].map((method) => {
                const Icon = method.icon
                return (
                  <div
                    key={method.title}
                    className="group"
                    data-aos="fade-right"
                    data-aos-delay={method.delay}
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 p-6 hover:shadow-lg hover:shadow-gray-200/40">
                      {/* Gradient background on hover */}
                      <div className={`absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br ${method.bgColor} opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full blur-3xl pointer-events-none`} />

                      <div className="relative flex items-start gap-5">
                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{method.title}</h3>
                          <p className="text-sm text-gray-500 mb-3">{method.desc}</p>
                          <p className="text-base font-semibold text-transparent bg-gradient-to-r bg-clip-text" style={{
                            backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                            '--tw-gradient-stops': `var(--tw-gradient-from), var(--tw-gradient-to)`,
                            '--tw-gradient-from': method.color.split(' ')[1].replace('to-', ''),
                          }}>
                            <span style={{color: method.color.includes('blue') ? '#1e40af' : method.color.includes('orange') ? '#c2410c' : '#15803d'}}>
                              {method.value}
                            </span>
                          </p>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-gray-900 transition-all duration-300 transform group-hover:translate-x-1 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Response Time Info */}
              <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200" data-aos="fade-up" data-aos-delay="300">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Quick Response Time</p>
                    <p className="text-xs text-yellow-700 mt-1">We typically respond within 30 minutes during business hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div
              className="relative"
              data-aos="fade-left"
            >
              {/* Form Card */}
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-2xl">
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{padding: '2px'}} />

                <div className="relative bg-white rounded-3xl p-8 sm:p-10">
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Send us a message</h3>
                  <p className="text-gray-600 mb-8">We'd love to hear from you. Drop us a line!</p>

                  <form className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-900 mb-2.5">First Name</label>
                        <input
                          type="text"
                          placeholder="Enter your first name"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-900 mb-2.5">Last Name</label>
                        <input
                          type="text"
                          placeholder="Enter your last name"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-900 mb-2.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-900 mb-2.5">Subject</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                      >
                        <option>General Inquiry</option>
                        <option>Technical Support</option>
                        <option>Business Partnership</option>
                        <option>Report an Issue</option>
                      </select>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-900 mb-2.5">Message</label>
                      <textarea
                        rows={4}
                        placeholder="Tell us what's on your mind..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all duration-200 resize-none group-hover:border-gray-300"
                      />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30 transform hover:scale-[1.02] active:scale-95">
                      Send Message
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>

              {/* Floating stats */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white rounded-2xl p-5 shadow-lg text-center border border-gray-100">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">24/7</div>
                  <div className="text-xs text-gray-600 mt-1">Round the clock support</div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-lg text-center border border-gray-100">
                  <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">30min</div>
                  <div className="text-xs text-gray-600 mt-1">Avg response time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white relative overflow-hidden z-20">
        <div className="absolute inset-0 bg-black opacity-20 z-0"></div>
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse delay-1000"></div>
        
        <div 
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          data-aos="zoom-in"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who never worry about fuel or car troubles again.
            Download the app or sign up online today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div data-aos="zoom-in" data-aos-delay="100">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Start Using FillUp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div data-aos="zoom-in" data-aos-delay="200">
              <Link to="/agent/register">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Become a Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}

      </div>
    </>
  )
}
